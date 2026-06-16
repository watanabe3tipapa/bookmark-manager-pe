import { X, Merge, CopyPlus, ExternalLink, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { useState, useCallback } from 'react'
import type { DuplicateGroup, Bookmark } from '../../types'
import { TagChip } from './TagChip'

interface DuplicatePanelProps {
  groups: DuplicateGroup[]
  onClose: () => void
  onMerge: (targetId: string, sourceIds: string[]) => Promise<void>
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', year: 'numeric' })
}

function groupPreview(group: DuplicateGroup): { title: string; tags: Set<string>; visit_count: number } {
  let title = ''
  const tags = new Set<string>()
  let visit_count = 0
  for (const bm of group.bookmarks) {
    if (!title && bm.title) title = bm.title
    bm.tags.forEach((t) => tags.add(t.name))
    visit_count += bm.visit_count
  }
  return { title, tags, visit_count }
}

function DuplicateGroupCard({ group, onMerge }: { group: DuplicateGroup; onMerge: (targetId: string, sourceIds: string[]) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(group.bookmarks[0]?.id || '')
  const [merging, setMerging] = useState(false)
  const [merged, setMerged] = useState(false)
  const preview = groupPreview(group)
  const sourceIds = group.bookmarks.filter((b) => b.id !== selectedId).map((b) => b.id)

  const handleMerge = useCallback(async () => {
    if (merging || merged) return
    setMerging(true)
    try {
      await onMerge(selectedId, sourceIds)
      setMerged(true)
    } finally {
      setMerging(false)
    }
  }, [selectedId, sourceIds, merging, merged, onMerge])

  if (merged) {
    return (
      <div className="border border-green-500/20 rounded-lg p-3 bg-green-500/5">
        <div className="flex items-center gap-2 text-green-400 text-xs">
          <Check className="w-3.5 h-3.5" />
          マージ完了
        </div>
      </div>
    )
  }

  return (
    <div className="border border-zinc-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-zinc-800/50 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-200 truncate">{preview.title || '(タイトルなし)'}</span>
            <span className="text-xs text-zinc-500 shrink-0">{getDomain(group.normalizedUrl)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-amber-400 font-medium">{group.count}件の重複</span>
            <span className="text-xs text-zinc-600">統合後: {preview.visit_count} views</span>
            <div className="flex gap-1">
              {Array.from(preview.tags).slice(0, 3).map((t) => (
                <TagChip key={t} name={t} />
              ))}
              {preview.tags.size > 3 && (
                <span className="text-xs text-zinc-600">+{preview.tags.size - 3}</span>
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-700/50 px-3 py-2 space-y-2">
          <p className="text-xs text-zinc-600 truncate mb-1">{group.normalizedUrl}</p>

          {group.bookmarks.map((bm) => (
            <label
              key={bm.id}
              className={`
                flex items-start gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors
                ${bm.id === selectedId ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'hover:bg-zinc-800/50'}
              `}
            >
              <input
                type="radio"
                name={`merge-target-${group.normalizedUrl}`}
                checked={bm.id === selectedId}
                onChange={() => setSelectedId(bm.id)}
                className="mt-0.5 accent-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 truncate">{bm.title || '(タイトルなし)'}</span>
                  <span className="text-zinc-500 shrink-0">{bm.visit_count} views</span>
                </div>
                {bm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {bm.tags.map((t) => (
                      <span key={t.id} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">{t.name}</span>
                    ))}
                  </div>
                )}
                <span className="text-zinc-600">{formatDate(bm.created_at)}</span>
                {bm.source_device_id && <span className="ml-2 text-zinc-600">device: {bm.source_device_id}</span>}
              </div>
              <button
                onClick={(e) => { e.preventDefault(); window.open(bm.url, '_blank') }}
                className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </label>
          ))}

          <div className="pt-1 pb-0.5 flex items-center justify-between">
            <div className="text-xs text-zinc-600">
              保持: <span className="text-zinc-300">{group.bookmarks.find((b) => b.id === selectedId)?.title || '選択中'}</span>
              {sourceIds.length > 0 && (
                <span className="ml-1">+ {sourceIds.length}件を統合</span>
              )}
            </div>
            <button
              onClick={handleMerge}
              disabled={merging}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-blue-600 text-white
                         hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Merge className="w-3 h-3" />
              {merging ? 'マージ中...' : 'マージ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DuplicatePanel({ groups, onClose, onMerge }: DuplicatePanelProps) {
  const totalDuplicates = groups.reduce((sum, g) => sum + g.count, 0)

  return (
    <div className="w-96 border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <CopyPlus className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium text-zinc-300">重複検出</h3>
          <span className="text-xs text-amber-400 font-medium">{groups.length}グループ</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
            <CopyPlus className="w-8 h-8" />
            <p className="text-sm">重複は見つかりませんでした</p>
          </div>
        ) : (
          groups.map((group, i) => (
            <DuplicateGroupCard key={i} group={group} onMerge={onMerge} />
          ))
        )}
      </div>

      {groups.length > 0 && (
        <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600">
          合計 {totalDuplicates} 件の重複ブックマーク
        </div>
      )}
    </div>
  )
}
