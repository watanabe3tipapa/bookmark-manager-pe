import { useState, useCallback, useEffect, useMemo } from 'react'
import { Sidebar } from './components/Sidebar'
import { BookmarkList } from './components/BookmarkList'
import { DetailPanel } from './components/DetailPanel'
import { DuplicatePanel } from './components/DuplicatePanel'
import { AIAssistantPanel } from './components/AIAssistantPanel'
import { ConflictModal } from './components/ConflictModal'
import { SyncSetupDialog } from './components/SyncSetupDialog'
import { useBookmarks } from './hooks/useBookmarks'
import { useSearch } from './hooks/useSearch'
import type { Bookmark, Tag, DuplicateGroup, SmartViewType, ScopeFilter, ConflictEntry } from '../types'

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

function computeSmartViewCounts(bookmarks: Bookmark[]): Record<SmartViewType, number> {
  const counts: Record<SmartViewType, number> = { all: bookmarks.length, untagged: 0, recent: 0, unused: 0, frequent: 0 }
  for (const bm of bookmarks) {
    if (bm.tags.length === 0) counts.untagged++
    if (bm.created_at >= sevenDaysAgo) counts.recent++
    if (bm.visit_count === 0 && bm.created_at < thirtyDaysAgo) counts.unused++
    if (bm.visit_count >= 5) counts.frequent++
  }
  return counts
}

function applyFilters(bookmarks: Bookmark[], smartView: SmartViewType, scope: ScopeFilter, tag: string | null): Bookmark[] {
  let filtered = bookmarks

  if (smartView === 'untagged') {
    filtered = filtered.filter((bm) => bm.tags.length === 0)
  } else if (smartView === 'recent') {
    filtered = filtered.filter((bm) => bm.created_at >= sevenDaysAgo)
  } else if (smartView === 'unused') {
    filtered = filtered.filter((bm) => bm.visit_count === 0 && bm.created_at < thirtyDaysAgo)
  } else if (smartView === 'frequent') {
    filtered = filtered.filter((bm) => bm.visit_count >= 5)
  }

  if (scope === 'shared') {
    filtered = filtered.filter((bm) => !bm.device_scoped)
  } else if (scope === 'device_scoped') {
    filtered = filtered.filter((bm) => bm.device_scoped)
  }

  if (tag) {
    filtered = filtered.filter((bm) => bm.tags.some((t) => t.name === tag))
  }

  return filtered
}

