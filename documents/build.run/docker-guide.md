# 🐳 Build & Run Guide (Docker)
This guide explains how to run VideoReview using Docker.  
Choose this mode for production or container-based deployment.

## Copy Environment file

Please copy .env and edit it to set the required values

```bash
cp .example.env .env
```

## Edit Environment

If `DOCKER_HOST_STORAGE` is not specified, uploaded files will be stored in a Docker-managed named volume. 
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
