# VideoReview 

📘 日本語版 README はこちら → [README.jp.md](./README.jp.md)

<img src="./documents/resources/video-review.png" controls="true"></video>

VideoReview is a lightweight review tool where team members can upload videos,
add timeline comments, draw directly on frames, and communicate like using your everyday social media.  
It is designed to support feedback workflows in game development, video production, and other collaborative environments.  

## ✨ Features

- **Video Upload & Timeline Comments**
  - Add comments at any timestamp on the video.
  - Draw directly on the canvas for visual feedback.

- **Integrations**
  - Convert comments into **JIRA tickets**.
  - Automatically post comments to **Slack**.

- **Automated Upload Support**
  - A dedicated upload API allows tools or CI pipelines to
    **programmatically send videos** to VideoReview.

- **Lightweight & Simple Architecture**
  - Built with Next.js, Prisma, and PostgreSQL.
  - Designed to be easy to operate as an internal tool.

## 🚀 Development Setup
This project supports **two development setups**:
- **Docker**
- **Local / On‑premise (without Docker)**

## 🐳 Option A: Docker

If you have Docker and Docker Compose installed, you can start everything with:

```bash
# Install dependencies (for local development / editor support)
npm install
# Start containers
docker compose up -d --build
```

## 💻 Option B: Local / On‑premise Setup (without Docker)

Use this option if you want to run everything directly on your local machine.

```bash
# Install dependencies
npm install

cp .example.env .env

# Required .env Values
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
JWT_SECRET="xxxxxxx"

# Generate Prisma Client
npm run prisma:deploy
npm run prisma:generate

# Start the development server
npm run dev
```

### Access

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/docs


### Optional (Enable Full Features: JIRA / Slack)

To use all features of video reviews, configure the following variables in `.env`:

If you do not have a `.env` file yet, create one from `.example.env`.

```bash
cp .example.env .env
```

```bash
JIRA_API_TOKEN="JIRA-Token"
JIRA_PROJECT="GAMEDEV"
JIRA_ASSIGNEE_USER="assignn@gmail.com"
SLACK_API_TOKEN="xoxb-xxxxxToken"
SLACK_POST_CH="C00XXXXXX"
```

## 🛠 Build

Set the build output directory:
```bash
export VIDEO_REVIEW_BUILD_OUTPUT_DIR="dist"
npm run build
```

## 📄 License
This project is licensed under the **MIT License**.
