import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import axios from 'axios';
import dotenv from 'dotenv';

// Configure ffmpeg to use the static binary
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import FormData from 'form-data';
import { SumoTextNormalizer } from './sumo-text-normalizer';
import { ImagePromptBuilder } from './image-prompt-builder';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

interface Scene {
    text: string;
    imagePrompt: string;
}

interface Scenario {
    title: string;
    scenes: Scene[];
}

export type ProgressCallback = (event: {
    step: 'scenario' | 'images' | 'audio' | 'assembly' | 'bgm' | 'complete';
    status: 'in_progress' | 'completed' | 'error';
    progress: number; // 0-100
    message: string;
    data?: any;
}) => void;

export interface VideoAgentOptions {
    apiKeys: {
        openai: string;
        google: string;
        elevenlabs?: string;
    };
    voiceId?: string;
    provider?: 'elevenlabs' | 'voicevox';
    outputDir?: string;
    referenceImagePath?: string;
    bgmPath?: string;
    progressCallback?: ProgressCallback;
}

export class VideoAgent {
    private openai: OpenAI;
    private voicevoxUrl: string;
    private voicevoxApiKey: string;
    private googleApiKey: string;
    private elevenlabsApiKey: string;
    private elevenlabsVoiceId: string;
    private outputDir: string;
    private textNormalizer: SumoTextNormalizer;
    private provider: 'elevenlabs' | 'voicevox';
    private referenceImagePath?: string;
    private bgmPath?: string;
    private progressCallback?: ProgressCallback;

    constructor(options?: VideoAgentOptions) {
        // Backward compatibility: support both options and env vars
        const apiKeys = options?.apiKeys || {
            openai: process.env.OPENAI_API_KEY || '',
            google: process.env.GOOGLE_API_KEY || '',
            elevenlabs: process.env.ELEVENLABS_API_KEY || '',
        };

        this.openai = new OpenAI({ apiKey: apiKeys.openai });
        this.voicevoxUrl = process.env.VOICEVOX_URL || 'http://localhost:50021';
        this.voicevoxApiKey = process.env.VOICEVOX_API_KEY || '';
        this.googleApiKey = apiKeys.google;
        this.elevenlabsApiKey = apiKeys.elevenlabs || '';
        this.elevenlabsVoiceId = options?.voiceId || process.env.ELEVENLABS_VOICE_ID || '';
        this.provider = options?.provider || 'elevenlabs';
        this.outputDir = options?.outputDir || '';
        this.referenceImagePath = options?.referenceImagePath;
        this.bgmPath = options?.bgmPath;
        this.progressCallback = options?.progressCallback;
        this.textNormalizer = new SumoTextNormalizer();
    }

    /**
     * Emit progress event
     */
    private emit(
        step: 'scenario' | 'images' | 'audio' | 'assembly' | 'bgm' | 'complete',
        status: 'in_progress' | 'completed' | 'error',
        progress: number,
        message: string,
        data?: any
    ) {
        if (this.progressCallback) {
            this.progressCallback({ step, status, progress, message, data });
        }
    }

    /**
     * 動画ごとに別ディレクトリを作成
     * Format: output/YYYY-MM-DD_HH-MM-SS_topic/
     */
    async init(topic: string) {
        const timestamp = new Date().toISOString()
            .replace(/T/, '_')
            .replace(/\..+/, '')
            .replace(/:/g, '-')
            .substring(0, 19); // YYYY-MM-DD_HH-MM-SS

        // トピック名をサニタイズ（ファイル名として使えるように）
        const sanitizedTopic = topic
            .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_')
            .substring(0, 30); // 最大30文字

        // If outputDir is not already set (from constructor options), create one
        if (!this.outputDir) {
            const baseOutputDir = path.join(process.cwd(), 'output');
            this.outputDir = path.join(baseOutputDir, `${timestamp}_${sanitizedTopic}`);
        }

        if (!fs.existsSync(this.outputDir)) {
            await mkdir(this.outputDir, { recursive: true });
        }

        console.log(`📁 出力ディレクトリ: ${this.outputDir}`);
    }

    // URL or Text content fetcher
    async fetchContent(input: string): Promise<string> {
        if (input.startsWith('http')) {
            try {
                console.log(`🌐 URLから記事を取得中: ${input}`);
                const { data } = await axios.get(input);
                const $ = cheerio.load(data);
                // Basic extraction: generic selectors for news sites
                const text = $('article, main, .post-body, .article-content, body').text();
                return text.substring(0, 4000).replace(/\s+/g, ' ');
            } catch (e) {
                console.error("URLからのコンテンツ取得に失敗しました:", e);
                throw new Error("URLからのコンテンツ取得に失敗しました");
            }
        }
        return input;
    }

