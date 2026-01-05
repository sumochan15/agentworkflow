# Webサービス化デプロイ作業記録

**作業日**: 2026-01-06
**プロジェクト**: AI Jonbin Movie Maker
**作業内容**: CLI型VideoAgentのWebサービス化（Next.js 15）

---

## 📋 プロジェクト概要

### 目的
既存のCLI型動画生成ツール（VideoAgent）を、WebブラウザからアクセスできるWebサービスに変換する。

### 主要要件
- URL/テキスト入力からの動画生成
- APIキーのブラウザ管理（LocalStorage）
- レファレンス画像とBGMのアップロード機能
- シナリオのプレビューと編集機能
- リアルタイム進捗表示（SSE）
- Vercel Proへのデプロイ対応

### 技術スタック
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **Video Processing**: FFmpeg (@ffmpeg-installer/ffmpeg)
- **Progress Tracking**: Server-Sent Events (SSE)
- **Deployment**: Vercel Pro (Fluid Compute)

---

## 🎯 実施した作業（全10フェーズ）

### Phase 1: Next.js基盤構築

**実施内容**:
```bash
# Next.js 15プロジェクト初期化
npx create-next-app@latest

# Tailwind CSS + shadcn/ui セットアップ
npx shadcn-ui@latest init

# TypeScript設定更新
# tsconfig.json で jsx: "react-jsx" に変更
```

**作成ファイル**:
- `app/layout.tsx` - ルートレイアウト
- `app/page.tsx` - メインページ（4ステップフロー）
- `app/globals.css` - グローバルスタイル
- `tailwind.config.ts` - Tailwind設定
- `next.config.ts` - Next.js設定

**重要な設定**:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",  // Next.js required
    "allowJs": true,
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

---

### Phase 2: APIキー管理とストレージ

**実施内容**:
- LocalStorageヘルパー作成
- APIキー管理モーダル実装
- 入力フォームコンポーネント作成

**作成ファイル**:
- `app/lib/storage.ts` - LocalStorage操作
- `app/components/api-key-manager.tsx` - APIキー設定UI
- `app/components/video-form.tsx` - 入力フォーム

**LocalStorage設計**:
```typescript
interface StoredApiKeys {
  openai?: string;
  google?: string;
  elevenlabs?: string;
  voiceId?: string;
}

// 保存
saveApiKeys(keys: StoredApiKeys): void

// 読込
loadApiKeys(): StoredApiKeys
```

---

### Phase 3: シナリオプレビュー機能

**実施内容**:
- シナリオ生成API実装
- シナリオ編集UIコンポーネント作成
- シナリオ→動画生成フロー構築

**作成ファイル**:
- `app/api/scenario/preview/route.ts` - POST API
- `app/components/scenario-editor.tsx` - 編集UI

**API仕様**:
```typescript
// POST /api/scenario/preview
Request: {
  input: string;
  apiKeys: { openai: string };
}

Response: {
  scenario: {
    title: string;
    scenes: Array<{
      text: string;
      imagePrompt: string;
    }>;
  }
}
```

---

### Phase 4: VideoAgent改修

**実施内容**:
既存のCLI型VideoAgentをWeb対応にリファクタリング

**主要変更**:
```typescript
// BEFORE: 環境変数から取得
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// AFTER: コンストラクタで注入
export interface VideoAgentOptions {
  apiKeys: {
    openai: string;
    google: string;
    elevenlabs?: string;
  };
  progressCallback?: ProgressCallback;
  referenceImagePath?: string;
  bgmPath?: string;
  // ...
}

constructor(options: VideoAgentOptions) {
  this.openai = new OpenAI({ apiKey: options.apiKeys.openai });
  this.progressCallback = options.progressCallback;
  // ...
}
```

**進捗コールバック追加**:
```typescript
type ProgressCallback = (event: {
  step: 'scenario' | 'images' | 'audio' | 'assembly' | 'bgm' | 'complete';
  status: 'in_progress' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  data?: any;
}) => void;

// 各ステップで進捗を通知
private emit(event: Parameters<ProgressCallback>[0]) {
  this.progressCallback?.(event);
}
```

**修正ファイル**:
- `src/agents/video-agent.ts` - 主要リファクタリング
- Import文修正: `.js` 拡張子を削除（TypeScript対応）

