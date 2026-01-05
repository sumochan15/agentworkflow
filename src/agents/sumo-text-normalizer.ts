import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SumoDictionary {
    terms: Record<string, string>;
    techniques: Record<string, string>;
    organizations: Record<string, string>;
}

interface WrestlerReading {
    [kanji: string]: string;
}

export class SumoTextNormalizer {
    private dictionary: SumoDictionary;
    private wrestlerCache: WrestlerReading;
    private cachePath: string;
    private openai: OpenAI;

    constructor(apiKey?: string) {
        // srcディレクトリから読み込む（distディレクトリにはJSONがコピーされないため）
        const projectRoot = path.join(__dirname, '../..');
        const dictionaryPath = path.join(projectRoot, 'src/data/sumo-dictionary.json');

        // ファイルが存在しない場合は空の辞書で初期化（Vercel環境対策）
        try {
            const dictionaryData = fs.readFileSync(dictionaryPath, 'utf-8');
            this.dictionary = JSON.parse(dictionaryData) as SumoDictionary;
        } catch (e) {
            console.warn('⚠️  辞書ファイルの読み込みに失敗、空の辞書で初期化:', e instanceof Error ? e.message : e);
            this.dictionary = { terms: {}, techniques: {}, organizations: {} };
        }

        // 力士名キャッシュの初期化（/tmpに配置してVercelでも書き込み可能に）
        this.cachePath = process.env.VERCEL
            ? '/tmp/wrestler-cache.json'
            : path.join(projectRoot, 'src/data/wrestler-cache.json');
        this.wrestlerCache = this.loadCache();

        // OpenAI クライアント初期化（渡されたAPIキーを優先、なければ環境変数）
        this.openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    }

    /**
     * 力士名キャッシュをロード
     */
    private loadCache(): WrestlerReading {
        try {
            if (fs.existsSync(this.cachePath)) {
                const cacheData = fs.readFileSync(this.cachePath, 'utf-8');
                return JSON.parse(cacheData);
            }
        } catch (e) {
            console.warn('力士名キャッシュの読み込みに失敗しました:', e);
        }
        return {};
    }

    /**
     * 力士名キャッシュを保存
     */
    private saveCache(): void {
        try {
            fs.writeFileSync(this.cachePath, JSON.stringify(this.wrestlerCache, null, 2), 'utf-8');
        } catch (e) {
            console.warn('力士名キャッシュの保存に失敗しました:', e);
        }
    }

    /**
     * 日本相撲協会の公式サイトから力士名を検索してふりがなを取得
     */
    private async searchWrestlerOnSumoOrJp(wrestlerName: string): Promise<string | null> {
        try {
            // 相撲協会のサイトで力士を検索
            // URL パターン: https://sumo.or.jp/ResultRikishiData/search
            // パラメータは複数のパターンが考えられるため、順番に試す

            const searchPatterns = [
                `https://sumo.or.jp/ResultRikishiData/search?shikona=${encodeURIComponent(wrestlerName)}`,
                `https://sumo.or.jp/ResultRikishiData/search?q=${encodeURIComponent(wrestlerName)}`,
                `https://sumo.or.jp/ResultRikishiData/search?name=${encodeURIComponent(wrestlerName)}`,
            ];

            for (const searchUrl of searchPatterns) {
                try {
                    const response = await axios.get(searchUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        },
                        timeout: 10000,
                    });

                    const $ = cheerio.load(response.data);

                    // ふりがなを抽出
                    // 複数のパターンを試す
                    const patterns = [
                        '.furigana',
                        '.shikona-kana',
                        '.rikishi-kana',
                        'ruby rt',
                        '[class*="kana"]',
                        '[class*="furigana"]',
                    ];

                    for (const pattern of patterns) {
                        const furigana = $(pattern).first().text().trim();
                        if (furigana && furigana.length > 0) {
                            console.log(`  ✓ 相撲協会サイトから取得: ${wrestlerName} → ${furigana}`);
                            return furigana;
                        }
                    }

                    // ページタイトルやメタデータからも試す
                    const title = $('title').text();
                    const match = title.match(/（(.+?)）/);
                    if (match && match[1]) {
                        console.log(`  ✓ 相撲協会サイト(タイトル)から取得: ${wrestlerName} → ${match[1]}`);
                        return match[1];
                    }

                } catch (e) {
                    // このパターンでは見つからなかったので、次のパターンを試す
                    continue;
                }
            }