    async generateScenario(input: string): Promise<Scenario> {
        const context = await this.fetchContent(input);

        console.log(`📝 シナリオを作成中...`);

        // プロンプトテンプレートを外部ファイルから読み込み
        const projectRoot = path.join(__dirname, '../..');
        const promptPath = path.join(projectRoot, '.claude/agents/prompt/scenario_generation_prompt.md');
        const promptTemplate = fs.readFileSync(promptPath, 'utf-8');

        // プロンプトにニュース内容を挿入
        const prompt = `${promptTemplate}

## ニュース内容
"${context.substring(0, 2000)}..."
`;

        const completion = await this.openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4-turbo-preview",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("シナリオの生成に失敗しました");

        return JSON.parse(content) as Scenario;
    }

    async generateImages(scenario: Scenario): Promise<string[]> {
        console.log(`🎨 ${scenario.scenes.length} 枚の画像を生成中 (Nano Banana Pro - 9:16 手描き風 + キャラ参照)...`);
        const imagePaths: string[] = [];

        // レファレンス画像を読み込み
        const refImagePath = this.referenceImagePath || path.join(process.cwd(), '.claude/agents/ref_image/sumo_yohei.png');
        const refImageBuffer = fs.readFileSync(refImagePath);
        const refImageBase64 = refImageBuffer.toString('base64');

        for (let i = 0; i < scenario.scenes.length; i++) {
            const scene = scenario.scenes[i];
            if (!scene) continue;
            console.log(`  - シーン ${i + 1}: ${scene.text.substring(0, 30)}...`);

            try {
                // 手書き風プロンプトを生成
                const handDrawnPrompt = ImagePromptBuilder.buildPrompt(scene.text, i);

                // Nano Banana Pro API (Gemini 3 Pro Image Preview) with reference image
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`,
                    {
                        contents: [{
                            parts: [
                                {
                                    text: `Using the sumo character from the reference image, ${handDrawnPrompt}`
                                },
                                {
                                    inline_data: {
                                        mime_type: "image/png",
                                        data: refImageBase64
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            responseModalities: ["IMAGE"],
                            imageConfig: {
                                aspectRatio: "9:16",  // 縦型
                                imageSize: "2K"
                            }
                        }
                    },
                    {
                        headers: {
                            'x-goog-api-key': this.googleApiKey,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                // Base64画像データを抽出（camelCaseキー）
                const imageData = response.data?.candidates?.[0]?.content?.parts?.find(
                    (part: any) => part.inlineData?.mimeType?.startsWith('image/')
                );

                if (!imageData?.inlineData?.data) {
                    console.error(`    ❌ 画像データが見つかりません`);
                    throw new Error("画像データが見つかりません");
                }

                // Base64デコードして保存
                const imagePath = path.join(this.outputDir, `scene_${i}.png`);
                const buffer = Buffer.from(imageData.inlineData.data, 'base64');
                await writeFile(imagePath, buffer);
                imagePaths.push(imagePath);

                console.log(`    ✓ 生成完了 (${(buffer.length / 1024).toFixed(1)}KB)`);

            } catch (e: any) {
                console.error(`  ! Nano Banana Pro エラー:`, e.response?.data || e.message);
                throw e;
            }
        }
        return imagePaths;
    }

    /**
     * シナリオから力士名を抽出し、読み仮名を確認・表示
     */
    async verifyWrestlerReadings(scenario: Scenario): Promise<void> {
        console.log(`\n🔍 力士名の読み仮名を確認中...`);

        // シナリオの全テキストを結合
        const allText = scenario.scenes.map(s => s.text).join(' ');

        // テキストノーマライザーを使って力士名を抽出（内部でLLMを使用）
        const normalizedText = await this.textNormalizer.normalize(allText);

        // 統計情報を表示
        const stats = this.textNormalizer.getDictionaryStats();
        console.log(`📚 辞書統計: 力士名キャッシュ ${stats.cachedWrestlers}件、合計 ${stats.total}件`);

        if (allText !== normalizedText) {
            console.log(`\n✓ 読み仮名の確認完了`);
            console.log(`  元のテキスト（抜粋）: ${allText.substring(0, 100)}...`);
            console.log(`  正規化後（抜粋）: ${normalizedText.substring(0, 100)}...`);
        } else {
            console.log(`ℹ️  変換が必要な力士名が見つかりませんでした`);
        }

        console.log('');
    }

    /**
     * OpenAI Whisper APIで音声を文字起こし
     */
    async transcribeAudio(audioPath: string): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioPath));
            formData.append('model', 'whisper-1');
            formData.append('language', 'ja');

            const response = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        ...formData.getHeaders()
                    }
                }
            );

            return response.data.text;
        } catch (error: any) {
            console.error(`  ⚠️  文字起こしエラー:`, error.message);
            return ''; // エラー時は空文字列を返して処理を続行
        }
    }

    /**
     * テキスト類似度を計算（0-100%）
     */
    calculateSimilarity(text1: string, text2: string): number {
        // 句読点とスペースを除去して正規化
        const normalize = (s: string) => s.replace(/[、。\s]/g, '');
        const normalized1 = normalize(text1);
        const normalized2 = normalize(text2);

        // レーベンシュタイン距離を計算
        const len1 = normalized1.length;
        const len2 = normalized2.length;
        const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[i]![0] = i;
        for (let j = 0; j <= len2; j++) matrix[0]![j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1;
                matrix[i]![j] = Math.min(
                    matrix[i - 1]![j]! + 1,      // 削除
                    matrix[i]![j - 1]! + 1,      // 挿入
                    matrix[i - 1]![j - 1]! + cost // 置換
                );
            }
        }

        const distance = matrix[len1]![len2]!;
        const maxLen = Math.max(len1, len2);
        const similarity = maxLen === 0 ? 100 : ((maxLen - distance) / maxLen) * 100;

        return Math.round(similarity * 10) / 10; // 小数点1桁
    }

    /**
     * 音声の精度を検証
     */
    async verifyAudioAccuracy(audioPath: string, expectedText: string): Promise<{
        isAccurate: boolean;
        similarity: number;
        transcribed: string;
    }> {
        const transcribed = await this.transcribeAudio(audioPath);
        const similarity = this.calculateSimilarity(expectedText, transcribed);
        const isAccurate = similarity >= 85.0; // 85%以上で合格

        return { isAccurate, similarity, transcribed };
    }

    /**
     * 難しい単語を平仮名に変換
     */
    convertDifficultWords(text: string): string {
        const difficultWords: { [key: string]: string } = {
            '快挙': 'かいきょ',
            '毎試合': 'まいしあい',
            '稽古': 'けいこ',
            '技術': 'ぎじゅつ',
            '光り': 'ひかり',
            '展開': 'てんかい',
            '成し遂げ': 'なしとげ',
            '評価': 'ひょうか',
            '才能': 'さいのう',
            '努力': 'どりょく',
            '組み合わ': 'くみあわ',
            '結果': 'けっか',
            '活躍': 'かつやく',
            '期待': 'きたい',
            '挑戦': 'ちょうせん',
            '宣言': 'せんげん',
            '記録': 'きろく',
            '達成': 'たっせい',
            '圧倒的': 'あっとうてき',
            '発揮': 'はっき',
            '話題': 'わだい',
            '近年': 'きんねん',
            '稀有': 'けう',
            '精神力': 'せいしんりょく',
            '物語': 'ものがた',
            '関係者': 'かんけいしゃ'
        };

        let converted = text;
        for (const [kanji, hiragana] of Object.entries(difficultWords)) {
            converted = converted.replace(new RegExp(kanji, 'g'), hiragana);
        }
        return converted;
    }

    /**
     * テキスト全体を平仮名に変換（最終手段）
     */
    async convertToHiragana(text: string): Promise<string> {
        // OpenAI APIを使用して漢字を平仮名に変換
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたは日本語のテキストを平仮名に変換するアシスタントです。句読点はそのまま残してください。'
                    },
                    {
                        role: 'user',
                        content: `以下のテキストを平仮名に変換してください（句読点は残す）:\n${text}`
                    }
                ],
                temperature: 0
            });

            return response.choices[0]?.message.content || text;
        } catch (error) {
            console.error('    ⚠️  平仮名変換エラー。元のテキストを使用します。');
            return text;
        }
    }

    /**
     * 検証付き音声生成（最大3回リトライ、段階的な読み仮名調整）
     */
    async generateAudioWithVerification(text: string, sceneIndex: number, maxRetries: number = 3): Promise<string> {
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;

            // 試行回数に応じて読み仮名の強度を変更
            let normalizedText: string;
            if (attempt === 1) {
                // 1回目: 通常の正規化（力士名など）
                normalizedText = await this.textNormalizer.normalizeWithLog(text);
            } else if (attempt === 2) {
                // 2回目: 難しい単語を平仮名に
                console.log(`    📝 難しい単語を平仮名に変換...`);
                const withDifficultWords = this.convertDifficultWords(text);
                normalizedText = await this.textNormalizer.normalizeWithLog(withDifficultWords);
            } else {
                // 3回目: テキスト全体を平仮名に（最終手段）
                console.log(`    📝 テキスト全体を平仮名に変換...`);
                normalizedText = await this.convertToHiragana(text);
            }

            try {
                const elevenlabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${this.elevenlabsVoiceId}`;

                const response = await axios.post(
                    elevenlabsUrl,
                    {
                        text: normalizedText,
                        model_id: "eleven_multilingual_v2",
                        language_code: "ja",
                        voice_settings: {
                            stability: 0.55,
                            similarity_boost: 0.85,
                            style: 0.4,
                            use_speaker_boost: true
                        },
                        pronunciation_dictionary_locators: []
                    },
                    {
                        headers: {
                            'xi-api-key': this.elevenlabsApiKey,
                            'Content-Type': 'application/json'
                        },
                        responseType: 'arraybuffer'
                    }
                );

                const audioPath = path.join(this.outputDir, `scene_${sceneIndex}.mp3`);
                await writeFile(audioPath, Buffer.from(response.data));
                console.log(`    ✓ 音声生成完了 (${(response.data.byteLength / 1024).toFixed(1)}KB)`);

                // 音声検証
                console.log(`    🔍 音声を検証中...`);
                const verification = await this.verifyAudioAccuracy(audioPath, text);
                console.log(`    類似度: ${verification.similarity}%`);

                if (verification.isAccurate) {
                    console.log(`    ✅ 検証合格`);
                    return audioPath;
                } else {
                    console.log(`    ⚠️  類似度が低い（試行 ${attempt}/${maxRetries}）`);
                    console.log(`    期待: ${text.substring(0, 50)}...`);
                    console.log(`    実際: ${verification.transcribed.substring(0, 50)}...`);

                    if (attempt < maxRetries) {
                        console.log(`    🔄 読み仮名を強化して再生成...`);
                    } else {
                        console.log(`    ⚠️  最大試行回数に到達。現在の音声を使用します。`);
                        return audioPath;
                    }
                }

            } catch (ttsError: any) {
                console.error(`  ❌ ElevenLabs TTSエラー:`, ttsError.response?.data || ttsError.message);
                if (attempt >= maxRetries) throw ttsError;
            }
        }

        throw new Error(`音声生成に失敗しました（シーン ${sceneIndex}）`);
    }