---

### Phase 5: ジョブ管理とAPI実装

**実施内容**:
- 非同期ジョブ管理システム構築
- 動画生成API実装
- SSE進捗通知システム構築

**作成ファイル**:
```
src/lib/
├── video-job-manager.ts    # ジョブライフサイクル管理
└── progress-emitter.ts      # SSE進捗イベント送信

app/api/video/
├── generate/route.ts        # POST: 動画生成開始
├── status/[jobId]/route.ts  # GET: SSE進捗ストリーム
└── download/[jobId]/route.ts # GET: 動画ダウンロード
```

**ジョブ管理システム**:
```typescript
interface JobMetadata {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  input: string;
  provider: string;
  createdAt: Date;
  completedAt?: Date;
  outputPath?: string;
  scenario?: Scenario;
}

class VideoJobManager {
  private jobs = new Map<string, JobMetadata>();

  createJob(...): string; // UUID生成
  getJob(id: string): JobMetadata | undefined;
  updateJob(id: string, updates: Partial<JobMetadata>): void;
  cleanupJob(id: string, deleteAfterMinutes = 60): void;
}
```

**SSEストリーム実装**:
```typescript
toSSEStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const progressHandler = (event: ProgressEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      this.on('progress', progressHandler);

      // Keep-alive ping (15秒ごと)
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15000);
    }
  });
}
```

---

### Phase 6: 進捗追跡とダウンロード

**実施内容**:
- リアルタイム進捗表示UI実装
- EventSource APIによるSSE接続
- 動画ダウンロード機能

**作成ファイル**:
- `app/components/progress-tracker.tsx` - 進捗表示UI

**SSEクライアント実装**:
```typescript
useEffect(() => {
  const eventSource = new EventSource(`/api/video/status/${jobId}`);

  eventSource.onmessage = (event) => {
    const data: ProgressEvent = JSON.parse(event.data);
    setProgress(data);

    if (data.step === 'complete') {
      if (data.status === 'completed' && data.data?.videoPath) {
        onComplete(data.data.videoPath);
      }
      eventSource.close();
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    eventSource.close();
    onError('Connection to server lost');
  };

  return () => eventSource.close();
}, [jobId]);
```

**5ステップ進捗表示**:
1. シナリオ生成 (0-25%)
2. 画像生成 (25-50%)
3. 音声生成 (50-75%)
4. 動画組み立て (75-90%)
5. BGM追加 (90-100%)

---

### Phase 7: ファイルアップロード

**実施内容**:
- ファイルアップロードUI実装
- FormData処理（multipart/form-data）
- ファイルバリデーション

**ファイル制限**:
```typescript
// 画像ファイル
- Type: image/png, image/jpeg
- Size: 10MB以下

// BGMファイル
- Type: audio/mpeg, audio/wav
- Size: 20MB以下
```

**FormData送信**:
```typescript
const formDataToSend = new FormData();
formDataToSend.append('input', formData.input);
formDataToSend.append('provider', formData.provider);
formDataToSend.append('apiKeys', JSON.stringify(formData.apiKeys));
formDataToSend.append('scenario', JSON.stringify(editedScenario));

if (formData.referenceImage) {
  formDataToSend.append('referenceImage', formData.referenceImage);
}
if (formData.bgm) {
  formDataToSend.append('bgm', formData.bgm);
}
```

---

### Phase 8: UI統合と最終調整

**実施内容**:
- 4ステップフロー統合（input → scenario → processing → complete）
- エラーハンドリング実装
- デザイン調整（白黒モノクロ）

**デザイン修正の経緯**:

**問題**: 背景色と文字色が同じで見えない

**原因**: Tailwind CSS 4.x互換性問題とHSL値の設定ミス

**解決策**:
1. Tailwind CSS 3.4.0にダウングレード
2. カラースキームを白黒モノクロに変更

```css
/* app/globals.css */
:root {
  /* Light theme - clean white & black */
  --background: 0 0% 100%;         /* Pure white */
  --foreground: 0 0% 10%;          /* Near black */
  --primary: 0 0% 10%;             /* Black buttons */
  --primary-foreground: 0 0% 98%;  /* White text */
  --border: 0 0% 90%;              /* Light gray borders */
}
```

