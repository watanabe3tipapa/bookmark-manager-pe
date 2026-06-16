# セットアップ

## 前提条件

- **Node.js** v20 以上
- **pnpm** v9 以上（`npm install -g pnpm`）

Node.js と pnpm がインストール済みであることを確認してください。

```bash
node -v   # v20.x 以上
pnpm -v   # v9.x 以上
```

## インストール

```bash
git clone https://github.com/watanabe3tipapa/bookmark-manager-pe.git
cd bookmark-manager-pe
pnpm install
```

`postinstall` スクリプトが自動的に `better-sqlite3` を Electron 向けにリビルドします。

## 起動

```bash
pnpm dev
```

開発サーバが起動し、Electron ウィンドウが開きます。

![メイン画面](../public/screenshots/main-layout.png)

## 画面構成

アプリケーションは 3 つのパネルで構成されています。

### サイドバー（左）

- **検索ボックス** – ブックマークのタイトル・URL・タグを横断検索
- **スマートビュー** – すべて / 未分類 / 最近追加 / 使われていない / よく見る
- **タグ一覧** – タグごとのフィルタ
- **デバイススコープ** – すべて / 共有のみ / デバイス固有のみ
- **同期コントロール** – GitHub 同期の設定・実行

### ブックマーク一覧（中央）

検索・フィルタ条件に合致したブックマークがリスト表示されます。URL・タイトル・タグ・最終更新日が表示されます。

### 詳細パネル（右）

ブックマークをクリックすると詳細パネルが開きます。タイトル・URL・メモの編集、タグの追加・削除、ブックマークの削除が行えます。

## データの保存場所

ブックマークはローカルの SQLite データベース（`userData/bookmarks.db`）に保存されます。データベースの場所は OS ごとに異なります。

- **macOS**: `~/Library/Application Support/bookmark-manager-pe/bookmarks.db`
- **Windows**: `%APPDATA%/bookmark-manager-pe/bookmarks.db`
- **Linux**: `~/.config/bookmark-manager-pe/bookmarks.db`
