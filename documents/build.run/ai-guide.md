# AI Support Guide

## 1. Overview

AI support is optional. When enabled, VideoReview uses an LLM to generate summaries
(e.g., the VCS Code Changes panel shows an AI-generated summary of merged PRs).

The MCP server also uses the LLM provider to answer questions about video revisions.

---

## 2. Choose a Provider

| | Claude (Anthropic) | Ollama (Local) |
|---|---|---|
| **Privacy** | PR/commit data sent to Anthropic API | Fully local, no external requests |
| **Quality** | High accuracy | Depends on model |
| **Cost** | Pay-per-token | Free (hardware cost only) |
| **Setup** | API key only | Requires Ollama running + model pulled |
| **Recommended for** | Production, teams | Local/offline environments |

---

## 3. Common Settings

Copy `.example.env` to `.env` and set:

```env
NEXT_PUBLIC_VIDEO_REVIEW_USE_AI_SUPPORT=true

# "claude" or "ollama"
VIDEO_REVIEW_LLM_PROVIDER=claude

# Model name
# Claude:  claude-haiku-4-5-20251001 / claude-sonnet-4-6
# Ollama:  llama3.1:8b / gemma3:12b
VIDEO_REVIEW_LLM_MODEL=claude-haiku-4-5-20251001
```

---

## 4. Claude Setup

```env
VIDEO_REVIEW_LLM_API_KEY=sk-ant-...
```

Get your API key from https://console.anthropic.com/

---

## 5. Ollama Setup

### Local (host)

```bash
# 1. Install Ollama: https://ollama.com/download
# 2. Pull a model (run once — stored in ~/.ollama/models)
ollama pull llama3.1:8b

# 3. Set in .env
VIDEO_REVIEW_LLM_BASE_URL=http://localhost:11434
VIDEO_REVIEW_LLM_MODEL=llama3.1:8b
```

### Docker

```bash
# 1. Pull the model into the Ollama container (run once)
docker exec videoreview-ollama ollama pull llama3.1:8b

# Model data is persisted in a Docker named volume across restarts.
```

---

## 6. MCP Server Setup

The MCP server exposes VideoReview data to AI assistants (e.g. Claude Desktop).

### Docker — Claude provider

```bash
# 1. Build MCP image
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .

# 2. Start MCP server
docker compose -f compose.prod.yml -f compose.prod.mcp.claude.yml up -d mcp
```

### Docker — Ollama provider

```bash
# 1. Build MCP image
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .

# 2. Start MCP server + Ollama container
docker compose -f compose.prod.yml -f compose.prod.mcp.ollama.yml up -d mcp ollama

# 3. Pull the model (first time only)
docker exec videoreview-ollama ollama pull llama3.1:8b
```

### Local

```bash
# Build
npm run mcp:build

# Run (reads LLM settings from .env)
npm run mcp:run
```

For Claude Desktop integration, set transport to `stdio` in your MCP client config
and point it to the built binary.
