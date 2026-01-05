# AI Jonbin Movie Maker - デプロイ修正履歴

## 概要
このドキュメントは、AI Jonbin Movie MakerをVercelにデプロイする際に発生した問題と、その解決方法を記録したものです。

---

## 修正履歴

### 1. UI/UX改善 - ダークモード対応

**日時**: 2026-01-06

**問題**:
- デザインがシンプルすぎる
- 文字と背景色が同じで見えない箇所が多い
- 入力ボックスの背景が白色で見にくい

**解決策**:
- `app/globals.css`: ダークモードカラーパレットに変更
- `app/components/ui/input.tsx`: 半透明の暗い背景を適用
- `app/components/ui/button.tsx`: グラデーション背景と影を追加

**変更ファイル**:
- `app/globals.css`
- `app/components/ui/input.tsx`
- `app/components/ui/button.tsx`
- `app/components/ui/textarea.tsx`
- `app/components/ui/label.tsx`

---

### 2. レイアウト改善 - 2カラムレイアウト

**日時**: 2026-01-06

**問題**:
- 縦スクロールばかりで見にくい
- 設定と結果が混在している

**解決策**:
- `app/page.tsx`: 2カラムグリッドレイアウトに変更
  - 左カラム: 入力フォーム（sticky）
  - 右カラム: シナリオプレビュー、進行状況、完了画面

**変更ファイル**:
- `app/page.tsx`
- `app/components/scenario-editor.tsx`

---

### 3. タイポグラフィ改善 - 複数フォント使用

**日時**: 2026-01-06

**問題**:
- フォントが全て同じでデザイン性が低い

**解決策**:
- 4種類のGoogle Fontsを導入:
  - Inter (sans): 本文
  - Space Grotesk (display): メインタイトル
  - Outfit (heading): セクション見出し
  - JetBrains Mono (mono): コード・プロンプト

**変更ファイル**:
- `app/layout.tsx`
- `tailwind.config.ts`

---

### 4. ファイルサイズ制限エラー (413)

**日時**: 2026-01-06

**問題**:
```
Error: 413 Payload Too Large
```

**原因**:
- Vercelのbody size制限（デフォルト4.5MB）を超過

**解決策**:
1. `next.config.ts`: bodySizeLimitを50mbに増加
2. `app/api/video/generate/route.ts`: runtime/maxDuration設定追加
3. `app/components/video-form.tsx`:
   - ファイルサイズ制限を2MBに削減
   - `browser-image-compression`で自動圧縮

**変更ファイル**:
- `next.config.ts`
- `app/api/video/generate/route.ts`
- `app/components/video-form.tsx`
- `package.json` (browser-image-compression追加)

---

### 5. Next.js 15 動的ルート - params非同期化

**日時**: 2026-01-06

**問題**:
```
TypeError: Cannot read properties of undefined
```

**原因**:
- Next.js 15から動的ルートの`params`がPromiseに変更された

**解決策**:
```typescript
// 修正前
{ params }: { params: { jobId: string } }
const { jobId } = params;

// 修正後
{ params }: { params: Promise<{ jobId: string }> }
const { jobId } = await params;
```

**変更ファイル**:
- `app/api/video/status/[jobId]/route.ts`
- `app/api/video/download/[jobId]/route.ts`

---

### 6. サーバーレス環境でのジョブ状態管理

**日時**: 2026-01-06

**問題**:
```
404 (Not Found) - Job not found
```

**原因**:
- Vercelのサーバーレス関数は独立しており、メモリやファイルシステムを共有しない
- `/tmp`ディレクトリも関数ごとに独立

**解決策**:
- **Upstash Redis**を導入してジョブ状態を永続化
- `jobManager`をメモリベースからRedisベースに変更

**追加パッケージ**:
```bash
npm install @upstash/redis
```

**変更ファイル**:
- `src/lib/redis-client.ts` (新規作成)
- `src/lib/video-job-manager.ts` (全面書き換え)
- `.env.example` (Redis環境変数追加)

