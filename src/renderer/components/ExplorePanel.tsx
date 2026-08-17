import { Globe, X, Play, Settings, Check, Link2, Image as ImageIcon, Loader2, ScanSearch } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ExploreSetupDialog } from './ExploreSetupDialog'
import type { Bookmark as BookmarkType, ExploreResult, ExploreProgress } from '../../types'

interface ExplorePanelProps {
  filteredBookmarks: BookmarkType[]
  allBookmarks: BookmarkType[]
  onClose: () => void
  onChanged: () => void
}

type TargetMode = 'untagged' | 'all' | 'filtered'

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function ExplorePanel({ filteredBookmarks, allBookmarks, onClose, onChanged }: ExplorePanelProps) {
  const [config, setConfig] = useState<{ workerUrl: string } | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [targetMode, setTargetMode] = useState<TargetMode>('untagged')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<ExploreProgress | null>(null)
  const [results, setResults] = useState<ExploreResult[]>([])
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [addedLinks, setAddedLinks] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.explore.getConfig().then(setConfig)
  }, [])

  useEffect(() => {
    return window.electronAPI.explore.onProgress(setProgress)
  }, [])

  const targets = useMemo(() => {
    if (targetMode === 'untagged') return allBookmarks.filter((b) => b.tags.length === 0)
    if (targetMode === 'all') return allBookmarks
    return filteredBookmarks
  }, [targetMode, allBookmarks, filteredBookmarks])

  const discoveredLinks = useMemo(() => {
    const seen = new Set<string>()
    const links: { url: string }[] = []
    for (const r of results) {
      for (const url of r.links ?? []) {
        if (seen.has(url)) continue
        seen.add(url)
        links.push({ url })
      }
    }
    return links
  }, [results])

  const handleSaveConfig = useCallback(async (newConfig: { workerUrl: string }) => {
    await window.electronAPI.explore.setConfig(newConfig)
    setConfig(newConfig)
    setShowSetup(false)
  }, [])

  const handleRun = useCallback(async () => {
    if (targets.length === 0) {
      setMessage('対象のブックマークがありません')
      return
    }
    setRunning(true)
    setResults([])
    setAppliedIds(new Set())
    setAddedLinks(null)
    setMessage(null)
    try {
      const result = await window.electronAPI.explore.run(targets.map((b) => b.id))
      setResults(result.results)
      if (result.message) setMessage(result.message)
    } finally {
      setRunning(false)
    }
  }, [targets])

  const handleApply = useCallback(async (result: ExploreResult) => {
    if (result.bookmarkId === '') return
    await window.electronAPI.explore.apply(result.bookmarkId, {
      title: result.title,
      summary: result.summary,
      tags: result.tags,
      thumbnail: result.thumbnail,
    })
    setAppliedIds((prev) => new Set(prev).add(result.bookmarkId))
    onChanged()
  }, [onChanged])

  const handleAddLinks = useCallback(async () => {
    if (discoveredLinks.length === 0) return
    const result = await window.electronAPI.explore.addBookmarks(
      discoveredLinks.map((l) => ({ url: l.url })),
    )
    setAddedLinks(result.added)
    onChanged()
  }, [discoveredLinks, onChanged])

  const percent = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0

  return (
    <div className="w-[460px] border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-zinc-300">探索 (Kitesurf)</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!config ? (
          <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50 text-center space-y-2">
            <ScanSearch className="w-6 h-6 text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-500">
              Cloudflare Worker の URL を設定してください。
              <br />
              <code className="text-emerald-500/80">workers/explore</code> をデプロイして URL を取得します。
            </p>
            <button
              onClick={() => setShowSetup(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              設定
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs text-zinc-400 truncate">{config.workerUrl}</span>
              </div>
              <button
                onClick={() => setShowSetup(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              >
                <Settings className="w-3 h-3" />
                変更
              </button>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">対象</label>
              <div className="space-y-1">
                {([
                  { key: 'untagged', label: `未分類のみ (${allBookmarks.filter((b) => b.tags.length === 0).length}件)` },
                  { key: 'all', label: `全件 (${allBookmarks.length}件)` },
                  { key: 'filtered', label: `現在の絞り込み (${filteredBookmarks.length}件)` },
                ] as { key: TargetMode; label: string }[]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTargetMode(t.key)}
                    className={`
                      flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors
                      ${targetMode === t.key
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'}
                    `}
                  >
                    <span className={`w-3 h-3 rounded-full border ${targetMode === t.key ? 'border-emerald-400 bg-emerald-400/30' : 'border-zinc-600'}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRun}
              disabled={running || targets.length === 0}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs rounded-lg bg-emerald-600 text-white
                         hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {running ? '探索中...' : `探索を開始 (${targets.length}件)`}
            </button>

            {running && progress && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 truncate">{progress.currentUrl}</span>
                  <span className="text-zinc-400 shrink-0">
                    {progress.processed}/{progress.total} · 成功 {progress.succeeded} · 失敗 {progress.failed}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )}

            {message && (
              <p className="text-xs text-amber-400 px-1">{message}</p>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs text-zinc-400 font-medium">結果</h4>
                  <span className="text-[10px] text-zinc-600">
                    成功 {results.filter((r) => r.ok).length} / 失敗 {results.filter((r) => !r.ok).length}
                  </span>
                </div>
                {results.map((r) => (
                  <div key={r.bookmarkId || r.url} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-2.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">
                          {r.title || safeHostname(r.url)}
                        </p>
                        <p className="text-[10px] text-zinc-600 truncate">{r.url}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {r.ok ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">成功</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">失敗</span>
                        )}
                        {appliedIds.has(r.bookmarkId) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">適用済</span>
                        )}
                      </div>
                    </div>

                    {r.ok && r.summary && (
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{r.summary}</p>
                    )}

                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.thumbnail && (
                      <img
                        src={r.thumbnail}
                        alt=""
                        className="w-full h-32 object-cover rounded-md border border-zinc-700/50"
                      />
                    )}

                    {r.links && r.links.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Link2 className="w-3 h-3" />
                        リンク {r.links.length}件 発見
                      </div>
                    )}

                    {r.errors.length > 0 && (
                      <p className="text-[10px] text-zinc-600 leading-relaxed">
                        {r.errors.join(' / ')}
                      </p>
                    )}

                    {r.ok && !appliedIds.has(r.bookmarkId) && (
                      <button
                        onClick={() => handleApply(r)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        適用
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!running && discoveredLinks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs text-zinc-400 font-medium">発見したリンク ({discoveredLinks.length})</h4>
                  {addedLinks !== null && (
                    <span className="text-[10px] text-emerald-400">{addedLinks}件 追加</span>
                  )}
                </div>
                <button
                  onClick={handleAddLinks}
                  disabled={addedLinks !== null}
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs rounded-lg bg-zinc-800 text-zinc-300
                             hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  未登録のリンクをブックマークに追加
                </button>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-zinc-800 p-2">
                  {discoveredLinks.map((l) => (
                    <div key={l.url} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{l.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showSetup && (
        <ExploreSetupDialog onSave={handleSaveConfig} onClose={() => setShowSetup(false)} />
      )}
    </div>
  )
}