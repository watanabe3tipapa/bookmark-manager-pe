import { Octokit } from '@octokit/rest'
import { v4 as uuidv4 } from 'uuid'
import type { Bookmark, SyncConfig } from '../types'

interface DeviceFile {
  device_id: string
  device_name: string
  last_sync_iso8601: string
  version: number
  bookmarks: DeviceBookmark[]
}

interface DeviceBookmark {
  id: string
  url: string
  title: string
  notes: string
  visit_count: number
  device_scoped: boolean
  source_device_id: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

function bookmarkToDevice(bm: Bookmark): DeviceBookmark {
  return {
    id: bm.id,
    url: bm.url,
    title: bm.title,
    notes: bm.notes,
    visit_count: bm.visit_count,
    device_scoped: bm.device_scoped,
    source_device_id: bm.source_device_id,
    tags: bm.tags.map((t) => t.name),
    created_at: bm.created_at,
    updated_at: bm.updated_at,
  }
}

function deviceToBookmark(db: DeviceBookmark): Bookmark {
  return {
    id: db.id,
    url: db.url,
    title: db.title,
    notes: db.notes,
    visit_count: db.visit_count,
    device_scoped: db.device_scoped,
    source_device_id: db.source_device_id,
    deleted: false,
    tags: db.tags.map((name) => ({ id: uuidv4(), name })),
    created_at: db.created_at,
    updated_at: db.updated_at,
  }
}

export class GitHubSync {
  private octokit: Octokit
  private config: SyncConfig
  private devicePath: string
  private metadataPath = 'metadata/devices.json'
  private syncStatePath = 'metadata/sync-state.json'

  constructor(config: SyncConfig) {
    this.config = config
    this.octokit = new Octokit({ auth: config.token })
    this.devicePath = `bookmarks/device-${config.deviceId}.json`
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated()
      return true
    } catch {
      return false
    }
  }

