# DEV-MEMO

## Phase 1: プロジェクトセットアップ

### 環境
- Package manager: pnpm
- Desktop: Electron + Vite
- Frontend: React + TypeScript + TailwindCSS + Radix UI
- Storage: SQLite (better-sqlite3 + FTS5)
- Sync: GitHub REST API (octokit) — 後段

### フォルダ構造
```
bookmark-manager-pe/
├── src/
│   ├── main/          # Electron メインプロセス
│   ├── preload/       # プリロードスクリプト
│   ├── renderer/      # React UI
│   │   ├── components/
│   │   ├── hooks/
│   │   └── styles/
│   ├── storage/       # SQLite (db, schema, repository)
│   ├── import/        # ブラウザ別HTMLパーサー
│   ├── sync/          # GitHub同期（後段）
│   ├── types/         # 型定義
│   └── shared/        # IPCチャンネル定義
```

### Phase 1 タスク一覧（実装順）
1. Vite + Electron + React + TypeScript + TailwindCSS + Radix 導入 ✅
2. SQLite 初期化・マイグレーション + repository.ts ✅
3. Electron メインプロセス + IPC ハンドラ（CRUD + 検索） ✅
4. 3パネルレイアウト + サイドバー + 検索ボックス ✅
5. ブックマーク一覧 + 行コンポーネント ✅
6. 詳細パネル（編集フォーム） ✅
7. Chrome/Firefox HTML インポートパーサー + インポートUI ✅
8. 結合テスト・動作確認 ✅

### DB スキーマ
```sql
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  visit_count INTEGER DEFAULT 0,
  device_scoped INTEGER DEFAULT 0,
  source_device_id TEXT,
  deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE bookmark_tags (
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (bookmark_id, tag_id)
);
CREATE TABLE devices (id TEXT PRIMARY KEY, name TEXT NOT NULL, last_sync TEXT);
CREATE VIRTUAL TABLE bookmarks_fts USING fts5(url, title, notes, content='bookmarks', content_rowid='rowid');
```

### 画面構成
- 左: サイドバー（検索, タグ一覧, 同期ステータス）
- 中央: ブックマーク一覧（ツールバー + 行リスト）
- 右: 詳細パネル（スライドオーバー）

### package.json scripts
- `pnpm dev` — Vite + Electron 開発サーバー起動
- `pnpm lint` — TypeScript 型チェック
- `pnpm rebuild` — better-sqlite3 を Electron 向けにリビルド

### 環境構築手順（初回）
1. `pnpm install`（依存関係インストール）
2. `pnpm rebuild`（ネイティブモジュールを Electron 向けにビルド）
3. `pnpm dev`（開発サーバー起動）

## Phase 2: 重複検出・マージUI ✅

### 追加ファイル
- `src/storage/normalize.ts` — URL正規化（トラッキングパラメータ除去、ソート、プロトコル統一）
- `src/renderer/components/DuplicatePanel.tsx` — 重複グループ一覧 + マージUI

### 追加 IPC
- `duplicate:find` — 全ブックマークから重複グループを検出
- `duplicate:merge` — 指定IDをターゲットに他を統合（マージ後ソースは論理削除）

### マージルール
- タイトル: 最長の非空を優先
- タグ: ユニオン（両方のタグを保持）
- 閲覧数: 合算
- メモ: 連結（改行区切り）
- ソース: 論理削除（deleted=1）

## Phase 3: スマートビュー + デバイススコープ切替UI ✅

### 追加したもの
- **スマートビュー**（Sidebar上部）
  - 未分類（タグなしブックマーク）
  - 最近追加（7日以内）
  - 使われてない（30日以上未使用 + visit_count=0）
  - よく見る（visit_count >= 5）
  - 各ビューの件数をリアルタイム表示
- **スコープフィルタ**（Sidebar下部）
  - すべて / 共有のみ / デバイス固有のみ
- **デバイススコープ切替**（詳細パネル）
  - 共有 / デバイス固有 の切り替えボタン
  - 一覧行にデバイス固有アイコンとツールチップ

### フィルタの優先順位
1. スマートビュー（all / untagged / recent / unused / frequent）
2. スコープ（all / shared / device_scoped）
3. タグ（選択時はスマートビューを all にリセット）
4. 検索（最優先、検索結果をベースに上記フィルタを適用）

## Phase 4: Zed AI アシスタント連携 ✅

### 追加ファイル
- `src/server/index.ts` — ローカル HTTP API サーバー
- `src/shared/prompts.ts` — Zed 向けプロンプトテンプレート集
- `src/renderer/components/AIAssistantPanel.tsx` — AI連携パネル UI

