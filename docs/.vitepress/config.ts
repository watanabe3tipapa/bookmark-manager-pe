import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ja-JP',
  title: 'Bookmark Manager PE',
  description: 'マルチブラウザ・マルチデバイス ブックマーク管理ツール',
  base: '/bookmark-manager-pe/',
  themeConfig: {
    nav: [
      { text: 'ガイド', link: '/guide/getting-started' },
      { text: 'GitHub', link: 'https://github.com/watanabe3tipapa/bookmark-manager-pe' },
    ],
    sidebar: [
      {
        text: 'はじめに',
        items: [
          { text: 'セットアップ', link: '/guide/getting-started' },
          { text: 'ブックマークのインポート', link: '/guide/import' },
        ],
      },
      {
        text: '機能',
        items: [
          { text: '重複検出・マージ', link: '/guide/duplicate' },
          { text: 'スマートビュー', link: '/guide/smart-views' },
          { text: 'AIアシスタント', link: '/guide/ai-assistant' },
          { text: 'GitHub同期', link: '/guide/sync' },
        ],
      },
      {
        text: 'その他',
        items: [
          { text: 'FAQ', link: '/guide/faq' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/watanabe3tipapa/bookmark-manager-pe' }],
    footer: {
      message: 'MIT License',
    },
  },
})
