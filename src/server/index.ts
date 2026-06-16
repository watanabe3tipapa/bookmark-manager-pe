import http from 'http'
import * as repo from '../storage/repository'
import { getDatabase } from '../storage/db'
import type { Bookmark } from '../types'

const PORT = 9876
let server: http.Server | null = null

function jsonResponse(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data, null, 2))
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function getTagCounts(): { name: string; count: number }[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT t.name, COUNT(bt.bookmark_id) as count
    FROM tags t
    JOIN bookmark_tags bt ON bt.tag_id = t.id
    JOIN bookmarks b ON b.id = bt.bookmark_id AND b.deleted = 0
    GROUP BY t.id ORDER BY count DESC
  `).all() as { name: string; count: number }[]
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === 'OPTIONS') {
    jsonResponse(res, 200, {})
    return
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const path = url.pathname

  try {
    switch (path) {
      case '/api/health': {
        jsonResponse(res, 200, { status: 'ok', port: PORT })
        break
      }

      case '/api/bookmarks': {
        const bookmarks = repo.getAllBookmarks()
        jsonResponse(res, 200, { count: bookmarks.length, bookmarks })
        break
      }

      case '/api/bookmarks/untagged': {
        const all = repo.getAllBookmarks()
        const untagged = all.filter((b) => b.tags.length === 0)
        jsonResponse(res, 200, { count: untagged.length, bookmarks: untagged })
        break
      }

      case '/api/bookmarks/top': {
        const all = repo.getAllBookmarks()
        const top = all.filter((b) => b.visit_count >= 3)
        jsonResponse(res, 200, { count: top.length, bookmarks: top })
        break
      }

      case '/api/bookmarks/duplicates': {
        const groups = repo.findDuplicates()
        jsonResponse(res, 200, { count: groups.length, groups })
        break
      }

      case '/api/tags': {
        const tags = repo.getAllTags()
        const tagCounts = getTagCounts()
        jsonResponse(res, 200, { tags, tagCounts })
        break
      }

      case '/api/bookmarks/suggest-tags': {
        if (req.method !== 'POST') {
          jsonResponse(res, 405, { error: 'Method not allowed' })
          return
        }
        const body = await parseBody(req) as { suggestions: { id: string; tags: string[] }[] }
        if (!body.suggestions || !Array.isArray(body.suggestions)) {
          jsonResponse(res, 400, { error: 'Missing suggestions array' })
          return
        }
        let applied = 0
        for (const s of body.suggestions) {
          if (!s.id || !s.tags) continue
          for (const tag of s.tags) {
            try {
              repo.addTagToBookmark(s.id, tag)
              applied++
            } catch { /* skip */ }
          }
        }
        jsonResponse(res, 200, { applied, total: body.suggestions.length })
        break
      }

      case '/api/bookmarks/merge': {
        if (req.method !== 'POST') {
          jsonResponse(res, 405, { error: 'Method not allowed' })
          return
        }
        const body = await parseBody(req) as { targetId: string; sourceIds: string[] }
        if (!body.targetId || !body.sourceIds) {
          jsonResponse(res, 400, { error: 'Missing targetId or sourceIds' })
          return
        }
        const result = repo.mergeBookmarks(body.targetId, body.sourceIds)
        jsonResponse(res, 200, { merged: result !== null, bookmark: result })
        break
      }

      case '/api/bookmarks/title-suggestions': {
        if (req.method !== 'POST') {
          jsonResponse(res, 405, { error: 'Method not allowed' })
          return
        }
        const body = await parseBody(req) as { titles: { id: string; title: string }[] }
        if (!body.titles || !Array.isArray(body.titles)) {
          jsonResponse(res, 400, { error: 'Missing titles array' })
          return
        }
        let updated = 0
        for (const t of body.titles) {
          if (!t.id || !t.title) continue
          const result = repo.updateBookmark(t.id, { title: t.title })
          if (result) updated++
        }
        jsonResponse(res, 200, { updated, total: body.titles.length })
        break
      }

      default:
        jsonResponse(res, 404, { error: 'Not found', path })
    }
  } catch (err) {
    console.error('[AI Server] Error:', err)
    jsonResponse(res, 500, { error: err instanceof Error ? err.message : 'Internal error' })
  }
}

export function startServer(): Promise<{ port: number }> {
  if (server) return Promise.resolve({ port: PORT })

  server = http.createServer(handleRequest)

  return new Promise((resolve, reject) => {
    server!.listen(PORT, '127.0.0.1', () => {
      console.log(`[AI Server] Running on http://127.0.0.1:${PORT}`)
      resolve({ port: PORT })
    })
    server!.on('error', (err) => {
      server = null
      console.error('[AI Server] Failed to start:', err)
      reject(err)
    })
  })
}

export function stopServer(): void {
  if (server) {
    server.close()
    server = null
    console.log('[AI Server] Stopped')
  }
}

export function getServerStatus(): { running: boolean; port: number } {
  return { running: server !== null, port: PORT }
}
