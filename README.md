# AI Jonbin Movie Maker

**自律型動画生成システム - CLIとWebの両方で利用可能**

URL やテキストから AI が自動で動画を生成します。シナリオ生成、画像生成、音声合成、動画編集を全自動で実行。

---

## 🚀 クイックスタート

### Webサービスとして使う（推奨）

```bash
# 1. インストール
npm install

# 2. 開発サーバー起動
npm run dev

# 3. ブラウザで開く
# http://localhost:3000
```

### CLIとして使う

```bash
# VideoAgentを直接実行
npx miyabi agent:video --topic "相撲ニュース"
```

---

## 📖 ドキュメント

詳細なドキュメントは [`docs/`](./docs/) ディレクトリを参照してください：

- **[完全版README](./docs/README_FULL.md)** - 詳細な機能説明とAPI仕様
- **[デプロイガイド](./docs/DEPLOYMENT.md)** - Vercelへのデプロイ手順
- **[作業履歴](./docs/DEPLOYMENT_HISTORY.md)** - Webサービス化の全作業記録
- **[検証チェックリスト](./docs/CHECKLIST.md)** - テスト項目一覧

---

## 🎯 主要機能

### Webサービス版
- ✅ URL/テキスト入力
- ✅ シナリオプレビュー＆編集
- ✅ リアルタイム進捗表示（SSE）
- ✅ APIキー管理（LocalStorage）
- ✅ ファイルアップロード（画像、BGM）
- ✅ 動画ダウンロード

### CLI版
- ✅ コマンドラインから動画生成
- ✅ バッチ処理対応
- ✅ 環境変数でAPIキー管理

---

## 🏗️ プロジェクト構造

```
agentworkflow/
├── app/                        # Next.js Webアプリケーション
│   ├── api/                   # API Routes (動画生成、進捗、ダウンロード)
│   ├── components/            # UIコンポーネント
│   ├── lib/                   # クライアント側ユーティリティ
│   └── types/                 # TypeScript型定義
├── src/                        # コアロジック（Web/CLI共用）
│   ├── agents/                # VideoAgent（動画生成エンジン）
│   ├── lib/                   # ジョブ管理、進捗通知
│   └── data/                  # 辞書データ
├── docs/                       # 📚 ドキュメント集約
├── public/                     # 静的アセット
└── output/                     # 動画生成結果（自動削除）
```

---

## 🛠️ 技術スタック

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **AI**: OpenAI GPT-4, Google Gemini, ElevenLabs/VoiceVox
- **Video**: FFmpeg
- **Deploy**: Vercel Pro (Fluid Compute)

---

## 📝 使い方

### 1. APIキー設定

Webサービス: ブラウザで「APIキー設定」ボタンから設定

CLI: `.env`ファイルを作成
```bash
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
ELEVENLABS_API_KEY=...  # オプション
```

### 2. 動画生成

**Webサービス**:
1. URL またはテキストを入力
2. シナリオを確認・編集
3. 動画生成開始
4. ダウンロード

**CLI**:
```bash
npx miyabi agent:video --topic "ニュース記事のURL"
```

---

## 🚢 デプロイ

Vercelへのデプロイ手順は [デプロイガイド](./docs/DEPLOYMENT.md) を参照してください。

```bash
# 1. GitHubにプッシュ
git push origin main

# 2. Vercelでインポート
# 3. Fluid Computeを有効化
# 4. デプロイ完了！
```

---

## 📊 ステータス

- ✅ **開発完了**: 全10フェーズ完了
- ✅ **ビルド成功**: TypeScript型チェック合格
- ✅ **ドキュメント**: 完全版あり
- 🚀 **デプロイ準備完了**: Vercelへデプロイ可能

---

## 🔗 リンク

- **フレームワーク**: [Miyabi](https://github.com/ShunsukeHayashi/Autonomous-Operations)
- **Next.js**: [nextjs.org](https://nextjs.org)
- **Vercel**: [vercel.com](https://vercel.com)

---

## 📄 ライセンス

MIT

---

**詳細は [`docs/`](./docs/) ディレクトリのドキュメントを参照してください。**