  private async getContent(path: string): Promise<{ content: string; sha: string } | null> {
    try {
      const res = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
      })
      if ('content' in res.data) {
        const content = Buffer.from(res.data.content, 'base64').toString('utf-8')
        return { content, sha: res.data.sha }
      }
      return null
    } catch (err: unknown) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  }

  private async putContent(path: string, content: string, message: string, sha?: string): Promise<void> {
    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      sha,
    })
  }

  async pullDeviceFiles(): Promise<Map<string, DeviceFile>> {
    const files = new Map<string, DeviceFile>()

    let items: { name: string; path: string; type: string }[]
    try {
      const res = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: 'bookmarks',
      })
      items = res.data as unknown as { name: string; path: string; type: string }[]
    } catch {
      return files
    }

    for (const item of items) {
      if (item.type !== 'file' || !item.name.endsWith('.json')) continue
      const deviceId = item.name.replace(/^device-/, '').replace(/\.json$/, '')
      const result = await this.getContent(item.path)
      if (result) {
        try {
          const deviceFile = JSON.parse(result.content) as DeviceFile
          files.set(deviceId, deviceFile)
        } catch { /* skip corrupt files */ }
      }
    }

    return files
  }

  async pushDeviceFile(bookmarks: Bookmark[]): Promise<void> {
    const existing = await this.getContent(this.devicePath)

    const deviceFile: DeviceFile = {
      device_id: this.config.deviceId,
      device_name: this.config.deviceName,
      last_sync_iso8601: new Date().toISOString(),
      version: existing ? 0 : 1,
      bookmarks: bookmarks.map(bookmarkToDevice),
    }

    if (existing) {
      const prev = JSON.parse(existing.content) as DeviceFile
      deviceFile.version = prev.version + 1
    }

    await this.putContent(
      this.devicePath,
      JSON.stringify(deviceFile, null, 2),
      `sync: update device-${this.config.deviceId} (v${deviceFile.version})`,
      existing?.sha,
    )
  }

  async updateMetadata(devices: { id: string; name: string }[]): Promise<void> {
    const existing = await this.getContent(this.metadataPath)
    await this.putContent(
      this.metadataPath,
      JSON.stringify({ devices, updated_at: new Date().toISOString() }, null, 2),
      'sync: update devices metadata',
      existing?.sha,
    )
  }

  async updateSyncState(state: { lastSync: string; deviceVersions: Record<string, number> }): Promise<void> {
    const existing = await this.getContent(this.syncStatePath)
    await this.putContent(
      this.syncStatePath,
      JSON.stringify(state, null, 2),
      'sync: update sync state',
      existing?.sha,
    )
  }

  async getSyncState(): Promise<{ lastSync: string; deviceVersions: Record<string, number> } | null> {
    const result = await this.getContent(this.syncStatePath)
    if (!result) return null
    try {
      return JSON.parse(result.content)
    } catch {
      return null
    }
  }

  async getDevices(): Promise<{ id: string; name: string }[]> {
    const result = await this.getContent(this.metadataPath)
    if (!result) return [{ id: this.config.deviceId, name: this.config.deviceName }]
    try {
      const data = JSON.parse(result.content)
      return data.devices || []
    } catch {
      return [{ id: this.config.deviceId, name: this.config.deviceName }]
    }
  }

  mergeDeviceFiles(local: Bookmark[], remoteFiles: Map<string, DeviceFile>): {
    merged: Bookmark[]
    conflicts: import('../types').ConflictEntry[]
  } {
    const conflicts: import('../types').ConflictEntry[] = []
    const mergedMap = new Map<string, Bookmark>()

    for (const bm of local) {
      mergedMap.set(bm.id, bm)
    }

    for (const [, deviceFile] of remoteFiles) {
      for (const db of deviceFile.bookmarks) {
        const remoteBm = deviceToBookmark(db)

        if (mergedMap.has(remoteBm.id)) {
          const localBm = mergedMap.get(remoteBm.id)!
          const localTime = new Date(localBm.updated_at).getTime()
          const remoteTime = new Date(remoteBm.updated_at).getTime()

          if (localTime !== remoteTime) {
            const autoMerge: Bookmark = {
              id: remoteBm.id,
              url: remoteBm.url || localBm.url,
              title: remoteBm.title && remoteBm.title.length >= localBm.title.length ? remoteBm.title : localBm.title,
              notes: localBm.notes || remoteBm.notes,
              visit_count: Math.max(localBm.visit_count, remoteBm.visit_count),
              device_scoped: localBm.device_scoped && remoteBm.device_scoped,
              source_device_id: remoteTime > localTime ? remoteBm.source_device_id : localBm.source_device_id,
              deleted: localBm.deleted || remoteBm.deleted,
              tags: [],
              created_at: localBm.created_at < remoteBm.created_at ? localBm.created_at : remoteBm.created_at,
              updated_at: remoteTime > localTime ? remoteBm.updated_at : localBm.updated_at,
            }
            const allTagNames = new Set([...localBm.tags.map((t) => t.name), ...remoteBm.tags.map((t) => t.name)])
            autoMerge.tags = Array.from(allTagNames).map((name) => ({ id: uuidv4(), name }))
            autoMerge.visit_count = localBm.visit_count + remoteBm.visit_count

            conflicts.push({
              local: localBm,
              remote: remoteBm,
              bookmarkId: remoteBm.id,
              url: remoteBm.url,
              autoMerge,
              resolved: null,
            })

            mergedMap.set(remoteBm.id, localTime >= remoteTime ? localBm : remoteBm)
          }
        } else {
          const existingUrl = Array.from(mergedMap.values()).find(
            (b) => b.url === remoteBm.url && !b.deleted,
          )
          if (existingUrl && existingUrl.id !== remoteBm.id) {
            conflicts.push({
              local: existingUrl,
              remote: remoteBm,
              bookmarkId: remoteBm.id,
              url: remoteBm.url,
              autoMerge: remoteBm,
              resolved: null,
            })
          }
          mergedMap.set(remoteBm.id, remoteBm)
        }
      }
    }

    return { merged: Array.from(mergedMap.values()).filter((b) => !b.deleted), conflicts }
  }
}
