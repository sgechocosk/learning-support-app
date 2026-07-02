# アプリの名前 (App Name)

iPhoneのホーム画面に追加してネイティブアプリのように利用できる、SPAベースの個人用Webアプリです。

## 特徴

- **PWA (Progressive Web App) 対応:** ホーム画面に追加することで、フルスクリーンかつネイティブライクな操作感を実現。
- **SPA (Single Page Application):** Vite + React Routerによるシームレスな画面遷移。
- **自動ログイン:** Supabase Authを利用し、一度ログインすれば次回以降は自動でユーザー情報を復元します。

## 技術スタック

- **Frontend:** React (18+), TypeScript
- **Build Tool:** Vite
- **Routing:** React Router (v6)
- **PWA Plugin:** vite-plugin-pwa
- **Backend / Auth:** Supabase (PostgreSQL)

## 環境構築の手順

リポジトリをクローンした後、以下の手順でローカル環境を立ち上げます。

### 1. パッケージのインストール

npm install

### 2. 環境変数の設定
プロジェクトのルートディレクトリに .env.local ファイルを作成し、Supabaseのダッシュボード（Project Settings > API）から取得したURLとAnon Keyを設定してください。

### .env.local
VITE_SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

### 3. 開発サーバーの起動
npm run dev
ブラウザで http://localhost:5173 にアクセスして動作を確認します。

## デプロイについて
このプロジェクトは静的サイトとしてビルドされます。Vercel, Netlify, Cloudflare Pagesなどのホスティングサービスにデプロイし、各サービスの環境変数設定画面で .env.local と同じキー（VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY）を設定してください。

Witten By Gemini