**環境変数**:
```bash
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

---

### 7. Redis自動デシリアライゼーション問題

**日時**: 2026-01-06

**問題**:
```
SyntaxError: "[object Object]" is not valid JSON
```

**原因**:
- Upstash Redisクライアントの自動デシリアライゼーション機能が、JSON文字列を`[object Object]`に変換

**解決策**:
```typescript
redis = new Redis({
  url,
  token,
  automaticDeserialization: false, // 追加
});
```

**変更ファイル**:
- `src/lib/redis-client.ts`

---

### 8. 読み取り専用ディレクトリエラー

**日時**: 2026-01-06

**問題**:
```
ENOENT: no such file or directory, mkdir '/var/task/output/...'
```

**原因**:
- VideoAgentが`process.cwd()/output`（`/var/task/output`）に書き込もうとしたが、Vercelでは読み取り専用

**解決策**:
- `outputDir`オプションが渡された場合は上書きしない
```typescript
// 修正前: 常に上書き
this.outputDir = path.join(baseOutputDir, `${timestamp}_${sanitizedTopic}`);

// 修正後: オプションがない場合のみ生成
if (!this.outputDir) {
  this.outputDir = path.join(baseOutputDir, `${timestamp}_${sanitizedTopic}`);
}
```

**変更ファイル**:
- `src/agents/video-agent.ts`

---

### 9. FFmpeg未インストール問題

**日時**: 2026-01-06

**問題**:
- 25%で進行が止まる
- 動画生成処理がタイムアウト/クラッシュ

**原因**:
- Vercelのサーバーレス環境にはffmpegがインストールされていない
- VideoAgentはffmpegを使用するが、実行ファイルが見つからない

**解決策**:
1. `ffmpeg-static`パッケージをインストール
2. fluent-ffmpegにffmpegバイナリのパスを設定

```bash
npm install ffmpeg-static
```

```typescript
// src/agents/video-agent.ts
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

// Configure ffmpeg to use the static binary
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}
```

**変更ファイル**:
- `src/agents/video-agent.ts`
- `package.json`

**注意**:
- `@ffmpeg-installer/ffmpeg`は使用不可（Next.js/Turbopackと非互換）
- `ffmpeg-static`を使用すること

---

### 10. SumoTextNormalizerのハング問題 ⚠️ **最重要**

**日時**: 2026-01-06

**問題**:
- 25%で進行が止まる（FFmpeg修正後も継続）
- 力士名確認処理が無限ハング

**原因**:
- `verifyWrestlerReadings()`が以下を実行してハング:
  1. OpenAI API呼び出し（力士名抽出）
  2. 各力士名について相撲協会サイトをスクレイピング
  3. 読み取り専用ファイルシステムへの書き込み試行
- Vercel環境では `src/data/` ディレクトリが存在しないか読み取り専用
- タイムアウトやエラーハンドリングが不足

**解決策**:

1. **VideoAgent**: 環境別タイムアウト設定
   - **ローカル環境**: 2分のタイムアウト、エラー時は処理停止（デバッグ可能）
   - **Vercel環境**: 15秒でタイムアウトしてスキップ、動画生成は継続

```typescript
// 力士名の読み仮名を事前確認
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
const timeout = isProduction ? 15000 : 120000; // 本番15秒、ローカル2分

