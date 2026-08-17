import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDatabase, closeDatabase } from '../storage/db'
import * as repo from '../storage/repository'
import { parseBookmarkHtml, detectSourceFromHtml } from '../import'
import { IPC_CHANNELS } from '../shared/ipc'
import { startServer, stopServer, getServerStatus } from '../server'
import * as sync from '../sync'
import * as exploreConfig from '../explore/config'
import * as exploreClient from '../explore/client'
import type { ImportSource } from '../import'
import type { SyncConfig, ConflictEntry, ExploreResult, ExploreProgress } from '../types'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Electron] Failed to load: ${errorDescription} (${errorCode})`)
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`)
  })
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.BOOKMARK_LIST, () => {
    return repo.getAllBookmarks()
  })

  ipcMain.handle(IPC_CHANNELS.BOOKMARK_GET, (_event, id: string) => {
    return repo.getBookmark(id)
  })

  ipcMain.handle(IPC_CHANNELS.BOOKMARK_CREATE, (_event, data) => {
    return repo.createBookmark(data)
  })

  ipcMain.handle(IPC_CHANNELS.BOOKMARK_UPDATE, (_event, id: string, data) => {
    return repo.updateBookmark(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.BOOKMARK_DELETE, (_event, id: string) => {
    return repo.deleteBookmark(id)
  })

  ipcMain.handle(IPC_CHANNELS.BOOKMARK_SEARCH, (_event, query: string) => {
    return repo.searchBookmarks(query)
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_HTML, async () => {
    if (!mainWindow) return { imported: 0, skipped: 0, bookmarks: [] }

    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'Bookmarks HTML', extensions: ['html', 'htm'] },
      ],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { imported: 0, skipped: 0, bookmarks: [] }
    }

    const filePath = result.filePaths[0]
    const html = fs.readFileSync(filePath, 'utf-8')
    const source = detectSourceFromHtml(html)
    const bookmarks = parseBookmarkHtml(html, source)

    const imported = repo.importBookmarks(bookmarks)

    return { imported, skipped: bookmarks.length - imported, bookmarks }
  })

  ipcMain.handle(IPC_CHANNELS.TAG_LIST, () => {
    return repo.getAllTags()
  })

  ipcMain.handle(IPC_CHANNELS.TAG_ADD_BOOKMARK, (_event, bookmarkId: string, tagName: string) => {
    repo.addTagToBookmark(bookmarkId, tagName)
    return repo.getBookmark(bookmarkId)
  })

  ipcMain.handle(IPC_CHANNELS.TAG_REMOVE_BOOKMARK, (_event, bookmarkId: string, tagId: string) => {
    repo.removeTagFromBookmark(bookmarkId, tagId)
    return repo.getBookmark(bookmarkId)
  })

  ipcMain.handle(IPC_CHANNELS.DUPLICATE_FIND, () => {
    return repo.findDuplicates()
  })

  ipcMain.handle(IPC_CHANNELS.DUPLICATE_MERGE, (_event, targetId: string, sourceIds: string[]) => {
    return repo.mergeBookmarks(targetId, sourceIds)
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_STATUS, () => {
    if (!sync.hasConfig()) {
      return { connected: false, lastSync: null, message: '同期は未設定です' }
    }
    const config = sync.getConfig()
    return {
      connected: true,
      lastSync: null,
      message: '同期設定済み',
      config: config ? { owner: config.owner, repo: config.repo } : undefined,
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_SET_CONFIG, (_event, config: SyncConfig) => {
    sync.setConfig(config)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_CLEAR_CONFIG, () => {
    sync.clearConfig()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_TEST, async () => {
    const result = await sync.testConnection()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_RUN, async () => {
    const result = await sync.runSync()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.CONFLICT_RESOLVE, (_event, conflict: ConflictEntry, resolution: 'local' | 'remote' | 'merge' | 'skip') => {
    if (resolution === 'skip') return { success: true }
    if (!conflict.local && conflict.remote) {
      repo.createBookmark({
        url: conflict.remote.url,
        title: conflict.remote.title,
        notes: conflict.remote.notes,
        tags: conflict.remote.tags.map((t) => t.name),
        device_scoped: conflict.remote.device_scoped,
        source_device_id: conflict.remote.source_device_id ?? undefined,
      })
      return { success: true }
    }
    const chosen = resolution === 'local' ? conflict.local! : resolution === 'remote' ? conflict.remote! : conflict.autoMerge!
    repo.updateBookmark(conflict.local!.id, {
      title: chosen.title,
      url: chosen.url,
      notes: chosen.notes,
      visit_count: chosen.visit_count,
      device_scoped: chosen.device_scoped,
    })
    if (chosen.tags) {
      for (const tag of chosen.tags) {
        repo.addTagToBookmark(conflict.local!.id, tag.name)
      }
    }
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.CONFLICT_APPLY_MERGE, (_event, bookmarkId: string, data: { title?: string; url?: string; notes?: string; tags?: string[] }) => {
    if (data.tags) {
      for (const tag of data.tags) {
        repo.addTagToBookmark(bookmarkId, tag)
      }
    }
    repo.updateBookmark(bookmarkId, { title: data.title, url: data.url, notes: data.notes })
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.AI_SERVER_START, async () => {
    try {
      const result = await startServer()
      return { success: true, port: result.port }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to start' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.AI_SERVER_STOP, () => {
    stopServer()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.AI_SERVER_STATUS, () => {
    return getServerStatus()
  })

  ipcMain.handle(IPC_CHANNELS.EXPLORE_GET_CONFIG, () => {
    const config = exploreConfig.getConfig()
    return config ? { workerUrl: config.workerUrl } : null
  })

  ipcMain.handle(IPC_CHANNELS.EXPLORE_SET_CONFIG, (_event, config: { workerUrl: string }) => {
    exploreConfig.setConfig(config)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.EXPLORE_RUN, async (_event, bookmarkIds: string[]) => {
    const config = exploreConfig.getConfig()
    if (!config) {
      return { results: [], total: 0, message: '探索機能が未設定です' }
    }

    const bookmarks = repo.getBookmarksByIds(bookmarkIds)
    const total = bookmarks.length
    const results: ExploreResult[] = []
    const existingUrls = new Set(repo.getAllBookmarks().map((b) => b.url))

    let processed = 0
    let succeeded = 0
    let failed = 0

    const sendProgress = (done: boolean, currentUrl?: string) => {
      const progress: ExploreProgress = { processed, total, succeeded, failed, currentUrl, done }
      mainWindow?.webContents.send(IPC_CHANNELS.EXPLORE_PROGRESS, progress)
    }

    const CONCURRENCY = 3
    for (let i = 0; i < bookmarks.length; i += CONCURRENCY) {
      const batch = bookmarks.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.all(batch.map(async (bm) => {
        processed++
        sendProgress(false, bm.url)
        try {
          const raw = await exploreClient.exploreUrl(config.workerUrl, bm.url)
          const candidateLinks = exploreClient.filterCandidateLinks(raw.links || [], bm.url, existingUrls)
          return {
            ...exploreClient.toExploreResult(bm.id, raw),
            links: candidateLinks,
          }
        } catch (err) {
          return {
            bookmarkId: bm.id,
            url: bm.url,
            ok: false,
            errors: [err instanceof Error ? err.message : '探索エラー'],
          }
        }
      }))

      for (const r of batchResults) {
        results.push(r)
        if (r.ok) succeeded++
        else failed++
      }
    }

    sendProgress(true)
    return { results, total }
  })

  ipcMain.handle(IPC_CHANNELS.EXPLORE_APPLY, (_event, bookmarkId: string, data: { title?: string; summary?: string; tags?: string[]; thumbnail?: string }) => {
    let thumbnailPath = ''
    if (data.thumbnail) {
      try {
        thumbnailPath = exploreClient.saveThumbnail(bookmarkId, data.thumbnail)
      } catch (err) {
        console.error('[Explore] Failed to save thumbnail:', err)
      }
    }

    repo.updateBookmark(bookmarkId, {
      title: data.title,
      summary: data.summary,
      thumbnail_path: thumbnailPath || undefined,
    })

    if (data.tags && data.tags.length > 0) {
      for (const tag of data.tags) {
        repo.addTagToBookmark(bookmarkId, tag)
      }
    }

    return repo.getBookmark(bookmarkId)
  })

  ipcMain.handle(IPC_CHANNELS.EXPLORE_ADD_BOOKMARKS, (_event, items: { url: string; title?: string; tags?: string[] }[]) => {
    return { added: repo.createBookmarks(items) }
  })
}

app.whenReady().then(() => {
  initDatabase()
  exploreConfig.loadConfig()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
