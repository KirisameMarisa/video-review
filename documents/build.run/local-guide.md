# 💻 Build & Run Guide (Local / On‑premise)
This guide explains how to run VideoReview directly on a server without Docker.  
Choose this mode for simple on-premise setups.

## Copy Environment file

Please copy .env and edit it to set the required values

```bash
cp .example.env .env
```

## Edit Environment 

Please specify the server where PostgreSQL is running.

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

In local (non-Docker) environments, it is strongly recommended to explicitly set:

```bash
VIDEO_REVIEW_LOCAL_ROOTDIR="/path/.../..."
```

If `VIDEO_REVIEW_LOCAL_ROOTDIR` is not set or is invalid, the application falls back to
`process.cwd()/uploads` to store uploaded video files.

This fallback behavior is **not suitable for production use or long-term storage**
for the following reasons:

- Files may be lost during application updates or redeployment
- The storage location may be unclear
- Backups and capacity planning become difficult

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

