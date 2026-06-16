export interface Bookmark {
  id: string
  url: string
  title: string
  notes: string
  visit_count: number
  device_scoped: boolean
  source_device_id: string | null
  deleted: boolean
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface Tag {
  id: string
  name: string
}

export interface Device {
  id: string
  name: string
  last_sync: string | null
}

export interface ImportResult {
  imported: number
  skipped: number
  bookmarks: BookmarkImport[]
}

export interface BookmarkImport {
  url: string
  title: string
  tags?: string[]
  folders?: string[]
  source_device_id?: string
}

export interface DuplicateGroup {
  normalizedUrl: string
  bookmarks: Bookmark[]
  count: number
}

export interface SearchResult {
  bookmarks: Bookmark[]
  total: number
}

export type SmartViewType = 'all' | 'untagged' | 'recent' | 'unused' | 'frequent'

export type ScopeFilter = 'all' | 'shared' | 'device_scoped'

export interface FilterOptions {
  smartView: SmartViewType
  scope: ScopeFilter
  tag: string | null
}

export interface SyncConfig {
  token: string
  owner: string
  repo: string
  deviceId: string
  deviceName: string
}

export interface SyncStatus {
  connected: boolean
  lastSync: string | null
  message: string
  config?: { owner: string; repo: string }
}

export interface ConflictEntry {
  local: Bookmark | null
  remote: Bookmark | null
  bookmarkId: string
  url: string
  autoMerge: Bookmark | null
  resolved: 'local' | 'remote' | 'merge' | 'skip' | null
}

export interface SyncResult {
  pulled: number
  pushed: number
  conflicts: ConflictEntry[]
  errors: string[]
}
