# プロジェクト構造ガイド

**AI Jonbin Movie Maker** のディレクトリ構造と各ファイルの役割を説明します。

---

## 📂 全体構造

```
agentworkflow/
├── app/                        # Next.js Webアプリケーション
├── src/                        # コアロジック（Web/CLI共用）
├── docs/                       # ドキュメント集約
├── public/                     # 静的アセット
├── output/                     # 動画生成結果（.gitignore）
├── node_modules/               # 依存パッケージ（.gitignore）
├── .next/                      # Next.jsビルド出力（.gitignore）
├── .claude/                    # Claude Code設定
├── .github/                    # GitHub Actions ワークフロー
├── external/                   # 外部ツール
├── tools/                      # ユーティリティスクリプト
└── (設定ファイル)
```

---

## 🌐 app/ - Next.js Webアプリケーション

Webサービス版のすべての機能を含みます。

### ディレクトリ構造

```
app/
├── api/                        # API Routes（バックエンド）
│   ├── scenario/
│   │   └── preview/
│   │       └── route.ts        # POST /api/scenario/preview
│   └── video/
│       ├── generate/
│       │   └── route.ts        # POST /api/video/generate
│       ├── status/[jobId]/
│       │   └── route.ts        # GET /api/video/status/:jobId (SSE)
│       └── download/[jobId]/
│           └── route.ts        # GET /api/video/download/:jobId
├── components/                 # Reactコンポーネント
│   ├── ui/                     # shadcn/ui基本コンポーネント
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   └── dialog.tsx
│   ├── video-form.tsx          # 入力フォーム
│   ├── api-key-manager.tsx     # APIキー管理モーダル
│   ├── scenario-editor.tsx     # シナリオ編集UI
│   └── progress-tracker.tsx    # リアルタイム進捗表示
├── lib/                        # クライアント側ユーティリティ
│   ├── storage.ts              # LocalStorageヘルパー
│   └── utils.ts                # shadcn/ui utilities (cn関数)
├── types/                      # TypeScript型定義
│   └── video.ts                # Scenario, Scene, ProgressEvent等
├── layout.tsx                  # ルートレイアウト
├── page.tsx                    # メインページ（4ステップフロー）
└── globals.css                 # グローバルスタイル（Tailwind + カスタムCSS）
```

### 主要ファイルの役割

#### API Routes

**POST /api/scenario/preview**
- シナリオのみを生成（動画は作らない）
- OpenAI GPT-4でシナリオ作成
- レスポンス: `{ scenario: {...} }`

**POST /api/video/generate**
- 動画生成ジョブを開始
- FormData受信（JSON + ファイル）
- すぐにjobIdを返す（非同期処理）
- VideoAgentをバックグラウンドで実行

**GET /api/video/status/:jobId**
- Server-Sent Events (SSE) ストリーム
- リアルタイムで進捗を送信
- 5ステップ（シナリオ/画像/音声/組立/BGM）
- Keep-alive pingで接続維持

**GET /api/video/download/:jobId**
- 完成した動画をダウンロード
- Content-Type: video/mp4
- Content-Disposition: attachment

#### Components

**video-form.tsx**
- URL/テキスト入力
- 音声プロバイダー選択（ElevenLabs/VoiceVox）
- ファイルアップロード（画像、BGM）
- バリデーション
- LocalStorageからAPIキー読込

**api-key-manager.tsx**
- Dialog形式のモーダル
- 3つのAPIキー管理（OpenAI, Google, ElevenLabs）
- LocalStorageへ保存
- 表示/非表示トグル

**scenario-editor.tsx**
- シナリオタイトル表示
- シーンリスト（編集可能）
- シーン追加/削除
- テキストと画像プロンプト編集
- 承認/キャンセルボタン

**progress-tracker.tsx**
- EventSource APIでSSE接続
- 5ステップの進捗バー
- リアルタイムメッセージ表示
- アニメーション（ローディングドット）

#### Main Page

