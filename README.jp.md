# VideoReview

<video src="./documents/resources/video-review.mp4" controls="true"></video>

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

### 1. 依存パッケージのインストール

```
npm install
```

### 2. 環境変数ファイルの作成

```
cp .example.env .env
```

### 3. Prisma のコード生成

```
npm run prisma:deploy
npm run prisma:generate
```

### 4. 開発サーバーの起動

```
npm run dev
```

---

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
```

これらを設定することで以下がが利用できます。
- ログイン  
- 動画メタデータやコメントの保存  
- JIRA 連携  

---

## 📄 ライセンス

このプロジェクトは **MIT License** のもとで公開されています。  
詳しくは [LICENSE](./LICENSE) をご確認ください。