**4ステップフロー**:
```typescript
type AppStep = 'input' | 'scenario' | 'processing' | 'complete';

const [step, setStep] = useState<AppStep>('input');

// 1. Input → Scenario
handleFormSubmit() → POST /api/scenario/preview → setStep('scenario')

// 2. Scenario → Processing
handleScenarioApprove() → POST /api/video/generate → setStep('processing')

// 3. Processing → Complete
ProgressTracker → onComplete() → setStep('complete')

// 4. Complete → Input
handleStartOver() → setStep('input')
```

---

### Phase 9: Vercelデプロイ準備

**実施内容**:
- FFmpeg Vercel対応パッケージインストール
- vercel.json設定ファイル作成
- ビルドテストと修正

**インストールパッケージ**:
```bash
npm install @ffmpeg-installer/ffmpeg form-data
```

**vercel.json作成**:
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["hnd1"],
  "functions": {
    "app/api/video/generate/route.ts": {
      "maxDuration": 800,    // Fluid Compute必須
      "memory": 3008
    },
    "app/api/video/status/[jobId]/route.ts": {
      "maxDuration": 800
    }
  }
}
```

**next.config.ts設定**:
```typescript
const config: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // ファイルアップロード対応
    },
  },
  // Node.js runtime強制（Edge不可）
};
```

**ビルド時の問題と解決**:

**問題1**: モジュールが見つからない
```
Module not found: Can't resolve './sumo-text-normalizer.js'
```

**解決**: TypeScriptファイルのimport文から`.js`拡張子を削除
```typescript
// BEFORE
import { SumoTextNormalizer } from './sumo-text-normalizer.js';

// AFTER
import { SumoTextNormalizer } from './sumo-text-normalizer';
```

**問題2**: TypeScript型エラー
```
Type 'undefined' is not assignable to type 'string'
```

**原因**: `Record<string, string>`型に`undefined`を設定

**解決**: プロパティを削除する方法に変更
```typescript
// BEFORE
setErrors((prev) => ({ ...prev, input: undefined }));

// AFTER
setErrors((prev) => {
  const { input, ...rest } = prev;
  return rest;
});
```

**ビルド成功**:
```bash
npm run build
✓ Compiled successfully
✓ Generating static pages (5/5)
```

**更新ファイル**:
- `.gitignore` - Next.js/Vercel関連パターン追加
- `src/agents/video-agent.ts` - import文修正
- `app/components/video-form.tsx` - 型エラー修正

---

### Phase 10: ドキュメントと最終確認

**作成ドキュメント**:

1. **README.md** - プロジェクト全体のドキュメント
   - 機能概要
   - インストール手順
   - 使用方法
   - API仕様
   - アーキテクチャ説明
   - トラブルシューティング

2. **DEPLOYMENT.md** - Vercelデプロイガイド
   - デプロイ手順（詳細）
   - Fluid Compute設定方法
   - 環境変数（不要を明記）
   - トラブルシューティング
   - コスト試算
   - モニタリング設定

3. **CHECKLIST.md** - 検証チェックリスト
   - プレデプロイチェック
   - ローカルテスト項目
   - 本番テスト項目
   - 既知の制限事項

4. **DEPLOYMENT_HISTORY.md** - 本ドキュメント
   - 全作業履歴
   - 技術的詳細
   - 問題と解決策

---

## 🔧 主要ファイルの変更内容

### 新規作成ファイル（重要なもの）

```
app/
├── api/
│   ├── scenario/
│   │   └── preview/route.ts        # シナリオ生成API
│   └── video/
│       ├── generate/route.ts       # 動画生成開始API
│       ├── status/[jobId]/route.ts # SSE進捗API
│       └── download/[jobId]/route.ts # ダウンロードAPI
├── components/
│   ├── video-form.tsx              # 入力フォーム
│   ├── api-key-manager.tsx         # APIキー管理
│   ├── scenario-editor.tsx         # シナリオ編集
│   └── progress-tracker.tsx        # 進捗表示
├── lib/
│   └── storage.ts                  # LocalStorageヘルパー
├── page.tsx                        # メインページ
└── layout.tsx                      # ルートレイアウト