**page.tsx**
- 4ステップフロー管理
  1. `input` - 入力フォーム
  2. `scenario` - シナリオ編集
  3. `processing` - 進捗表示
  4. `complete` - ダウンロード
- 状態管理（useState）
- エラーハンドリング

**layout.tsx**
- HTMLルート構造
- フォント設定
- メタデータ

---

## 🔧 src/ - コアロジック

Web版とCLI版で共用されるコアロジック。

### ディレクトリ構造

```
src/
├── agents/                     # AIエージェント
│   ├── video-agent.ts          # 動画生成メインロジック
│   ├── sumo-text-normalizer.ts # 相撲用語正規化
│   └── image-prompt-builder.ts # 画像プロンプト生成
├── lib/                        # サーバー側ユーティリティ
│   ├── video-job-manager.ts    # ジョブライフサイクル管理
│   └── progress-emitter.ts     # SSE進捗イベント送信
└── data/                       # 辞書データ
    ├── sumo_terms.json         # 相撲用語辞書
    └── ...
```

### 主要ファイルの役割

**video-agent.ts**
- 動画生成のメインエンジン
- Web版: コンストラクタでAPIキー注入
- CLI版: 環境変数から読込（後方互換性）
- 進捗コールバック対応
- 5つのステップを順次実行：
  1. シナリオ生成（OpenAI）
  2. 画像生成（Google Gemini）
  3. 音声生成（ElevenLabs/VoiceVox）
  4. 動画組み立て（FFmpeg）
  5. BGM追加（FFmpeg）

**video-job-manager.ts**
- ジョブIDの生成（UUID）
- ジョブメタデータ管理（Map）
- 状態遷移（pending → processing → completed/error）
- 自動クリーンアップ（60分後）
- シングルトンパターン

**progress-emitter.ts**
- EventEmitter継承
- 進捗イベントをSSE形式に変換
- ReadableStreamを返す
- Keep-alive ping（15秒ごと）

---

## 📚 docs/ - ドキュメント集約

プロジェクトのすべてのドキュメントを集約。

```
docs/
├── README_FULL.md              # 完全版README（詳細機能説明）
├── DEPLOYMENT.md               # Vercelデプロイガイド
├── DEPLOYMENT_HISTORY.md       # Web化作業の全記録
├── CHECKLIST.md                # 検証チェックリスト
└── PROJECT_STRUCTURE.md        # このファイル
```

### 各ドキュメントの用途

**README_FULL.md**
- 詳細な機能説明
- API仕様
- アーキテクチャ解説
- トラブルシューティング
- 開発ガイド

**DEPLOYMENT.md**
- Vercelデプロイ手順（詳細）
- Fluid Compute設定
- 環境変数（不要を明記）
- モニタリング設定
- コスト試算

**DEPLOYMENT_HISTORY.md**
- Web化プロジェクトの全10フェーズ記録
- 各フェーズの詳細作業内容
- 遭遇した問題と解決策
- 技術的な学び
- 次回作業時の参考資料

**CHECKLIST.md**
- プレデプロイチェック
- ローカルテスト項目
- 本番テスト項目
- 既知の制限事項

**PROJECT_STRUCTURE.md**
- ディレクトリ構造の説明（このファイル）
- 各ファイルの役割
- 設計思想

---

## 🎨 public/ - 静的アセット

Webサービスの静的ファイル（画像、アイコン等）を配置。

```
public/
├── favicon.ico
└── (その他の静的アセット)
```

Next.js の仕様により、`public/` 配下のファイルは `/` でアクセス可能。

---

## 📦 output/ - 動画生成結果

動画生成の出力ファイルを保存。

```
output/
├── README.md                   # このディレクトリの説明
└── YYYY-MM-DD_HH-MM-SS_タイトル/
    ├── scenario.json
    ├── scene_*.png
    ├── scene_*.mp3
    ├── chunk_*.mp4
    └── sumo_news.mp4
```

