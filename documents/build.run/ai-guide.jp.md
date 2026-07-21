# AI サポートガイド

## 1. 概要

AIサポートはオプションです。有効にすると、LLMを使って要約を生成します
（例：VCS「コード変更」パネルにマージ済みPRのAI要約を表示）。

MCPサーバーも同じLLMプロバイダーを使い、動画リビジョンへの質問に回答します。

---

## 2. プロバイダーの選択

| | Claude (Anthropic) | Ollama（ローカル） |
|---|---|---|
| **プライバシー** | PR/コミット情報をAnthropicに送信 | 完全ローカル、外部送信なし |
| **精度** | 高精度 | モデルに依存 |
| **コスト** | トークン課金 | 無料（ハードウェアコストのみ） |
| **セットアップ** | APIキーのみ | Ollama起動＋モデルのダウンロードが必要 |
| **推奨用途** | 本番環境・チーム利用 | ローカル・オフライン環境 |

---

## 3. 共通設定

`.example.env` を `.env` にコピーして以下を設定してください：

```env
NEXT_PUBLIC_VIDEO_REVIEW_USE_AI_SUPPORT=true

# "claude" または "ollama"
VIDEO_REVIEW_LLM_PROVIDER=claude

# モデル名
# Claude:  claude-haiku-4-5-20251001 / claude-sonnet-4-6
# Ollama:  llama3.1:8b / gemma3:12b
VIDEO_REVIEW_LLM_MODEL=claude-haiku-4-5-20251001
```

---

## 4. Claude のセットアップ

```env
VIDEO_REVIEW_LLM_API_KEY=sk-ant-...
```

APIキーの取得先: https://console.anthropic.com/

---

## 5. Ollama のセットアップ

### ローカル（ホスト直接実行）

```bash
# 1. Ollama をインストール: https://ollama.com/download
# 2. モデルをダウンロード（初回のみ — ~/.ollama/models に保存される）
ollama pull llama3.1:8b

# 3. .env に設定
VIDEO_REVIEW_LLM_BASE_URL=http://localhost:11434
VIDEO_REVIEW_LLM_MODEL=llama3.1:8b
```

### Docker

```bash
# 1. Ollamaコンテナにモデルをダウンロード（初回のみ）
docker exec videoreview-ollama ollama pull llama3.1:8b

# モデルデータはDockerボリュームに保存され、再起動後も保持されます。
```

---

## 6. MCPサーバーのセットアップ

MCPサーバーはVideoReviewのデータをAIアシスタント（Claude Desktopなど）に公開します。

### Docker — Claudeプロバイダー

```bash
# 1. MCPイメージをビルド
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .

# 2. MCPサーバーを起動
docker compose -f compose.prod.yml -f compose.prod.mcp.claude.yml up -d mcp
```

### Docker — Ollamaプロバイダー

```bash
# 1. MCPイメージをビルド
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .

# 2. MCPサーバーとOllamaコンテナを起動
docker compose -f compose.prod.yml -f compose.prod.mcp.ollama.yml up -d mcp ollama

# 3. モデルをダウンロード（初回のみ）
docker exec videoreview-ollama ollama pull llama3.1:8b
```

### ローカル

```bash
# ビルド
npm run mcp:build

# 実行（.envのLLM設定を読み込む）
npm run mcp:run
```

Claude Desktopと連携する場合は、MCPクライアントの設定でトランスポートを `stdio` に設定し、
ビルド済みバイナリを指定してください。
