# 💻 Build & Run Guide (Local / On‑premise)
VideoReviewをDockerなしでサーバー上で直接実行する方法を説明します  

## Copy Environment file

環境変数ファイルをコピーしてください

```bash
cp .example.env .env
```

## Edit Environment 

PostgreSQLが稼働しているサーバーを指定してください

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

本番環境では、動画保存用のストレージを 必ず明示的に設定してください

```bash
VIDEO_REVIEW_LOCAL_ROOTDIR="/path/.../..."
```

`VIDEO_REVIEW_LOCAL_ROOTDIR` が未設定、または無効な場合、  
アプリケーションは `process.cwd()/uploads` にフォールバックして
動画ファイルを保存します。

このフォールバック挙動は以下の理由から、長期保存や本番運用には適していません。

- アプリケーションの更新や再デプロイ時にファイルが失われる可能性がある
- ストレージの場所が不明確になる場合がある
- アプリ実行場所と同居してしまうため、容量管理が難しくなる

## Local / On‑premise Setup

### Prerequisites
* node v24
* postgreSQL

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:deploy
npm run prisma:generate

# Start the application
npm run build
npm run start
```

