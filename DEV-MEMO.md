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
- `main-layout.png` のみ実画面をキャプチャ（ただし JPEG 形式圧縮で 39KB）
- 他の5枚はテキストプレースホルダ（要差し替え）
- 差し替え方法: アプリを起動し、各パネルを表示 → `screencapture -w` でウインドウをクリックしてキャプチャ → 同名で上書き保存

### CI/CD 構築ログ

#### 大前提: GitHub Pages の方式には2種類ある

| 方式 | 設定 (Settings → Pages → Source) | ワークフローで使うアクション |
|---|---|---|
| **Deploy from branch** | `Deploy from branch` → `gh-pages` / `root` | `peaceiris/actions-gh-pages` (gh-pages ブランチに直接 push) |
| **GitHub Actions** | `GitHub Actions` | `actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages` (Pages API 経由でデプロイ) |

両者は互換性がなく、設定とワークフローを一致させる必要がある。

#### 1回目: `contents: read` → peaceiris の push が 403
```
remote: Permission to watanabe3tipapa/bookmark-manager-pe.git denied to github-actions[bot].
```
原因: `permissions.contents` が `read` だったため、peaceiris が gh-pages ブランチに push できなかった。
修正: `contents: write` に変更

#### 2回目: `peaceiris/actions-gh-pages` 方式で gh-pages ブランチ作成成功 → しかし Pages に反映されず
ワークフローは成功し `gh-pages` ブランチも作成されたが、`https://watanabe3tipapa.github.io/bookmark-manager-pe/` が 404 に。
原因: **ユーザーが GitHub Settings → Pages → Source を「GitHub Actions」に設定していた**ため、ブランチからのデプロイ方式（peaceiris）が認識されなかった。設定とワークフローが不一致だった。
気付くまでに `pages API` の `status: null` や `gh api repos/.../pages/deployments` の 404 で時間を要した。

#### 3回目 (最終): `actions/deploy-pages` ネイティブ方式に切り替え
`peaceiris/actions-gh-pages` を削除し、以下の公式アクションに置き換え:
1. `actions/configure-pages@v5` — Pages 設定をワークフローから構成
2. `actions/upload-pages-artifact@v3` — ビルド成果物をアップロード
3. `actions/deploy-pages@v4` — Pages API 経由でデプロイ

`permissions` も `contents: read` に戻して問題なし（ブランチへの直接書き込みが不要になったため）。

**結果: ✅ success (1m1s), HTTP 200 確認済み**
URL: https://watanabe3tipapa.github.io/bookmark-manager-pe/

#### 教訓
- GitHub Pages の Source 設定（`Deploy from branch` vs `GitHub Actions`）とワークフローの方式は必ず一致させる
- `peaceiris/actions-gh-pages` は旧来の「ブランチからデプロイ」方式向け
- 「GitHub Actions」方式を選んだ場合は `actions/deploy-pages` を使う
- `gh api repos/{owner}/{repo}/pages` の `status` フィールドで Pages の状態を確認できる

## Phase 7: 探索機能（Kitesurf / Cloudflare Browser Run） ✅

### 概要
Kitesurf（Cloudflare のステートレス AI 向けブラウザ）を使い、ブックマークに AI 要約・サムネイル・リンク発見を自動付与する機能。
Electron アプリ本体に AI モデルやブラウザを持たせず、**Cloudflare Worker としてデプロイ**して HTTP で呼び出す構成（方式A）。

### アーキテクチャ
```
Electron アプリ (main process)
  └─ fetch POST {worker}/explore  ← 同時実行3 (concurrency)
        └─ Cloudflare Worker (workers/explore)
             └─ env.BROWSER.quickAction(action, { url, browser: 'kitesurf', ... })
                  ├─ action: json       → AI要約 (Workers AI Llama-3.3-70B)
                  ├─ action: screenshot → サムネイル (base64 data URL)
                  └─ action: links      → リンク発見 (visibleLinksOnly: true)
```

### 要点
- **Kitesurf**: Cloudflare Worker 上で動くステートレスブラウザ。Browser Run Quick Actions と互換で `browser: 'kitesurf'` パラメータを付ける。Worker バインディング経由（`env.BROWSER`）のため **API トークン不要**。
- **json アクション**: `prompt` + `response_format`（JSONスキーマ）で `{title, summary, tags}` を抽出。summary は日本語2〜3文。
- **screenshot アクション**: PNG base64 を返す → Electron 側で `userData/thumbnails/{bookmarkId}.png` に保存（DB はパスのみ保持で肥大化回避）。
- **links アクション**: `visibleLinksOnly: true` で画面上のリンクを抽出 → ソース自身/同一ホスト/既存ブックマーク/重複を除外し最大10件の候補に。
- **一括処理**: 対象 = 未分類のみ（デフォルト）/ 全件 / 現在の絞り込み。`explore:progress` イベントで進捗通知。1件ごとにエラー隔離（Kitesurf は動画・WebGL・ログイン必須・ボット対策サイトで失敗 → スキップ）。
- **適用**: 結果確認後に個別「適用」で title/summary/tags/サムネイルを DB へ反映。発見リンクは「一括追加」で未登録分のみ createBookmarks。
- **設定**: アプリには Worker URL のみ保存（`userData/explore-config.json`）。Cloudflare の認証情報は Worker 側に隠蔽されるためシークレット不要。