src/lib/
├── video-job-manager.ts            # ジョブ管理
└── progress-emitter.ts             # SSE送信

vercel.json                         # Vercel設定
next.config.ts                      # Next.js設定
tailwind.config.ts                  # Tailwind設定
```

### 修正ファイル

**src/agents/video-agent.ts** - 主要リファクタリング
- コンストラクタ変更（APIキー注入）
- 進捗コールバック追加
- カスタムファイルパス対応
- import文修正（.js削除）

**tsconfig.json** - TypeScript設定
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",        // Next.js required
    "allowJs": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**package.json** - 依存関係追加
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwindcss": "^3.4.0",
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    // ... shadcn/ui components
  }
}
```

---

## ⚠️ 遭遇した問題と解決策

### 1. Tailwind CSS 4.x互換性エラー

**エラー内容**:
```
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
The PostCSS plugin has moved to a separate package...
```

**原因**: Tailwind CSS 4.xの破壊的変更

**解決策**:
```bash
npm install -D tailwindcss@^3.4.0
```

### 2. CSS @apply エラー

**エラー内容**:
```
CssSyntaxError: The `border-border` class does not exist.
```

**原因**: CSS変数の不適切な使用

**解決策**: `@apply`を使わず直接CSSで記述
```css
/* BEFORE */
.example {
  @apply border-border;
}

/* AFTER */
.example {
  border-color: hsl(var(--border));
}
```

### 3. デザイン可視性問題

**問題**: 背景色と文字色が同じで見えない

**原因**: HSL値の設定ミス

**解決策**: 完全な白黒モノクロに変更
```css
--background: 0 0% 100%;    /* 白 */
--foreground: 0 0% 10%;     /* 黒 */
```

### 4. TypeScript Import エラー

**エラー内容**:
```
Module not found: Can't resolve './sumo-text-normalizer.js'
```

**原因**: TypeScriptファイルに`.js`拡張子

**解決策**: 拡張子を削除
```typescript
import { SumoTextNormalizer } from './sumo-text-normalizer';
```

### 5. TypeScript型エラー

**エラー内容**:
```
Type 'undefined' is not assignable to type 'string'
```

**原因**: `Record<string, string>`にundefined代入

**解決策**: プロパティを削除
```typescript
setErrors((prev) => {
  const { input, ...rest } = prev;
  return rest;
});
```

---

## 🚀 デプロイ手順（次回用）

### 1. コードをGitHubにプッシュ

```bash
git add .
git commit -m "feat: AI Jonbin Movie Maker web service ready for deployment"
git push origin main
```

### 2. Vercelにインポート

1. https://vercel.com/new にアクセス
2. "Import Project" をクリック
3. GitHubリポジトリを選択
4. Framework: Next.js（自動検出）
5. Root Directory: `/` (デフォルト)
6. Build Command: `npm run build` (デフォルト)

### 3. Fluid Compute有効化（必須！）

**重要**: これを有効にしないと10秒でタイムアウトします

1. Vercelダッシュボード → プロジェクト選択
2. Settings → Functions
3. "Fluid Compute" をON
4. 保存

### 4. デプロイ実行

1. "Deploy" ボタンをクリック
2. ビルド完了を待つ（2-3分）
3. 本番URLにアクセスして確認

### 5. 動作確認

1. APIキー設定が動作するか
2. シナリオ生成が動作するか
3. 動画生成が完了するか（長時間処理）
4. ダウンロードが動作するか

---

## 📊 プロジェクト統計

### コード量
- **総ファイル数**: 約50ファイル
- **新規作成**: 約30ファイル
- **修正**: 約20ファイル
- **コード行数**: 約3,000行（コメント含む）

### 依存関係
- **Next.js**: 16.1.1
- **React**: 19.2.3
- **TypeScript**: 最新
- **Tailwind CSS**: 3.4.0
- **shadcn/ui**: 最新
- **FFmpeg**: @ffmpeg-installer/ffmpeg 1.1.0

### API エンドポイント
- `POST /api/scenario/preview` - シナリオ生成
- `POST /api/video/generate` - 動画生成開始
- `GET /api/video/status/[jobId]` - SSE進捗
- `GET /api/video/download/[jobId]` - ダウンロード

