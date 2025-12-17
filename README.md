# VideoReview

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

### 1. Install dependencies
```
npm install
```

### 2. Create environment configuration
```
cp .example.env .env
```

### 3. Generate Prisma Client
```
npm run prisma:deploy
npm run prisma:generate
```

### 4. Start the development server
```
npm run dev
```

### 5. Access

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/docs

## 🛠 Build

Set the build output directory:
```
export VIDEO_REVIEW_BUILD_OUTPUT_DIR="dist"
npm run build
```

## 🔧 Required .env Values
```
DATABASE_URL=""
JWT_SECRET=""
```

## 📄 License
This project is licensed under the **MIT License**.
