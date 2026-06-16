import type { BookmarkImport } from '../types'

export function parseChromeHtml(html: string): BookmarkImport[] {
  const results: BookmarkImport[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  function walk(node: Element, folders: string[]) {
    const children = node.children
    for (let i = 0; i < children.length; i++) {
      const el = children[i]
      if (el.tagName === 'DT' && el.firstElementChild) {
        const child = el.firstElementChild
        if (child.tagName === 'H3') {
          const folderName = child.textContent?.trim() || 'Untitled'
          walk(el, [...folders, folderName])
        } else if (child.tagName === 'A') {
          const anchor = child as HTMLAnchorElement
          results.push({
            url: anchor.href,
            title: anchor.textContent?.trim() || anchor.href,
            folders: folders.length > 0 ? [...folders] : undefined,
          })
        }
      }
    }
  }

  const body = doc.querySelector('body')
  if (body) {
    walk(body, [])
  }

  return results
}
