import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './db'
import { normalizeUrl } from './normalize'
import type { Bookmark, Tag, Device, DuplicateGroup, SmartViewType, ScopeFilter } from '../types'

function rowToBookmark(row: Record<string, unknown>): Bookmark {
  return {
    id: row.id as string,
    url: row.url as string,
    title: row.title as string,
    notes: row.notes as string,
    visit_count: row.visit_count as number,
    device_scoped: !!(row.device_scoped as number),
    source_device_id: row.source_device_id as string | null,
    deleted: !!(row.deleted as number),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    tags: [],
  }
}

export function getAllBookmarks(): Bookmark[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM bookmarks WHERE deleted = 0 ORDER BY updated_at DESC').all() as Record<string, unknown>[]
  const bookmarks = rows.map(rowToBookmark)
  loadTagsForBookmarks(bookmarks)
  return bookmarks
}

function loadTagsForBookmark(bm: Bookmark): void {
  const db = getDatabase()
  bm.tags = db.prepare(`
    SELECT t.id, t.name FROM bookmark_tags bt
    JOIN tags t ON t.id = bt.tag_id
    WHERE bt.bookmark_id = ?
  `).all(bm.id) as Tag[]
}

function loadTagsForBookmarks(bookmarks: Bookmark[]): void {
  if (bookmarks.length === 0) return
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT bt.bookmark_id, t.id, t.name FROM bookmark_tags bt
    JOIN tags t ON t.id = bt.tag_id
    WHERE bt.bookmark_id = ?
  `)
  for (const bm of bookmarks) {
    bm.tags = stmt.all(bm.id) as Tag[]
  }
}

export function getFilteredBookmarks(smartView: SmartViewType, scope: ScopeFilter, tag: string | null): Bookmark[] {
  const db = getDatabase()

  let sql = 'SELECT * FROM bookmarks WHERE deleted = 0'
  const params: unknown[] = []

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  switch (smartView) {
    case 'untagged':
      sql += ' AND id NOT IN (SELECT DISTINCT bookmark_id FROM bookmark_tags)'
      break
    case 'recent':
      sql += ' AND created_at >= ?'
      params.push(sevenDaysAgo)
      break
    case 'unused':
      sql += ' AND visit_count = 0 AND created_at < ?'
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      params.push(thirtyDaysAgo)
      break
    case 'frequent':
      sql += ' AND visit_count >= 5'
      break
  }

  if (scope === 'shared') {
    sql += ' AND device_scoped = 0'
  } else if (scope === 'device_scoped') {
    sql += ' AND device_scoped = 1'
  }

  sql += ' ORDER BY updated_at DESC'

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
  const bookmarks = rows.map(rowToBookmark)
  loadTagsForBookmarks(bookmarks)

  if (tag) {
    return bookmarks.filter((bm) => bm.tags.some((t) => t.name === tag))
  }

  return bookmarks
}

export function getBookmark(id: string): Bookmark | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM bookmarks WHERE id = ? AND deleted = 0').get(id) as Record<string, unknown> | undefined
  if (!row) return null

  const bm = rowToBookmark(row)
  bm.tags = db.prepare(`
    SELECT t.id, t.name FROM bookmark_tags bt
    JOIN tags t ON t.id = bt.tag_id
    WHERE bt.bookmark_id = ?
  `).all(bm.id) as Tag[]

  return bm
}

export function createBookmark(data: {
  url: string
  title?: string
  notes?: string
  tags?: string[]
  device_scoped?: boolean
  source_device_id?: string
}): Bookmark {
  const db = getDatabase()
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO bookmarks (id, url, title, notes, device_scoped, source_device_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.url,
    data.title || '',
    data.notes || '',
    data.device_scoped ? 1 : 0,
    data.source_device_id || null,
    now,
    now
  )

  if (data.tags && data.tags.length > 0) {
    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)')
    const linkTag = db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)')

    for (const tagName of data.tags) {
      const tagId = uuidv4()
      insertTag.run(tagId, tagName)
      linkTag.run(id, tagId)
    }
  }

  return getBookmark(id)!
}

export function updateBookmark(id: string, data: {
  url?: string
  title?: string
  notes?: string
  visit_count?: number
  device_scoped?: boolean
}): Bookmark | null {
  const db = getDatabase()
  const existing = getBookmark(id)
  if (!existing) return null

  const fields: string[] = []
  const values: unknown[] = []

  if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url) }
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
  if (data.visit_count !== undefined) { fields.push('visit_count = ?'); values.push(data.visit_count) }
  if (data.device_scoped !== undefined) { fields.push('device_scoped = ?'); values.push(data.device_scoped ? 1 : 0) }

  if (fields.length > 0) {
    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    db.prepare(`UPDATE bookmarks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  return getBookmark(id)
}

