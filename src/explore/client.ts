import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { ExploreResult } from '../types'

export interface WorkerExploreResponse {
  ok: boolean
  url: string
  title?: string
  summary?: string
  tags?: string[]
  thumbnail?: string
  links?: string[]
  errors: string[]
}

const REQUEST_TIMEOUT_MS = 60_000

export async function exploreUrl(workerUrl: string, url: string): Promise<WorkerExploreResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${workerUrl}/explore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Worker returned HTTP ${res.status}`)
    }

    const data = (await res.json()) as WorkerExploreResponse
    return data
  } finally {
    clearTimeout(timer)
  }
}

export function thumbnailDir(): string {
  return path.join(app.getPath('userData'), 'thumbnails')
}

export function saveThumbnail(bookmarkId: string, base64DataUrl: string): string {
  const match = /^data:([^;]+);base64,(.+)$/.exec(base64DataUrl)
  if (!match) throw new Error('Invalid thumbnail data URL')

  const ext = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpg' : 'png'
  const dir = thumbnailDir()
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, `${bookmarkId}.${ext}`)
  fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'))
  return filePath
}

export function filterCandidateLinks(links: string[], sourceUrl: string, existingUrls: Set<string>, limit = 10): string[] {
  const sourceHost = safeHost(sourceUrl)
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of links) {
    let candidate: string
    try {
      const parsed = new URL(raw)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
      parsed.hash = ''
      candidate = parsed.toString()
    } catch {
      continue
    }

    if (candidate === sourceUrl) continue
    if (sourceHost && safeHost(candidate) === sourceHost) continue
    if (existingUrls.has(candidate)) continue
    if (seen.has(candidate)) continue

    seen.add(candidate)
    result.push(candidate)
    if (result.length >= limit) break
  }

  return result
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export function toExploreResult(bookmarkId: string, res: WorkerExploreResponse): ExploreResult {
  return {
    bookmarkId,
    url: res.url,
    ok: res.ok,
    title: res.title,
    summary: res.summary,
    tags: res.tags,
    thumbnail: res.thumbnail,
    links: res.links,
    errors: res.errors,
  }
}