import type { BookmarkImport } from '../types'
import { parseChromeHtml } from './chrome'
import { parseFirefoxHtml } from './firefox'

export type ImportSource = 'chrome' | 'firefox' | 'safari'

export function parseBookmarkHtml(html: string, source: ImportSource): BookmarkImport[] {
  switch (source) {
    case 'chrome':
      return parseChromeHtml(html)
    case 'firefox':
      return parseFirefoxHtml(html)
    case 'safari':
      return parseChromeHtml(html)
    default:
      throw new Error(`Unknown import source: ${source}`)
  }
}

export function detectSourceFromHtml(html: string): ImportSource {
  if (html.includes('<!DOCTYPE NETSCAPE-Bookmark')) {
    if (html.includes('PERSONAL_TOOLBAR_FOLDER')) return 'chrome'
    if (html.includes('UNFILED_BOOKMARKS_FOLDER')) return 'firefox'
  }
  if (html.includes('Safari')) return 'safari'
  return 'chrome'
}
