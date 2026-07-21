# 🐳 Build & Run Guide (Docker)
VideoReviewをDockerで実行する方法について説明します。  
本番環境やコンテナベースでのデプロイには、こちらをオススメします

## Copy Environment file

環境変数ファイルをコピーしてください


```bash
cp .example.env .env
```

## Edit Environment

`DOCKER_HOST_STORAGE` が指定されていない場合、アップロードされたファイルは Docker 管理の名前付きボリュームに保存されます

```bash
DOCKER_HOST_STORAGE="/path/on/your/host"
```

## Docker (Production)

```bash
# 1. Create image
docker build -t videoreview:latest -f docker/web/Dockerfile.prod .

# 2. Run only DB
docker compose -f compose.prod.yml up -d db

# 3. Run prisma deploy (just once, for initial setup or schema changes)
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy

# 4. Run web service
docker compose -f compose.prod.yml up -d videoreview

```
## Docker (Development)

```bash
# Install dependencies
npm install
# Start containers
docker compose up -d --build
```
