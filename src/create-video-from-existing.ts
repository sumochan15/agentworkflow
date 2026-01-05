import { VideoAgent } from './agents/video-agent.js';
import fs from 'fs';
import path from 'path';

const scenario = {
  "title": "大相撲特報！ トップ力士の意気込み＆稽古風景",
  "scenes": [
    {
      "text": "新年最初の熱戦が近づく中、トップ力士が魅せる緊張感あふれる稽古風景に迫る！",
      "imagePrompt": "Sumo ring filled with intensity and focus, capturing the essence of pre-tournament preparations"
    },
    {
      "text": "横綱と新大関、それから大関との17番。12勝5敗の気迫あふれる結果に！",
      "imagePrompt": "Two sumo wrestlers at the peak of their clash, illustrating the fierce competition"
    },
    {
      "text": "「動きを確かめ、試しながら。いい感じの稽古ができた」とトップ力士。左膝のテーピングも気にせず。",
      "imagePrompt": "Close-up of a sumo wrestler's focused gaze, with subtle details indicating intense preparation"
    },
    {
      "text": "昨年のスターが見せる速い昇進。新大関との勝負が、さらなる成長を約束。",
      "imagePrompt": "Illustration of a sumo wrestler's rise, symbolized by dynamic, ascending visuals"
    },
    {
      "text": "「6場所全てで力を出し切る。自分らしい相撲を」今年の抱負も力強い。",
      "imagePrompt": "Sumo wrestler standing tall, embodying determination and resolve amidst the sumo ring"
    }
  ]
};

async function main() {
    const agent = new VideoAgent();
    await agent.init(scenario.title);

    // NOTE: このスクリプトは既存の画像を使用します
    // 画像が保存されているディレクトリを指定してください
    const existingImageDir = process.argv[2] || path.join(process.cwd(), 'output');

    console.log(`📁 既存画像ディレクトリ: ${existingImageDir}`);

    // Use existing images from the specified directory
    const imagePaths = [
        path.join(existingImageDir, 'scene_0.png'),
        path.join(existingImageDir, 'scene_1.png'),
        path.join(existingImageDir, 'scene_2.png'),
        path.join(existingImageDir, 'scene_3.png'),
        path.join(existingImageDir, 'scene_4.png'),
    ];

    // Verify images exist
    for (const imgPath of imagePaths) {
        if (!fs.existsSync(imgPath)) {
            throw new Error(`画像が見つかりません: ${imgPath}\n使用方法: node create-video-from-existing.js <既存画像ディレクトリ>`);
        }
    }

    console.log('✅ 既存の画像を使用します');

    // Generate audio
    const audioPaths = await agent.generateAudio(scenario);

    // Assemble video
    const videoPath = await agent.assembleVideoSimple(imagePaths, audioPaths);

    console.log(`✅ 動画の生成に成功しました: ${videoPath}`);
}

main().catch(console.error);