### 追加ファイル
- `workers/explore/wrangler.json` — browser binding (BROWSER), remote: true, compatibility_date 2026-03-24
- `workers/explore/package.json` — wrangler ^4.20.0 / @cloudflare/workers-types
- `workers/explore/tsconfig.json` — ES2022
- `workers/explore/src/index.ts` — Worker 本体（POST /explore, GET /health, CORS）
- `src/explore/config.ts` — Worker URL の永続化
- `src/explore/client.ts` — Worker 呼び出し / サムネイル保存 / リンクフィルタ
- `src/renderer/components/ExplorePanel.tsx` — 探索パネル UI
- `src/renderer/components/ExploreSetupDialog.tsx` — Worker URL 設定ダイアログ

### DB マイグレーション
```sql
ALTER TABLE bookmarks ADD COLUMN summary TEXT DEFAULT '';
ALTER TABLE bookmarks ADD COLUMN thumbnail_path TEXT DEFAULT '';
```
`PRAGMA table_info(bookmarks)` で列有無を確認してから `ALTER TABLE`（既存DBにも安全）。

### 追加 IPC
| チャンネル | 説明 |
|---|---|
| `explore:getConfig` / `explore:setConfig` | Worker URL の取得・保存 |
| `explore:run` | 一括探索実行（`{results, total}` を返す） |
| `explore:apply` | 探索結果を1件適用（title/summary/tags/サムネイル） |
| `explore:addBookmarks` | 発見リンクを一括追加（未登録のみ） |
| `explore:progress` | 進捗イベント（main → renderer） |

### デプロイ手順
```bash
cd workers/explore
pnpm install
npx wrangler deploy
```
生成された `*.workers.dev` URL をアプリの「探索」パネル → 「設定」に入力（`/health` で接続テスト可能）。

### 注意点
- Kitesurf は beta で無料枠制限あり（エラー時は該当ブックマークのみ失敗として継続）。
- サムネイル保存時に既存ファイルは上書き（同じ bookmarkId）。
- sync（Phase 5）の device JSON にも summary / thumbnail_path を載せて他デバイスへ伝搬。

## Phase 8: ランディングページ（LP） ✅

### 構成
GitHub Pages サイトのトップページを LP（マーケティング用ランディングページ）に変更し、VitePress の使い方ガイドを `/docs/` 配下へ移動した。

```
サイトのルート (/bookmark-manager-pe/)
├── index.html          # 静的 LP（lp/index.html、ビルド不要の自己完結 HTML+CSS）
├── assets/             # LP の画像（lp/assets/main-layout.png）
└── docs/               # VitePress ガイド（base を /bookmark-manager-pe/docs/ に変更）
```

### 変更点
- **追加**: `lp/index.html` — ヒーロー / 機能6カード / 使い方3ステップ / スクリーンショット / CTA / フッター。ダークテーマ（アプリと同系の zinc + emerald）。リンクは `/bookmark-manager-pe/` 絶対パス。
- **追加**: `lp/assets/main-layout.png`（`docs/public/screenshots/main-layout.png` からコピー）
- **変更**: `docs/.vitepress/config.ts` の `base` を `/bookmark-manager-pe/docs/` に変更
- **変更**: `.github/workflows/deploy-docs.yml` を「LP & Docs」に拡張
  - Trigger: `docs/**` / `lp/**` / `.github/workflows/**`
  - ビルド: `pnpm docs:build` 後に `dist/` へ LP をコピー → `dist/docs/` へ VitePress 出力をコピー → 結合 `dist/` を `actions/upload-pages-artifact` でデプロイ

### 検証
- `pnpm docs:build` 成功（新 base でも asset パスは `/bookmark-manager-pe/docs/...` に正しく解決）
- 結合ディレクトリの構成をローカルで再現し、LP がルート・docs が `/docs/` に配置されることを確認

### 注意
- 既存の docs URL（例: `/bookmark-manager-pe/guide/...`）は `/bookmark-manager-pe/docs/guide/...` に変わった
- LP は純粋な静的ファイルのためビルドステップ不要。`wrangler` や Node 依存はない