### API エンドポイント（http://localhost:9876）
| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/health` | GET | ヘルスチェック |
| `/api/bookmarks` | GET | 全ブックマーク取得 |
| `/api/bookmarks/untagged` | GET | 未分類ブックマーク |
| `/api/bookmarks/top` | GET | 高頻度ブックマーク |
| `/api/bookmarks/duplicates` | GET | 重複グループ一覧 |
| `/api/tags` | GET | タグ一覧 + 件数 |
| `/api/bookmarks/suggest-tags` | POST | AI提案タグを適用 |
| `/api/bookmarks/title-suggestions` | POST | AI提案タイトルを適用 |
| `/api/bookmarks/merge` | POST | AI提案マージを実行 |

### 使い方
1. 一覧ツールバーの **「AI」** ボタンをクリック
2. 右パネルで **「API Server」** を起動
3. プロンプトを選択して **コピー**
4. Zed で AI アシスタントを開きペースト
5. AI が生成した JSON を確認、API で適用

### プロンプト集
- タグ分類を提案
- タイトルを正規化
- 重複マージを提案
- コレクション分析

## Phase 5: GitHub同期 + コンフリクト解決モーダル ✅

### 追加ファイル
- `src/sync/github.ts` — GitHub API クライアント（octokit）
- `src/sync/index.ts` — 同期オーケストレーター
- `src/renderer/components/ConflictModal.tsx` — コンフリクト解決モーダル
- `src/renderer/components/SyncSetupDialog.tsx` — 同期設定ダイアログ

### GitHub 同期ワークフロー
1. **設定**: PAT + リポジトリ情報を設定（Sidebar下部の「同期」→ダイアログ）
2. **プル**: GitHub から他デバイスの `device-{id}.json` を取得
3. **マージ**: ローカルとリモートを統合（コンフリクト検出）
4. **プッシュ**: 自デバイスのブックマークを GitHub に送信
5. **コンフリクト解決**: 差分がある場合はモーダルで 1件ずつ解決

### コンフリクト解決UI
- サイド・バイ・サイド比較（ローカル vs リモート）
- 自動マージプレビュー表示
- 選択肢: ローカル保持 / リモート採用 / 自動マージ / スキップ
- 全解決後に「完了」ボタン

### リポジトリ構造
```
repo/
├── bookmarks/
│   └── device-{id}.json    # デバイス別ブックマーク
├── metadata/
│   ├── devices.json         # 登録デバイス一覧
│   └── sync-state.json      # 同期状態
```

### API エンドポイント（IPC）
| チャンネル | 説明 |
|---|---|
| `sync:setConfig` | 同期設定を保存 |
| `sync:clearConfig` | 同期設定を解除 |
| `sync:test` | GitHub 接続テスト |
| `sync:run` | 同期実行 |
| `conflict:resolve` | コンフリクト解決 |
| `conflict:applyMerge` | カスタムマージ適用 |

## Phase 6: VitePress チュートリアルサイト（GitHub Pages） ✅

### 追加ファイル
- `docs/.vitepress/config.ts` — VitePress 設定（base: `/bookmark-manager-pe/`）
- `docs/.vitepress/theme/index.ts` — テーマ（デフォルト）
- `docs/index.md` — トップページ（機能カード4つ）
- `docs/guide/getting-started.md` — セットアップ・画面構成
- `docs/guide/import.md` — ブラウザ別インポート手順
- `docs/guide/duplicate.md` — 重複検出・マージ
- `docs/guide/smart-views.md` — スマートビュー・デバイススコープ
- `docs/guide/ai-assistant.md` — AIアシスタント（Zed連携）
- `docs/guide/sync.md` — GitHub同期・コンフリクト解決
- `docs/guide/faq.md` — FAQ
- `.github/workflows/deploy-docs.yml` — GitHub Actions（`docs/` 変更時に自動デプロイ）
- `docs/public/screenshots/main-layout.png` — メイン画面スクリーンショット
- `docs/public/screenshots/import.png` — インポート画面（プレースホルダ）
- `docs/public/screenshots/duplicate.png` — 重複検出画面（プレースホルダ）
- `docs/public/screenshots/ai-assistant.png` — AIアシスタントパネル（プレースホルダ）
- `docs/public/screenshots/sync-conflict.png` — コンフリクト解決モーダル（プレースホルダ）
- `docs/public/screenshots/setup.png` — 同期設定ダイアログ（プレースホルダ）

### package.json 追加スクリプト
- `pnpm docs:dev` — VitePress 開発サーバ起動
- `pnpm docs:build` — VitePress 静的ビルド
- `pnpm docs:preview` — ビルド結果をローカルプレビュー

### デプロイ構成
- **Trigger**: `main` ブランチの `docs/` 配下に push されたとき（手動起動も可）
- **Build**: VitePress (`docs/.vitepress/dist` に出力)
- **Publish**: `peaceiris/actions-gh-pages` → `gh-pages` ブランチ
- **URL**: `https://watanabe3tipapa.github.io/bookmark-manager-pe/`

### 📸 スクリーンショット注意
- `main-layout.png` のみ実画面をキャプチャ
- 他の5枚はテキストプレースホルダ（要差し替え）
- 差し替え方法: アプリを起動し、各パネルを表示 → `screencapture -w` でウインドウをクリックしてキャプチャ → 同名で上書き保存
