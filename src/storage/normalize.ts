const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid',
  'msclkid', 'twclid', 'sc_campaign', 'sc_channel', 'sc_content',
  'sc_medium', 'sc_outcome', 'sc_geo', 'sc_country',
  'ref', 'source', 'si',
]

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw)

    url.hash = ''

    const params = new URLSearchParams(url.search)
    for (const key of TRACKING_PARAMS) {
      params.delete(key)
    }
    const sortedKeys = Array.from(params.keys()).sort()
    const cleaned = new URLSearchParams()
    for (const key of sortedKeys) {
      cleaned.set(key, params.get(key)!)
    }
    url.search = cleaned.toString()

    if (url.pathname.endsWith('/') && url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }

    if (url.protocol === 'https:' || url.protocol === 'http:') {
      url.protocol = 'https:'
    }

    return url.toString()
  } catch {
    return raw.trim().toLowerCase()
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