            return null;
        } catch (e) {
            console.warn(`  ! 相撲協会サイトからの取得に失敗: ${wrestlerName}`, e instanceof Error ? e.message : e);
            return null;
        }
    }

    /**
     * OpenAI APIを使用してテキストから力士名と読み仮名を抽出
     * より正確な読み仮名を取得するために詳細なプロンプトを使用
     */
    private async extractWrestlerReadings(text: string): Promise<WrestlerReading> {
        try {
            const prompt = `あなたは大相撲の専門家です。以下のテキストから大相撲の力士名、親方名、理事長名などを全て抽出し、正確な読み仮名（ひらがな）を付けてJSON形式で返してください。

**重要なルール**:
1. **番付と力士名を分離する**: 「横綱大の里」→「大の里」のように、番付（横綱、大関など）を除いた力士名のみを抽出してください
2. **力士名のみを抽出**: 「横綱」「大関」「関脇」などの番付は含めず、力士の四股名のみを抽出してください
3. 読み仮名は実際の大相撲で使われている正確な読み方を使用してください

テキスト: ${text}

出力形式:
{
  "力士名/親方名（漢字のみ、番付なし）": "読み仮名（ひらがな）"
}

例（正しい）:
{
  "豊昇龍": "ほうしょうりゅう",
  "安青錦": "あおにしき",
  "琴桜": "ことざくら",
  "大の里": "おおのさと",
  "八角": "はっかく",
  "北勝海": "ほくとうみ"
}

例（間違い - 番付を含めてはいけません）:
{
  "横綱大の里": "よこづなおおのさと",  ❌ 番付を含めている
  "大関安青錦": "おおぜきあおにしき"   ❌ 番付を含めている
}

注意:
- 力士の四股名は特殊な読み方をすることが多いので注意してください
- 「安青錦」は「あおにしき」と読みます（「あんせいきん」や「あせいきん」ではありません）
- 「大の里」は「おおのさと」と読みます（「だいのさと」ではありません）
- 理事長や親方の名前も含めてください
- **番付（横綱、大関、関脇など）は絶対に含めないでください**
- 力士名が見つからない場合は空のオブジェクト {} を返してください`;

            const completion = await this.openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-4o",  // より正確なモデルを使用
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) return {};

            const aiExtractedReadings = JSON.parse(content) as WrestlerReading;
            const finalReadings: WrestlerReading = {};

            // 各力士名について、相撲協会のサイトで正確なふりがなを取得
            for (const [kanji, aiReading] of Object.entries(aiExtractedReadings)) {
                // まずキャッシュを確認
                if (this.wrestlerCache[kanji]) {
                    finalReadings[kanji] = this.wrestlerCache[kanji];
                    continue;
                }

                // 相撲協会のサイトから検索
                console.log(`🔍 相撲協会サイトで検索中: ${kanji}`);
                const officialReading = await this.searchWrestlerOnSumoOrJp(kanji);

                if (officialReading) {
                    // 公式サイトから取得できた場合
                    finalReadings[kanji] = officialReading;
                    this.wrestlerCache[kanji] = officialReading;
                    console.log(`  ✓ 新しい力士名を追加: ${kanji} → ${officialReading} (公式)`);
                } else {
                    // 公式サイトから取得できなかった場合はAIの結果を使用
                    finalReadings[kanji] = aiReading;
                    this.wrestlerCache[kanji] = aiReading;
                    console.log(`  ! 公式サイトで見つからず、AI結果を使用: ${kanji} → ${aiReading}`);
                }
            }

            // キャッシュを保存
            this.saveCache();

            return finalReadings;
        } catch (e) {
            console.warn('力士名の抽出に失敗しました:', e);
            return {};
        }
    }

    /**
     * 相撲関連の用語を読み仮名に変換（力士名は動的取得）
     */
    async normalize(text: string): Promise<string> {
        let normalizedText = text;

        // 1. まず力士名を動的に取得
        const dynamicWrestlers = await this.extractWrestlerReadings(text);

        // 2. すべてのエントリを結合（静的辞書 + 動的力士名 + キャッシュ）
        const allEntries = {
            ...this.dictionary.terms,
            ...this.dictionary.techniques,
            ...this.dictionary.organizations,
            ...this.wrestlerCache,
            ...dynamicWrestlers,
        };

        // 3. 長い単語から順にソート（部分一致を防ぐため）
        const sortedKeys = Object.keys(allEntries).sort((a, b) => b.length - a.length);

        // 4. 各単語を読み仮名に置換
        for (const kanji of sortedKeys) {
            const reading = allEntries[kanji];
            if (!reading) continue;

            // グローバル置換（全ての出現箇所を置換）
            const regex = new RegExp(this.escapeRegExp(kanji), 'g');
            normalizedText = normalizedText.replace(regex, reading);
        }

        // 5. 数字と単位の正規化（読み上げ精度向上）
        normalizedText = this.normalizeNumbers(normalizedText);

        return normalizedText;
    }

    /**
     * 数字と単位を読み仮名に変換
     */
    private normalizeNumbers(text: string): string {
        let result = text;

        // 勝敗の表記: 「12勝5敗」→「12しょう5はい」
        result = result.replace(/(\d+)勝/g, '$1しょう');
        result = result.replace(/(\d+)敗/g, '$1はい');

        // 番数: 「15番」→「15ばん」
        result = result.replace(/(\d+)番/g, '$1ばん');

        // 日付: 「5日」→「5にち」（1〜31日）
        result = result.replace(/([1-9]|[12][0-9]|3[01])日/g, '$1にち');

        // 年齢: 「21歳」→「21さい」
        result = result.replace(/(\d+)歳/g, '$1さい');

        // 場所: 「初場所」「春場所」などは辞書で処理済み

        // 連勝・連敗: 「4連勝」→「4れんしょう」「4連敗」→「4れんぱい」
        result = result.replace(/(\d+)連勝/g, '$1れんしょう');
        result = result.replace(/(\d+)連敗/g, '$1れんぱい');

        // 年月: 「2026年」→「2026ねん」「1月」→「1がつ」
        result = result.replace(/(\d+)年/g, '$1ねん');
        result = result.replace(/([1-9]|1[0-2])月/g, '$1がつ');

        // 時刻: 「13時46分」→「13じ46ふん」
        result = result.replace(/(\d+)時/g, '$1じ');
        result = result.replace(/(\d+)分/g, '$1ふん');

        // その他の単位
        result = result.replace(/(\d+)人/g, '$1にん');
        result = result.replace(/(\d+)回/g, '$1かい');
        result = result.replace(/(\d+)場所/g, '$1ばしょ');

        // 順位: 「1位」→「1い」
        result = result.replace(/(\d+)位/g, '$1い');

        // 括弧内の補足情報（年齢・所属など）: 「（21＝安治川）」→読みやすく
        result = result.replace(/（(\d+)＝/g, '（$1さい、');

        return result;
    }

    /**
     * 正規表現の特殊文字をエスケープ
     */
    private escapeRegExp(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 変換前後の比較をログ出力
     */
    async normalizeWithLog(text: string): Promise<string> {
        const normalized = await this.normalize(text);

        if (text !== normalized) {
            console.log(`📝 テキスト正規化:`);
            console.log(`  元のテキスト: ${text}`);
            console.log(`  正規化後: ${normalized}`);
        }

        return normalized;
    }

    /**
     * 辞書に新しいエントリを追加（実行時）
     */
    addEntry(kanji: string, reading: string, category: keyof SumoDictionary = 'terms'): void {
        this.dictionary[category][kanji] = reading;
    }

    /**
     * 力士名キャッシュに追加
     */
    addWrestler(kanji: string, reading: string): void {
        this.wrestlerCache[kanji] = reading;
        this.saveCache();
    }

    /**
     * 辞書の統計情報を取得
     */
    getDictionaryStats(): { total: number; cachedWrestlers: number; terms: number; techniques: number; organizations: number } {
        return {
            total: Object.keys(this.wrestlerCache).length +
                   Object.keys(this.dictionary.terms).length +
                   Object.keys(this.dictionary.techniques).length +
                   Object.keys(this.dictionary.organizations).length,
            cachedWrestlers: Object.keys(this.wrestlerCache).length,
            terms: Object.keys(this.dictionary.terms).length,
            techniques: Object.keys(this.dictionary.techniques).length,
            organizations: Object.keys(this.dictionary.organizations).length,
        };
    }
}

// CLIテスト
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    (async () => {
        const normalizer = new SumoTextNormalizer();
        const stats = normalizer.getDictionaryStats();

        console.log('📚 相撲辞書統計:');
        console.log(`  キャッシュされた力士名: ${stats.cachedWrestlers}件`);
        console.log(`  用語: ${stats.terms}件`);
        console.log(`  技: ${stats.techniques}件`);
        console.log(`  組織: ${stats.organizations}件`);
        console.log(`  合計: ${stats.total}件\n`);

        const testText = '横綱豊昇龍が新大関安青錦、大関琴桜と稽古総見で17番取って12勝5敗。初場所を控えた両国国技館での熱戦。';
        console.log('テストケース:');
        console.log(`元のテキスト: ${testText}`);
        console.log(`正規化後: ${await normalizer.normalize(testText)}`);
    })().catch(console.error);
}