- `.gitignore` に含まれる
- Web版: 60分で自動削除
- CLI版: 手動削除が必要

詳細は [`output/README.md`](../output/README.md) を参照。

---

## ⚙️ 設定ファイル（ルート）

### Next.js / Vercel

**next.config.ts**
```typescript
{
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // ファイルアップロード対応
    },
  },
}
```

**vercel.json**
```json
{
  "functions": {
    "app/api/video/generate/route.ts": {
      "maxDuration": 800,    // Fluid Compute
      "memory": 3008
    }
  }
}
```

### TypeScript

**tsconfig.json**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",      // Next.js required
    "paths": {
      "@/*": ["./*"]         // パスエイリアス
    }
  }
}
```

### Tailwind CSS

**tailwind.config.ts**
- Content paths設定
- shadcn/ui カスタマイズ

**postcss.config.mjs**
- Tailwind CSS plugin設定

**app/globals.css**
- Tailwind directives
- CSS変数（カラーテーマ）
- カスタムスタイル

### パッケージ管理

**package.json**
- 依存関係
- スクリプト（dev, build, start）

**package-lock.json**
- 依存関係ロック

### 環境変数

**.env** (gitignore)
- 実際のAPIキー（ローカル開発用）

**.env.example**
```bash
OPENAI_API_KEY=
GOOGLE_API_KEY=
ELEVENLABS_API_KEY=
```

### Git

**.gitignore**
- `node_modules/`
- `.next/`
- `.env`
- `output/`
- その他のビルド成果物

---

## 🤖 .claude/ - Claude Code設定

Claude Code用の設定とカスタムコマンド。

```
.claude/
├── settings.json               # Claude Code設定
├── commands/                   # カスタムスラッシュコマンド
│   ├── create-sumo-video.md
│   └── n8n-advisor.md
└── agents/                     # カスタムエージェント
```

---

## 🔄 .github/ - GitHub Actions

CI/CD ワークフロー。

```
.github/
└── workflows/
    ├── deploy-pages.yml
    ├── weekly-report.yml
    └── ... (26+ workflows)
```

---

## 🛠️ 開発フロー

### ローカル開発

```bash
# 1. 依存関係インストール
npm install

# 2. 開発サーバー起動
npm run dev

# 3. ブラウザで確認
# http://localhost:3000
```

### ビルドテスト

```bash
# TypeScript型チェック + ビルド
npm run build

# 本番サーバー起動
npm start
```

### デプロイ

```bash
# GitHubにプッシュ
git push origin main

# Vercelで自動デプロイ
```

---

## 📊 ファイル統計

- **総ファイル数**: 約50ファイル
- **コード行数**: 約3,000行（コメント含む）
- **API Routes**: 4エンドポイント
- **Reactコンポーネント**: 10+ コンポーネント
- **ドキュメント**: 5ファイル

---

## 🔍 主要な依存関係

```json
{
  "next": "16.1.1",
  "react": "19.2.3",
  "typescript": "latest",
  "tailwindcss": "^3.4.0",
  "@ffmpeg-installer/ffmpeg": "^1.1.0",
  "openai": "latest",
  "cheerio": "latest",
  // ... shadcn/ui components
}
```

---

## 📝 命名規則

### ディレクトリ
- `kebab-case` (例: `api-key-manager`)

### ファイル
- React Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Types: `kebab-case.ts`

### 変数・関数
- `camelCase`
- React Hooks: `use` prefix
- Event Handlers: `handle` prefix

### 型
- Interfaces: `PascalCase`
- Types: `PascalCase`

---

## 🎯 次のステップ

プロジェクト構造を理解したら：

1. [`docs/README_FULL.md`](./README_FULL.md) - 詳細機能を確認
2. [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) - デプロイ手順を確認
3. [`docs/DEPLOYMENT_HISTORY.md`](./DEPLOYMENT_HISTORY.md) - 技術的詳細を確認

---

**最終更新**: 2026-01-06