export function deleteBookmark(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('UPDATE bookmarks SET deleted = 1, updated_at = ? WHERE id = ? AND deleted = 0')
    .run(new Date().toISOString(), id)
  return result.changes > 0
}

export function searchBookmarks(query: string): Bookmark[] {
  const db = getDatabase()
  const sanitized = query.replace(/['"]/g, '')

  const rows = db.prepare(`
    SELECT b.* FROM bookmarks b
    JOIN bookmarks_fts fts ON fts.rowid = b.rowid
    WHERE bookmarks_fts MATCH ? AND b.deleted = 0
    ORDER BY rank
    LIMIT 200
  `).all(sanitized) as Record<string, unknown>[]

  const bookmarks = rows.map(rowToBookmark)

  const stmt = db.prepare(`
    SELECT t.id, t.name FROM bookmark_tags bt
    JOIN tags t ON t.id = bt.tag_id
    WHERE bt.bookmark_id = ?
  `)

  for (const bm of bookmarks) {
    bm.tags = stmt.all(bm.id) as Tag[]
  }

  return bookmarks
}

export function getAllTags(): Tag[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[]
}

export function addTagToBookmark(bookmarkId: string, tagName: string): void {
  const db = getDatabase()
  const existingTag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: string } | undefined

  let tagId: string
  if (existingTag) {
    tagId = existingTag.id
  } else {
    tagId = uuidv4()
    db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(tagId, tagName)
  }

  db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(bookmarkId, tagId)
  db.prepare('UPDATE bookmarks SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), bookmarkId)
}

export function removeTagFromBookmark(bookmarkId: string, tagId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?').run(bookmarkId, tagId)
  db.prepare('UPDATE bookmarks SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), bookmarkId)
}

export function upsertDevice(id: string, name: string): Device {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO devices (id, name) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name
  `).run(id, name)

  return db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as Device
}

export function getDevices(): Device[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM devices ORDER BY name').all() as Device[]
}

export function findDuplicates(): DuplicateGroup[] {
  const db = getDatabase()
  const all = getAllBookmarks()

  const groups = new Map<string, Bookmark[]>()

  for (const bm of all) {
    const key = normalizeUrl(bm.url)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(bm)
  }

  const result: DuplicateGroup[] = []
  for (const [key, bookmarks] of groups) {
    if (bookmarks.length > 1) {
      result.push({
        normalizedUrl: key,
        bookmarks,
        count: bookmarks.length,
      })
    }
  }

  result.sort((a, b) => b.count - a.count)

  return result
}

export function mergeBookmarks(targetId: string, sourceIds: string[]): Bookmark | null {
  const db = getDatabase()
  const target = getBookmark(targetId)
  if (!target) return null

  const sources = sourceIds
    .map((id) => getBookmark(id))
    .filter((b): b is Bookmark => b !== null && b.id !== targetId)

  if (sources.length === 0) return target

  const allTags = new Set(target.tags.map((t) => t.name))
  let maxVisitCount = target.visit_count
  let bestTitle = target.title
  let mergedNotes = target.notes

  for (const src of sources) {
    src.tags.forEach((t) => allTags.add(t.name))
    maxVisitCount = Math.max(maxVisitCount, src.visit_count)
    if (!bestTitle && src.title) bestTitle = src.title
    if (src.notes && !mergedNotes.includes(src.notes)) {
      mergedNotes = mergedNotes ? `${mergedNotes}\n---\n${src.notes}` : src.notes
    }
  }

  const now = new Date().toISOString()
  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE bookmarks SET title = ?, visit_count = ?, notes = ?, updated_at = ? WHERE id = ?
    `).run(bestTitle, maxVisitCount, mergedNotes, now, targetId)

    for (const tagName of allTags) {
      const existingTag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: string } | undefined
      let tagId: string
      if (existingTag) {
        tagId = existingTag.id
      } else {
        tagId = uuidv4()
        db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(tagId, tagName)
      }
      db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(targetId, tagId)
    }

    for (const src of sources) {
      db.prepare('UPDATE bookmarks SET deleted = 1, updated_at = ? WHERE id = ?').run(now, src.id)
      db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').run(src.id)
    }
  })

  transaction()

  return getBookmark(targetId)
}

export function importBookmarks(items: { url: string; title?: string; tags?: string[]; source_device_id?: string }[]): number {
  let count = 0
  for (const item of items) {
    const existing = getDatabase().prepare('SELECT id FROM bookmarks WHERE url = ? AND deleted = 0').get(item.url)
    if (existing) continue

    createBookmark({
      url: item.url,
      title: item.title,
      tags: item.tags,
      source_device_id: item.source_device_id,
    })
    count++
  }
  return count
}