export default function App() {
  const {
    bookmarks,
    loading,
    error,
    refetch,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    addTag,
    removeTag,
  } = useBookmarks()

  const { query, results, searching, search, clearSearch } = useSearch()

  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailedBookmark, setDetailedBookmark] = useState<Bookmark | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [smartView, setSmartView] = useState<SmartViewType>('all')
  const [scope, setScope] = useState<ScopeFilter>('all')
  const [importing, setImporting] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [scanningDuplicates, setScanningDuplicates] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([])
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showSyncSetup, setShowSyncSetup] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ connected: boolean; lastSync: string | null; message: string; config?: { owner: string; repo: string } }>({
    connected: false, lastSync: null, message: '同期は未設定です',
  })

  const displayBookmarks = results ?? bookmarks

  const filteredBookmarks = useMemo(
    () => applyFilters(displayBookmarks, smartView, scope, selectedTag),
    [displayBookmarks, smartView, scope, selectedTag],
  )

  const smartViewCounts = useMemo(() => computeSmartViewCounts(bookmarks), [bookmarks])

  useEffect(() => {
    window.electronAPI.tag.list().then(setAllTags)
  }, [bookmarks])

  const handleSmartView = useCallback((view: SmartViewType) => {
    setSmartView(view)
    setSelectedTag(null)
  }, [])

  const handleSelectTag = useCallback((tagName: string | null) => {
    setSelectedTag(tagName)
    if (tagName) setSmartView('all')
  }, [])

  const handleSelect = useCallback((id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(multi ? prev : [])
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    const bm = filteredBookmarks.find((b) => b.id === id)
    if (bm) setDetailedBookmark(bm)
  }, [filteredBookmarks])

  const handleOpen = useCallback((url: string) => {
    window.open(url, '_blank')
  }, [])

  const handleImport = useCallback(async () => {
    setImporting(true)
    try {
      const result = await window.electronAPI.import.html()
      if (result.imported > 0) refetch()
    } finally {
      setImporting(false)
    }
  }, [refetch])

  const handleCreateNew = useCallback(async () => {
    const url = prompt('URL を入力してください:')
    if (!url) return
    const title = prompt('タイトル (省略可):') || undefined
    const tags = prompt('タグ (カンマ区切り, 省略可):') || undefined
    await createBookmark({
      url,
      title,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    })
  }, [createBookmark])

  const handleSaveDetail = useCallback(async (id: string, data: { title?: string; url?: string; notes?: string; device_scoped?: boolean }) => {
    const updated = await updateBookmark(id, data)
    if (updated) setDetailedBookmark(updated)
  }, [updateBookmark])

  const handleDelete = useCallback(async (id: string) => {
    await deleteBookmark(id)
    setDetailedBookmark(null)
  }, [deleteBookmark])

  const handleAddTag = useCallback(async (bookmarkId: string, tagName: string) => {
    const updated = await addTag(bookmarkId, tagName)
    if (updated && detailedBookmark?.id === bookmarkId) setDetailedBookmark(updated)
  }, [addTag, detailedBookmark])

  const handleRemoveTag = useCallback(async (bookmarkId: string, tagId: string) => {
    const updated = await removeTag(bookmarkId, tagId)
    if (updated && detailedBookmark?.id === bookmarkId) setDetailedBookmark(updated)
  }, [removeTag, detailedBookmark])

  const handleCloseDetail = useCallback(() => setDetailedBookmark(null), [])

  const handleFindDuplicates = useCallback(async () => {
    setScanningDuplicates(true)
    try {
      const groups = await window.electronAPI.duplicate.find()
      setDuplicateGroups(groups)
      setShowDuplicates(true)
    } finally {
      setScanningDuplicates(false)
    }
  }, [])

  const handleMerge = useCallback(async (targetId: string, sourceIds: string[]) => {
    await window.electronAPI.duplicate.merge(targetId, sourceIds)
    refetch()
    const groups = await window.electronAPI.duplicate.find()
    setDuplicateGroups(groups)
  }, [refetch])

  const handleCloseDuplicates = useCallback(() => setShowDuplicates(false), [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const statusBefore = await window.electronAPI.sync.status()
      if (!statusBefore.connected) {
        setShowSyncSetup(true)
        return
      }
      const result = await window.electronAPI.sync.run()
      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts)
        setShowConflictModal(true)
      }
      if (result.errors.length > 0) {
        setSyncStatus((prev) => ({ ...prev, message: result.errors.join(', ') }))
      } else {
        setSyncStatus((prev) => ({ ...prev, message: `同期完了: +${result.pulled} 取込, +${result.pushed} 送信` }))
      }
      refetch()
    } finally {
      setSyncing(false)
    }
  }, [refetch])

  const handleResolveConflict = useCallback(async (conflict: ConflictEntry, resolution: 'local' | 'remote' | 'merge' | 'skip') => {
    await window.electronAPI.conflict.resolve(conflict, resolution)
    conflict.resolved = resolution
    refetch()
  }, [refetch])

  const handleFinishConflict = useCallback(() => {
    setShowConflictModal(false)
    setConflicts([])
  }, [])

  const handleSyncSetup = useCallback(async (config: { token: string; owner: string; repo: string; deviceId: string; deviceName: string }) => {
    await window.electronAPI.sync.setConfig(config)
    const result = await window.electronAPI.sync.test()
    if (result.success) {
      setSyncStatus({ connected: true, lastSync: null, message: '同期設定完了', config: { owner: config.owner, repo: config.repo } })
      setShowSyncSetup(false)
    } else {
      setSyncStatus((prev) => ({ ...prev, message: result.message }))
    }
  }, [])

  const handleSyncClearConfig = useCallback(async () => {
    await window.electronAPI.sync.clearConfig()
    setSyncStatus({ connected: false, lastSync: null, message: '同期は未設定です' })
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-500">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <button onClick={refetch} className="px-4 py-2 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">再試行</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-zinc-950">
      {showSyncSetup && (
        <SyncSetupDialog
          onSave={handleSyncSetup}
          onClose={() => setShowSyncSetup(false)}
        />
      )}
      <Sidebar
        searchQuery={query}
        onSearch={search}
        onClearSearch={clearSearch}
        searching={searching}
        tags={allTags}
        selectedTag={selectedTag}
        onSelectTag={handleSelectTag}
        smartView={smartView}
        onSmartView={handleSmartView}
        scope={scope}
        onScopeChange={setScope}
        counts={smartViewCounts}
        totalBookmarks={bookmarks.length}
        onSync={handleSync}
        onClearSyncConfig={handleSyncClearConfig}
        syncing={syncing}
        syncStatus={syncStatus}
      />
      <BookmarkList
        bookmarks={filteredBookmarks}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onOpen={handleOpen}
        onRemoveTag={handleRemoveTag}
        onImport={handleImport}
        onCreateNew={handleCreateNew}
        onFindDuplicates={handleFindDuplicates}
        onOpenAIAssistant={() => setShowAIAssistant(true)}
        scanningDuplicates={scanningDuplicates}
        importing={importing}
      />
      {showDuplicates && (
        <DuplicatePanel groups={duplicateGroups} onClose={handleCloseDuplicates} onMerge={handleMerge} />
      )}
      {!showDuplicates && showAIAssistant && (
        <AIAssistantPanel onClose={() => setShowAIAssistant(false)} />
      )}
      {!showDuplicates && !showAIAssistant && detailedBookmark && (
        <DetailPanel
          bookmark={detailedBookmark}
          allTags={allTags}
          onClose={handleCloseDetail}
          onSave={handleSaveDetail}
          onDelete={handleDelete}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onOpen={handleOpen}
        />
      )}

      {showConflictModal && (
        <ConflictModal
          conflicts={conflicts}
          onResolve={handleResolveConflict}
          onApplyMerge={async () => {}}
          onClose={() => setShowConflictModal(false)}
          onFinish={handleFinishConflict}
        />
      )}
    </div>
  )
}