    async generateAudio(scenario: Scenario): Promise<string[]> {
        console.log(`🎙️ 音声を生成中 (ElevenLabs TTS - 日本語最適化 + 自動検証)...`);
        const audioPaths: string[] = [];

        for (let i = 0; i < scenario.scenes.length; i++) {
            const scene = scenario.scenes[i];
            if (!scene) continue;

            console.log(`  - シーン ${i + 1} の音声`);

            const audioPath = await this.generateAudioWithVerification(scene.text, i);
            audioPaths.push(audioPath);
        }
        return audioPaths;
    }

    async assembleVideoSimple(imagePaths: string[], audioPaths: string[]): Promise<string> {
        console.log(`🎬 動画を結合中...`);
        const chunkPaths: string[] = [];

        for (let i = 0; i < imagePaths.length; i++) {
            const img = imagePaths[i];
            const audio = audioPaths[i];
            if (!img || !audio) continue;

            const chunkPath = path.join(this.outputDir, `chunk_${i}.mp4`);
            await new Promise<void>((resolve, reject) => {
                ffmpeg()
                    .input(img)
                    .inputOptions(['-loop', '1'])  // Loop the image to match audio duration
                    .input(audio)
                    .outputOptions(['-c:v libx264', '-c:a aac', '-shortest', '-pix_fmt yuv420p'])
                    .save(chunkPath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });
            chunkPaths.push(chunkPath);
        }

        const finalPath = path.join(this.outputDir, `sumo_news.mp4`);
        await new Promise<void>((resolve, reject) => {
            let cmd = ffmpeg();
            chunkPaths.forEach(p => cmd = cmd.input(p));
            cmd.on('end', () => resolve())
                .on('error', (err) => reject(err))
                .mergeToFile(finalPath, this.outputDir);
        });

        return finalPath;
    }

    /**
     * BGMを動画に追加（音量5%、ナレーション長に自動トリム）
     */
    async addBackgroundMusic(videoPath: string): Promise<string> {
        console.log(`🎵 BGMを追加中...`);

        const bgmPath = this.bgmPath || path.join(process.cwd(), '.claude/agents/bgm/default.mp3');

        // BGMファイルが存在しない場合はスキップ
        if (!fs.existsSync(bgmPath)) {
            console.log(`⚠️  BGMファイルが見つかりません: ${bgmPath}`);
            return videoPath;
        }

        const finalPath = path.join(this.outputDir, `sumo_news_with_bgm.mp4`);

        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(videoPath)        // 元の動画（ナレーション付き）
                .input(bgmPath)          // BGM
                .complexFilter([
                    // BGMの音量を5%に調整
                    '[1:a]volume=0.05[bgm]',
                    // ナレーションとBGMをミックス（ナレーションの長さに合わせてBGMを自動トリム）
                    '[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]'
                ])
                .outputOptions([
                    '-map 0:v',           // 元の動画のビデオストリームを使用
                    '-map [aout]',        // ミックスした音声を使用
                    '-c:v copy',          // ビデオは再エンコードせずコピー（高速）
                    '-c:a aac',           // 音声はAACでエンコード
                    '-shortest'           // 短い方（ナレーション）の長さに合わせる
                ])
                .save(finalPath)
                .on('end', () => {
                    console.log(`✅ BGM追加完了: ${finalPath}`);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`❌ BGM追加エラー:`, err);
                    reject(err);
                });
        });

        return finalPath;
    }

    async run(input: string, preGeneratedScenario?: Scenario) {
        try {
            // トピック名を決定（URLの場合は短縮、テキストの場合はそのまま）
            const topicName = input.startsWith('http')
                ? new URL(input).hostname.replace('www.', '')
                : input.substring(0, 50);

            await this.init(topicName);

            // シナリオ生成（または事前生成済みシナリオを使用）
            let scenario: Scenario;
            if (preGeneratedScenario) {
                scenario = preGeneratedScenario;
                this.emit('scenario', 'completed', 25, 'Using pre-generated scenario', scenario);
            } else {
                this.emit('scenario', 'in_progress', 5, 'Generating scenario...');
                scenario = await this.generateScenario(input);
                this.emit('scenario', 'completed', 25, 'Scenario generated', scenario);
            }

            console.log("シナリオ作成完了:", JSON.stringify(scenario, null, 2));

            // シナリオをJSONファイルとして保存
            const scenarioPath = path.join(this.outputDir, 'scenario.json');
            await writeFile(scenarioPath, JSON.stringify(scenario, null, 2), 'utf-8');
            console.log(`📄 シナリオを保存: ${scenarioPath}`);

            // 力士名の読み仮名を事前確認（タイムアウト付き）
            try {
                await Promise.race([
                    this.verifyWrestlerReadings(scenario),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Wrestler verification timeout')), 15000)
                    )
                ]);
            } catch (error: any) {
                console.warn('⚠️  力士名の確認をスキップ:', error.message);
                // 力士名の確認に失敗しても続行する（動画生成には必須ではない）
            }

            // 画像生成
            this.emit('images', 'in_progress', 30, `Generating images (0/${scenario.scenes.length})...`);
            const imagePaths = await this.generateImages(scenario);
            this.emit('images', 'completed', 50, `All images generated (${imagePaths.length})`);

            // 音声生成
            this.emit('audio', 'in_progress', 55, `Generating audio (0/${scenario.scenes.length})...`);
            const audioPaths = await this.generateAudio(scenario);
            this.emit('audio', 'completed', 75, `All audio generated (${audioPaths.length})`);

            if (imagePaths.length !== audioPaths.length) {
                throw new Error("生成されたアセットの数が一致しません");
            }

            // 動画組み立て
            this.emit('assembly', 'in_progress', 80, 'Assembling video...');
            let videoPath = await this.assembleVideoSimple(imagePaths, audioPaths);
            this.emit('assembly', 'completed', 90, 'Video assembled');
            console.log(`✅ 動画の生成に成功しました: ${videoPath}`);

            // BGMを追加
            this.emit('bgm', 'in_progress', 92, 'Adding background music...');
            videoPath = await this.addBackgroundMusic(videoPath);
            this.emit('bgm', 'completed', 95, 'Background music added');
            console.log(`✅ BGM付き動画の生成に成功しました: ${videoPath}`);

            // 完了
            this.emit('complete', 'completed', 100, 'Video generation complete', { videoPath });

            return videoPath;
        } catch (error: any) {
            this.emit('complete', 'error', 0, error.message || 'Video generation failed', { error });
            throw error;
        }
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    // Support generic input argument or --topic for backward compatibility
    let input = args.indexOf('--topic') !== -1 ? args[args.indexOf('--topic') + 1] : args[0];

    if (!input) input = "Sumo News";

    new VideoAgent().run(input).catch(console.error);
}
