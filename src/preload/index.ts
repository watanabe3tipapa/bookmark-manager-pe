import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'

const api = {
  bookmark: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARK_LIST),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARK_GET, id),
    create: (data: { url: string; title?: string; notes?: string; tags?: string[]; device_scoped?: boolean; source_device_id?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.BOOKMARK_CREATE, data),
    update: (id: string, data: { url?: string; title?: string; notes?: string; visit_count?: number; device_scoped?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.BOOKMARK_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARK_DELETE, id),
    search: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARK_SEARCH, query),
  },
  import: {
    html: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_HTML),
  },
  tag: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TAG_LIST),
    addToBookmark: (bookmarkId: string, tagName: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAG_ADD_BOOKMARK, bookmarkId, tagName),
    removeFromBookmark: (bookmarkId: string, tagId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAG_REMOVE_BOOKMARK, bookmarkId, tagId),
  },
  duplicate: {
    find: () => ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_FIND),
    merge: (targetId: string, sourceIds: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.DUPLICATE_MERGE, targetId, sourceIds),
  },
  sync: {
    status: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STATUS),
    run: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_RUN),
    setConfig: (config: { token: string; owner: string; repo: string; deviceId: string; deviceName: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_SET_CONFIG, config),
    clearConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_CLEAR_CONFIG),
    test: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_TEST),
  },
  conflict: {
    resolve: (conflict: { local: unknown; remote: unknown; bookmarkId: string; url: string; autoMerge: unknown }, resolution: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFLICT_RESOLVE, conflict, resolution),
    applyMerge: (bookmarkId: string, data: { title?: string; url?: string; notes?: string; tags?: string[] }) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFLICT_APPLY_MERGE, bookmarkId, data),
  },
  ai: {
    serverStart: () => ipcRenderer.invoke(IPC_CHANNELS.AI_SERVER_START),
    serverStop: () => ipcRenderer.invoke(IPC_CHANNELS.AI_SERVER_STOP),
    serverStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AI_SERVER_STATUS),
  },
  explore: {
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.EXPLORE_GET_CONFIG),
    setConfig: (config: { workerUrl: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPLORE_SET_CONFIG, config),
    run: (bookmarkIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.EXPLORE_RUN, bookmarkIds),
    apply: (bookmarkId: string, data: { title?: string; summary?: string; tags?: string[]; thumbnail?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPLORE_APPLY, bookmarkId, data),
    addBookmarks: (items: { url: string; title?: string; tags?: string[] }[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPLORE_ADD_BOOKMARKS, items),
    onProgress: (callback: (progress: { processed: number; total: number; succeeded: number; failed: number; currentUrl?: string; done: boolean }) => void) => {
      const listener = (_event: unknown, progress: unknown) => callback(progress as { processed: number; total: number; succeeded: number; failed: number; currentUrl?: string; done: boolean })
      ipcRenderer.on(IPC_CHANNELS.EXPLORE_PROGRESS, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EXPLORE_PROGRESS, listener)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