### UIコンポーネント
- VideoForm - 入力フォーム
- ApiKeyManager - APIキー管理
- ScenarioEditor - シナリオ編集
- ProgressTracker - 進捗表示
- Button, Input, Textarea, Label - shadcn/ui

---

## 💡 次回作業時の注意点

### 開発環境起動

```bash
# 依存関係インストール（初回のみ）
npm install

# 開発サーバー起動
npm run dev

# ブラウザで確認
# http://localhost:3000
```

### ビルドテスト

```bash
# 本番ビルドテスト
npm run build

# 本番サーバー起動
npm start
```

### コード修正時の注意

1. **TypeScript型チェック**: `npm run build`で確認
2. **Import文**: `.js`拡張子を付けない
3. **CSS**: `@apply`よりも直接CSS推奨
4. **API Keys**: 環境変数ではなくLocalStorage

### よくある問題

**Q: ビルドが失敗する**
- A: `npm run build`でローカル確認
- A: TypeScript型エラーを修正

**Q: 動画生成がタイムアウト**
- A: Fluid Computeが有効か確認
- A: Vercel Pro プランか確認

**Q: SSE接続が切れる**
- A: keep-alive pingが動作しているか確認
- A: ブラウザのネットワークタブで確認

---

## 📝 今後の拡張可能性

### 短期的改善
- [ ] 動画プレビュー機能追加
- [ ] エラーメッセージの多言語化
- [ ] UIアニメーション改善
- [ ] モバイル対応強化

### 中期的改善
- [ ] ユーザー認証追加
- [ ] 動画履歴管理
- [ ] テンプレート機能
- [ ] バッチ処理対応

### 長期的改善
- [ ] S3永続化ストレージ
- [ ] AWS MediaConvert統合
- [ ] ソーシャルメディア連携
- [ ] 動画編集機能（トリミング等）

---

## 🎓 学んだこと・技術メモ

### Next.js 15 App Router
- Server ActionsのbodySizeLimit設定が必要
- Dynamic APIルートは`[param]`ディレクトリ
- SSEはReadableStreamで実装

### Server-Sent Events (SSE)
- `text/event-stream` Content-Type
- `data: {json}\n\n` フォーマット
- Keep-alive pingで接続維持（15秒推奨）
- EventSource APIでクライアント接続

### Vercel Deployment
- Fluid Compute: 800秒実行可能（Pro plan）
- Node.js runtime必須（FFmpeg使用）
- `/tmp`ディレクトリは512MB制限
- 環境変数不要の設計も可能

### TypeScript Tips
- `Record<string, string>`型は厳密
- プロパティ削除は`const {prop, ...rest} = obj`
- Import文に拡張子不要（ESM）

---

## ✅ 完了チェックリスト

### Phase完了状況
- [x] Phase 1: Next.js基盤構築
- [x] Phase 2: APIキー管理とストレージ
- [x] Phase 3: シナリオプレビュー機能
- [x] Phase 4: VideoAgent改修
- [x] Phase 5: ジョブ管理とAPI実装
- [x] Phase 6: 進捗追跡とダウンロード
- [x] Phase 7: ファイルアップロード
- [x] Phase 8: UI統合と最終調整
- [x] Phase 9: Vercelデプロイ準備
- [x] Phase 10: ドキュメントと最終確認

### 技術検証
- [x] ビルド成功（npm run build）
- [x] TypeScript型チェック合格
- [x] ローカル動作確認（http://localhost:3000）
- [x] FFmpeg統合確認
- [ ] Vercelデプロイ確認（次回実施）
- [ ] 本番動作確認（次回実施）

### ドキュメント完成
- [x] README.md - プロジェクト概要
- [x] DEPLOYMENT.md - デプロイガイド
- [x] CHECKLIST.md - 検証リスト
- [x] DEPLOYMENT_HISTORY.md - 本ドキュメント

---

## 📞 サポート・参考リンク

### 公式ドキュメント
- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com

### 関連リポジトリ
- Miyabi Framework: https://github.com/ShunsukeHayashi/Autonomous-Operations

---

**作業完了日**: 2026-01-06
**次回参照時**: このドキュメントを最初に読んでください

**ステータス**: ✅ 開発完了、デプロイ準備完了
