---
description: n8nワークフロー推薦 - 自然言語からノード構成を提案
---

# n8n Workflow Advisor

n8nワークフローの最適なノード構成を推薦します。実現したい機能を自然言語で説明すると、トリガー、プロセッサー、統合サービスを自動選択します。

## 使用方法

```bash
/n8n-advisor [クエリ]
```

**パラメータ**:
- `クエリ` (オプション): 実現したい機能の説明
  - 省略した場合: 対話的に質問します

## 実行内容

n8n-advisor MCPサーバーの以下のツールを使用します：

### 1. ワークフロー推薦 (`recommend_n8n_workflow`)

自然言語クエリから最適なノード構成を提案します。

**推薦内容**:
- **トリガー**: ワークフロー開始のきっかけ
- **プロセッサー**: データ加工・変換処理
- **統合サービス**: 連携する外部サービス
- **設定例**: 各ノードの設定JSON

### 2. ノード情報検索 (`get_n8n_node_info`)

特定のn8nノードの詳細情報を取得します。

### 3. パターン一覧 (`list_n8n_patterns`)

よく使われるワークフローパターンを表示します。

## 実行例

### Example 1: Webhook → Airtable

```
/n8n-advisor WebhookでフォームデータをAirtableに保存したい
```

**出力**:
```
# n8nワークフロー推薦結果

**クエリ**: WebhookでフォームデータをAirtableに保存したい

## 推薦ノード構成

1. **トリガー**: Webhook
   - HTTPリクエストを受け取る

2. **プロセッサー**: Set (データ整形)
   - フォームデータをAirtable形式に変換

3. **統合サービス**: Airtable
   - レコードを作成

## 推薦ノード詳細

### トリガー: Webhook
- **説明**: HTTPリクエストを受け取ってワークフローを開始
- **使用例**: フォーム送信、外部サービスからの通知
- **設定**:
```json
{
  "httpMethod": "POST",
  "path": "form-submit",
  "responseMode": "onReceived"
}
```

### プロセッサー
#### Set
- **説明**: データを整形・変換
- **使用例**: APIレスポンスの加工、フィールド名変更

### 統合サービス: Airtable
- **説明**: Airtableにデータを保存・取得
- **使用例**: データベース操作、レコード管理
- **利用可能な操作**: create, read, update, delete
- **設定**:
```json
{
  "operation": "create",
  "baseId": "appXXXXXXXXXX",
  "tableName": "Form Submissions"
}
```
```

### Example 2: Slack通知パターン検索

```
/n8n-advisor Slackに関連するパターンを教えて
```

**実行**:
1. `list_n8n_patterns` でパターン一覧取得
2. Slack関連をフィルタリング
3. 推薦ワークフローを提示

### Example 3: 特定ノードの詳細

```
/n8n-advisor Google Sheetsノードについて詳しく教えて
```

**実行**:
1. `get_n8n_node_info` で検索
2. Google Sheetsノードの詳細表示
3. 設定例・使用例を提示

## よく使われるユースケース

### 1. データ連携
- **Webhook → Google Sheets**
- **Slack → Notion**
- **Gmail → Airtable**

### 2. 自動化
- **定期実行 → API呼び出し**
- **RSS Feed → Slack通知**
- **GitHub Issue → Discord通知**

### 3. データ処理
- **CSV解析 → データ変換 → DB保存**
- **画像アップロード → リサイズ → S3保存**
- **テキスト抽出 → AI処理 → 保存**

## 提供される情報

1. **推薦ノード構成**
   - トリガー、プロセッサー、統合サービスの選択理由

2. **設定例**
   - 各ノードの具体的な設定JSON

3. **ワークフロー設定**
   - n8nにインポート可能なJSON設定（オプション）

4. **使用例・説明**
   - 各ノードの使い方と具体例

## MCPツールについて

このコマンドは以下のMCPツールを使用します：

```json
{
  "mcpServers": {
    "n8n-advisor": {
      "command": "node",
      "args": ["tools/n8n-advisor/src/mcp-server.js"],
      "description": "n8nワークフロー最適ノード推薦システム"
    }
  }
}
```

**MCPツール一覧**:
- `recommend_n8n_workflow`: ワークフロー推薦
- `get_n8n_node_info`: ノード詳細情報
- `list_n8n_patterns`: パターン一覧

## トラブルシューティング

### Q1: MCPサーバーが起動しない

```bash
# MCPサーバーの状態確認
node tools/n8n-advisor/src/mcp-server.js

# 依存関係インストール
cd tools/n8n-advisor
npm install
```

### Q2: ノードデータが見つからない

```bash
# データファイル確認
cat tools/n8n-advisor/data/nodes.json
```

### Q3: 推薦結果が期待と違う

- より具体的なクエリを入力してください
- 例: 「データを保存したい」→「WebhookでフォームデータをAirtableに保存したい」

## 関連リソース

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Workflows](https://n8n.io/workflows)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

💡 n8nワークフロー構築の第一歩として、ぜひお試しください。
