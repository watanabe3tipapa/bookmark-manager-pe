import { GitHubSync } from './github'
import * as repo from '../storage/repository'
import type { SyncConfig, SyncResult, ConflictEntry } from '../types'

let currentSync: GitHubSync | null = null
let syncConfig: SyncConfig | null = null

export function getConfig(): SyncConfig | null {
  return syncConfig
}

export function setConfig(config: SyncConfig): void {
  syncConfig = config
  currentSync = new GitHubSync(config)
}

export function clearConfig(): void {
  syncConfig = null
  currentSync = null
}

export function hasConfig(): boolean {
  return syncConfig !== null && currentSync !== null
}

export function getSyncInstance(): GitHubSync | null {
  return currentSync
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  if (!currentSync) return { success: false, message: '同期が設定されていません' }

  try {
    const ok = await currentSync.testConnection()
    if (!ok) return { success: false, message: '認証に失敗しました。トークンを確認してください' }
    return { success: true, message: '接続OK' }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : '接続エラー' }
  }
}

export async function runSync(): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, conflicts: [], errors: [] }

  if (!currentSync || !syncConfig) {
    result.errors.push('同期が設定されていません')
    return result
  }

  try {
    const ok = await currentSync.testConnection()
    if (!ok) {
      result.errors.push('GitHub 認証エラー')
      return result
    }

    const localBookmarks = repo.getAllBookmarks()

    const remoteFiles = await currentSync.pullDeviceFiles()

    const localFiles = new Map<string, { id: string; name: string }>()
    localFiles.set(syncConfig.deviceId, { id: syncConfig.deviceId, name: syncConfig.deviceName })

    const remoteDevices = await currentSync.getDevices()
    for (const d of remoteDevices) {
      if (!localFiles.has(d.id)) localFiles.set(d.id, d)
    }

    let mergedBookmarks = localBookmarks

    if (remoteFiles.size > 0) {
      const mergeResult = currentSync.mergeDeviceFiles(localBookmarks, remoteFiles)
      mergedBookmarks = mergeResult.merged
      result.conflicts = mergeResult.conflicts
    }

    const currentIds = new Set(localBookmarks.map((b) => b.id))
    for (const bm of mergedBookmarks) {
      if (!currentIds.has(bm.id)) {
        repo.createBookmark({
          url: bm.url,
          title: bm.title,
          notes: bm.notes,
          tags: bm.tags.map((t) => t.name),
          device_scoped: bm.device_scoped,
          source_device_id: bm.source_device_id ?? undefined,
        })
        result.pulled++
      }
    }

    await currentSync.pushDeviceFile(repo.getAllBookmarks())

    const allDevices = Array.from(localFiles.values())
    await currentSync.updateMetadata(allDevices)

    const syncState = await currentSync.getSyncState()
    const deviceVersions: Record<string, number> = {}
    for (const [id] of remoteFiles) {
      deviceVersions[id] = (syncState?.deviceVersions?.[id] || 0) + 1
    }
    await currentSync.updateSyncState({
      lastSync: new Date().toISOString(),
      deviceVersions,
    })

    result.pushed = 1
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : '同期エラー')
  }

  return result
}

export function exportBookmarksAsDeviceJson(): string {
  const bookmarks = repo.getAllBookmarks()
  const config = syncConfig || { deviceId: 'local', deviceName: 'Local', owner: '', repo: '', token: '' }

  const deviceFile = {
    device_id: config.deviceId,
    device_name: config.deviceName,
    last_sync_iso8601: new Date().toISOString(),
    version: 1,
    bookmarks: bookmarks.map((bm) => ({
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
    })),
  }

  return JSON.stringify(deviceFile, null, 2)
}
