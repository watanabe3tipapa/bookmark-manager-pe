# Bookmark Manager PE

概要

Bookmark Manager PE はリポジトリの package.json に記載された説明によると、マルチブラウザ・マルチデバイス対応のブックマーク管理ツールです。デスクトップアプリケーションとしての構成要素（Electron、React、SQLite 等）を含む TypeScript ベースのプロジェクトです。リポジトリの説明は「調整中」となっています。

ホームページ

- https://watanabe3tipapa.github.io/bookmark-manager-pe/

主な内容／技術スタック（リポジトリから確認できる事実）

- 言語: TypeScript
- UI: React（react, react-dom）
- デスクトップ実行環境: Electron（electron, electron-builder）
- 組み込みデータベース: better-sqlite3
- ビルド・開発ツール: Vite（vite）, TypeScript（typescript）
- スタイル関連: Tailwind CSS（tailwindcss）, PostCSS（postcss, autoprefixer）
- ドキュメント: VitePress（vitepress）
- その他ライブラリ: uuid, @octokit/rest 等

リポジトリの構成（ルートに存在する主なファイル・ディレクトリ）

- .github
- .gitignore
- DEV-MEMO.md
- USAGE.md
- docs/
- lp/
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- postcss.config.mjs
- src/
- tailwind.config.mjs
- tsconfig.json
- tsconfig.node.json
- vite.config.ts
- workers/

利用・開発に関する確認できる情報

package.json に定義されているスクリプト（そのまま記載します）：

- dev: vite
- build: tsc && vite build
- preview: vite preview
- electron:dev: vite
- electron:build: vite build && electron-builder
- lint: tsc --noEmit
- docs:dev: vitepress dev docs
- docs:build: vitepress build docs
- docs:preview: vitepress preview docs
- postinstall: electron-rebuild -f -w better-sqlite3
- rebuild: electron-rebuild -f -w better-sqlite3

（上記は package.json に記載されたスクリプトそのものです。これらの実行方法や前提条件などの手順はリポジトリ内に明記がないため、本 README では詳細手順を記載していません。）

ビルド設定（package.json の build フィールド、事実として含まれる値）

- appId: pe.bookmark-manager
- productName: Bookmark Manager PE
- files: dist/**/*, dist-electron/**/*
- 出力ディレクトリ: release
- mac ターゲット: dmg

開発・保守状態

- リポジトリの説明フィールドは「調整中」となっています。
- package.json に private: true が設定されています（公開パッケージとしては設定されていません）。

ライセンス

- リポジトリ内にライセンス情報が明示されているファイルは確認できませんでした。ライセンス情報は本 README には含めていません。

補足（注意事項）

- 本 README はリポジトリのルートにある package.json および存在ファイル一覧から確認できる事実に基づいて作成しています。実行手順や依存関係のインストール方法、動作環境などの詳細はリポジトリ内のドキュメント（docs、USAGE.md など）を参照してください。
- 外部公開に不適切な情報や未確認の設定は追加していません。
