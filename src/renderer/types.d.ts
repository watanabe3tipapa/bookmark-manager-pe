import type { Bookmark, Tag, ImportResult, DuplicateGroup, SyncResult, ConflictEntry } from '../types'

export interface ElectronAPI {
  bookmark: {
    list: () => Promise<Bookmark[]>
    get: (id: string) => Promise<Bookmark | null>
    create: (data: {
      url: string
      title?: string
      notes?: string
      tags?: string[]
      device_scoped?: boolean
      source_device_id?: string
    }) => Promise<Bookmark>
    update: (id: string, data: {
      url?: string
      title?: string
      notes?: string
      visit_count?: number
      device_scoped?: boolean
    }) => Promise<Bookmark | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<Bookmark[]>
  }
  import: {
    html: () => Promise<ImportResult>
  }
  tag: {
    list: () => Promise<Tag[]>
    addToBookmark: (bookmarkId: string, tagName: string) => Promise<Bookmark>
    removeFromBookmark: (bookmarkId: string, tagId: string) => Promise<Bookmark>
  }
  duplicate: {
    find: () => Promise<DuplicateGroup[]>
    merge: (targetId: string, sourceIds: string[]) => Promise<Bookmark | null>
  }
  sync: {
    status: () => Promise<{ connected: boolean; lastSync: string | null; message: string; config?: { owner: string; repo: string } }>
    run: () => Promise<SyncResult>
    setConfig: (config: { token: string; owner: string; repo: string; deviceId: string; deviceName: string }) => Promise<{ success: boolean }>
    clearConfig: () => Promise<{ success: boolean }>
    test: () => Promise<{ success: boolean; message: string }>
  }
  conflict: {
    resolve: (conflict: ConflictEntry, resolution: 'local' | 'remote' | 'merge' | 'skip') => Promise<{ success: boolean }>
    applyMerge: (bookmarkId: string, data: { title?: string; url?: string; notes?: string; tags?: string[] }) => Promise<{ success: boolean }>
  }
  ai: {
    serverStart: () => Promise<{ success: boolean; port?: number; message?: string }>
    serverStop: () => Promise<{ success: boolean }>
    serverStatus: () => Promise<{ running: boolean; port: number }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
