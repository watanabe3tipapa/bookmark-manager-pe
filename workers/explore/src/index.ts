interface Env {
  BROWSER: {
    quickAction: (action: string, params: Record<string, unknown>) => Promise<Response>
  }
}

export interface ExploreResponse {
  ok: boolean
  url: string
  title?: string
  summary?: string
  tags?: string[]
  thumbnail?: string
  links?: string[]
  errors: string[]
}

const PROMPT = `このページの内容を分析し、以下の3項目を抽出してください。
- title: ページの実タイトル（簡潔に、サイト名や装飾を除く）
- summary: このページの内容を日本語で2〜3文で要約
- tags: このページを表すタグを3〜5個（日本語または英単語）

JSONスキーマに従って返してください。`

const JSON_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['title', 'summary', 'tags'],
  },
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

async function readJsonBody(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { result: text }
  }
}

function unwrapResult(body: unknown): unknown {
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    if ('result' in obj) {
      const result = obj.result
      if (result && typeof result === 'object') {
        const step = (result as Record<string, unknown>).step
        if (step && typeof step === 'object') {
          const info = (step as Record<string, unknown>).info
          if (info && typeof info === 'object') {
            const apiResult = (info as Record<string, unknown>).api_result
            if (apiResult !== undefined) return apiResult
          }
        }
      }
      return result
    }
  }
  return body
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function extractStructured(env: Env, url: string): Promise<{ title?: string; summary?: string; tags?: string[] }> {
  const res = await env.BROWSER.quickAction('json', {
    url,
    browser: 'kitesurf',
    prompt: PROMPT,
    response_format: JSON_SCHEMA,
    gotoOptions: { waitUntil: 'networkidle2' },
  })
  const body = await readJsonBody(res)
  const result = unwrapResult(body) as Record<string, unknown>
  return {
    title: typeof result?.title === 'string' ? result.title : undefined,
    summary: typeof result?.summary === 'string' ? result.summary : undefined,
    tags: Array.isArray(result?.tags) ? result.tags.filter((t): t is string => typeof t === 'string') : [],
  }
}

async function extractScreenshot(env: Env, url: string): Promise<string | undefined> {
  const res = await env.BROWSER.quickAction('screenshot', { url, browser: 'kitesurf' })
  const contentType = res.headers.get('content-type') || 'image/png'
  const buffer = await res.arrayBuffer()
  if (buffer.byteLength === 0) return undefined
  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`
}

async function extractLinks(env: Env, url: string): Promise<string[]> {
  const res = await env.BROWSER.quickAction('links', {
    url,
    browser: 'kitesurf',
    visibleLinksOnly: true,
  })
  const body = await readJsonBody(res)
  const links = unwrapResult(body)
  if (!Array.isArray(links)) return []
  return links.filter((l): l is string => typeof l === 'string' && /^https?:\/\//.test(l))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return json({ status: 'ok' })
    }

    if (url.pathname === '/explore' && request.method === 'POST') {
      let body: { url?: string }
      try {
        body = (await request.json()) as { url?: string }
      } catch {
        return json({ ok: false, url: '', errors: ['Invalid JSON body'] }, 400)
      }

      const target = body?.url?.trim()
      if (!target) {
        return json({ ok: false, url: '', errors: ['Missing url'] }, 400)
      }

      const [structured, screenshot, links] = await Promise.allSettled([
        extractStructured(env, target),
        extractScreenshot(env, target),
        extractLinks(env, target),
      ])

      const result: ExploreResponse = { ok: true, url: target, errors: [] }

      if (structured.status === 'fulfilled') {
        result.title = structured.value.title
        result.summary = structured.value.summary
        result.tags = structured.value.tags
      } else {
        result.errors.push(`json: ${structured.reason instanceof Error ? structured.reason.message : 'extraction failed'}`)
      }

      if (screenshot.status === 'fulfilled') {
        result.thumbnail = screenshot.value
      } else {
        result.errors.push(`screenshot: ${screenshot.reason instanceof Error ? screenshot.reason.message : 'capture failed'}`)
      }

      if (links.status === 'fulfilled') {
        result.links = links.value
      } else {
        result.errors.push(`links: ${links.reason instanceof Error ? links.reason.message : 'extraction failed'}`)
      }

      result.ok = result.errors.length < 3

      return json(result)
    }

    return json({ ok: false, url: '', errors: ['Not found'] }, 404)
  },
}