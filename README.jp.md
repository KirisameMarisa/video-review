# VideoReview

<img src="./documents/resources/video-review.png" controls="true"></video>

VideoReview は、動画をアップロードしてコメントしたり、お絵描きしたりしながら  
軽い SNS のようにレビューできる Web サービスです。  
チーム内レビューや映像制作、ゲーム開発などでのフィードバックに役立ちます。

## ✨ 主な特徴

- **動画アップロード & コメント**
  - 動画の任意の時間にコメントを追加できます。
  - キャンバスに直接お絵描きして視覚的なフィードバックも可能です。

- **外部サービス連携**
  - コメントを**JIRA のチケット**として登録できます。
  - コメント内容を**Slack に自動投稿**することもできます。

- **自動アップロードに対応**
  - 専用のアップロード API を用意しているため、  
    ツールや CI から**動画を送信**できます。

- **軽量 & シンプル構成**
  - Next.js / Prisma / PostgreSQL ベースの構成で、  
    社内ツールとしても扱いやすいように設計されています。

---

## 🚀 開発環境のセットアップ
Dockerとローカルの２つのセットアップをサポートしています


## 🐳 環境構築：Docker
前提：Docker、Docker Composeを事前にインストールしておいてください

```bash
# Install dependencies
npm install
# Start containers
docker compose up -d --build
```

## 💻 環境構築：ローカルに構築（オンプレ）

#### 必要なツール
* node v20
* postgreSQL

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

### 開発サーバーへアクセス

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/docs

---

### 任意 (VideoReviewの機能をフルで使いたい: JIRA / Slack)

VideoReview をフル機能で使いたい場合、.env に JIRA / Slack の環境変数を設定します

まだ .example.env から .env をコピーしていない場合は、以下を実行してください

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

## 🛠 ビルド

ビルドには出力先を指定するための環境変数が必要です。

```
export VIDEO_REVIEW_BUILD_OUTPUT_DIR="dist"
npm run build
```

---

## 🔧 `.env` で設定する値

最低限、以下があれば動作します：

```
DATABASE_URL=""
JWT_SECRET=""
```

これらを設定することで以下がが利用できます。
- ログイン  
- 動画メタデータやコメントの保存  
- JIRA 連携  

---

## 📄 ライセンス

このプロジェクトは **MIT License** のもとで公開されています。  
詳しくは [LICENSE](./LICENSE) をご確認ください。