try {
    await Promise.race([
        this.verifyWrestlerReadings(scenario),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Wrestler verification timeout')), timeout)
        )
    ]);
} catch (error: any) {
    if (isProduction) {
        // 本番環境ではスキップして続行
        console.warn('⚠️  力士名の確認をスキップ:', error.message);
    } else {
        // ローカル環境ではエラーとして扱う
        console.error('❌ 力士名の確認に失敗しました:', error.message);
        throw error;
    }
}
```

2. **SumoTextNormalizer**: ファイルシステムエラーに対応
```typescript
constructor() {
    // ファイルが存在しない場合は空の辞書で初期化
    try {
        const dictionaryData = fs.readFileSync(dictionaryPath, 'utf-8');
        this.dictionary = JSON.parse(dictionaryData) as SumoDictionary;
    } catch (e) {
        console.warn('⚠️  辞書ファイルの読み込みに失敗、空の辞書で初期化:', e);
        this.dictionary = { terms: {}, techniques: {}, organizations: {} };
    }

    // 力士名キャッシュを/tmpに配置（Vercelでも書き込み可能）
    this.cachePath = process.env.VERCEL
        ? '/tmp/wrestler-cache.json'
        : path.join(projectRoot, 'src/data/wrestler-cache.json');
}
```

**変更ファイル**:
- `src/agents/video-agent.ts`
- `src/agents/sumo-text-normalizer.ts`

**効果**:
- **ローカル**: 相撲協会サイトから正確な力士名を取得（最大2分）
- **Vercel**: 15秒でタイムアウトしてスキップ、動画生成は継続
- Vercel環境でのファイルシステムエラーを回避
- 環境に応じた適切な動作を実現

---

## デバッグエンドポイント

トラブルシューティング用に以下のエンドポイントを追加：

### `/api/debug/redis`
Redis接続テスト

**レスポンス例**:
```json
{
  "status": "success",
  "message": "Redis connection working",
  "testValue": "ok"
}
```

### `/api/debug/job/[jobId]`
特定ジョブの詳細情報

**レスポンス例**:
```json
{
  "jobId": "1767637601799-vf5tp6n",
  "status": "processing",
  "currentStep": "scenario",
  "currentProgress": 25,
  "currentMessage": "Using pre-generated scenario"
}
```

### `/api/debug/jobs`
全ジョブのリスト（作成日時降順）

**レスポンス例**:
```json
{
  "total": 5,
  "jobs": [...]
}
```

---

## Vercel設定要件

### 必須環境変数

```bash
# OpenAI (シナリオ生成)
OPENAI_API_KEY=sk-proj-...

# Google AI (画像生成)
GOOGLE_API_KEY=AIza...

# ElevenLabs (音声生成)
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=your_voice_id

# Upstash Redis (ジョブ管理) ★必須
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### プラン要件

- **最低プラン**: Vercel Pro ($20/月)
  - Hobbyプランは10秒タイムアウトのため動画生成不可
  - `maxDuration: 800`（13分）を使用するにはPro以上が必要

---

## アーキテクチャ

### ジョブフロー

```
1. POST /api/video/generate
   ↓ jobIdを生成、Redisに保存
   ↓ generateVideo()をバックグラウンド実行

2. VideoAgent.run()
   ↓ 各ステップで progress callback 実行
   ↓ jobManager.updateJob() → Redis更新

3. GET /api/video/status/[jobId] (ポーリング)
   ↓ Redisからジョブ状態取得
   ↓ ProgressTrackerに返却
```

### ファイル保存場所

- **Vercel環境**: `/tmp/jobs/${jobId}/`
  - 一時ファイル（画像、音声、動画）
  - 1時間後に自動削除

---

## 既知の制限事項

1. **実行時間**: 最大13分（Vercel Pro maxDuration）
2. **ファイルサイズ**: 画像・BGMは各2MB以下
3. **同時実行**: 複数ジョブの並列実行は可能だが、リソース制限に注意
4. **永続化**: 動画ファイルは1時間で削除される（ダウンロード必須）

---

## トラブルシューティング

### 25%で止まる場合

1. `/api/debug/job/[jobId]`でジョブ状態確認
2. Vercelログでエラー確認: `npx vercel logs [URL]`
3. ffmpeg-staticが正しくインストールされているか確認
4. Redisに接続できているか確認: `/api/debug/redis`

### 404エラー

1. Redisが正しく設定されているか確認
2. 環境変数がVercelに設定されているか確認
3. jobIdが正しいか確認

### タイムアウト

1. Vercelプランを確認（Pro以上必要）
2. シナリオのシーン数を減らす（推奨: 3-5シーン）
3. 画像生成にGoogle AI、音声生成にVoiceVoxを使用（無料で高速）

---

## 参考リンク

- [Next.js 15 Breaking Changes](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Vercel Limits](https://vercel.com/docs/limits/overview)
- [Upstash Redis](https://upstash.com/)
- [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)

---

## 更新履歴

- 2026-01-06 (v2): SumoTextNormalizerハング問題を修正（修正#10）
- 2026-01-06 (v1): 初版作成（全9件の修正を記録）
