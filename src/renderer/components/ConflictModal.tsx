import { X, Check, ArrowRight, Sparkles } from 'lucide-react'
import { useState, useCallback } from 'react'
import type { ConflictEntry, Bookmark } from '../../types'

interface ConflictModalProps {
  conflicts: ConflictEntry[]
  onResolve: (conflict: ConflictEntry, resolution: 'local' | 'remote' | 'merge' | 'skip') => Promise<void>
  onApplyMerge: (bookmarkId: string, data: { title?: string; url?: string; notes?: string; tags?: string[] }) => Promise<void>
  onClose: () => void
  onFinish: () => void
}

function diffFields(local?: string, remote?: string) {
  return { local: local || '(空)', remote: remote || '(空)', same: local === remote }
}

function BookmarkDiff({ label, local, remote }: { label: string; local: string; remote: string }) {
  const same = local === remote
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] text-zinc-500 uppercase">{label}</span>
      <div className={`grid grid-cols-2 gap-2 text-xs ${same ? 'text-zinc-400' : ''}`}>
        <div className={`p-1.5 rounded ${same ? 'bg-zinc-800/30' : 'bg-zinc-800'}`}>{local}</div>
        <div className={`p-1.5 rounded ${same ? 'bg-zinc-800/30' : 'bg-zinc-800'}`}>{remote}</div>
      </div>
    </div>
  )
}

function ConflictCard({
  conflict,
  index,
  total,
  onResolve,
}: {
  conflict: ConflictEntry
  index: number
  total: number
  onResolve: (conflict: ConflictEntry, resolution: 'local' | 'remote' | 'merge' | 'skip') => Promise<void>
}) {
  const [resolving, setResolving] = useState(false)
  const [done, setDone] = useState(false)
  const local = conflict.local
  const remote = conflict.remote
  const autoMerge = conflict.autoMerge

  const handleResolve = useCallback(async (resolution: 'local' | 'remote' | 'merge' | 'skip') => {
    setResolving(true)
    try {
      await onResolve(conflict, resolution)
      setDone(true)
    } finally {
      setResolving(false)
    }
  }, [conflict, onResolve])

  if (done) {
    return (
      <div className="border border-green-500/20 rounded-lg p-3 bg-green-500/5">
        <div className="flex items-center gap-2 text-green-400 text-xs">
          <Check className="w-3.5 h-3.5" />
          解決済み
        </div>
      </div>
    )
  }

  return (
    <div className="border border-amber-500/20 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-amber-500/5 border-b border-amber-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-400">コンフリクト {index + 1}/{total}</span>
          <span className="text-xs text-zinc-500 truncate max-w-56">{conflict.url}</span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
          <div className="text-xs font-medium text-zinc-400 text-center">ローカル</div>
          <div />
          <div className="text-xs font-medium text-zinc-400 text-center">リモート</div>

          <BookmarkDiff label="タイトル" {...diffFields(local?.title, remote?.title)} />
          <div />
          <BookmarkDiff label="タイトル" {...diffFields(remote?.title, local?.title)} />

          <BookmarkDiff label="メモ" {...diffFields(local?.notes, remote?.notes)} />
          <div />
          <BookmarkDiff label="メモ" {...diffFields(remote?.notes, local?.notes)} />

          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase">タグ</span>
            <div className="text-xs text-zinc-400 p-1.5 rounded bg-zinc-800">
              {local?.tags.map((t) => t.name).join(', ') || '(なし)'}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase">タグ</span>
            <div className="text-xs text-zinc-400 p-1.5 rounded bg-zinc-800">
              {remote?.tags.map((t) => t.name).join(', ') || '(なし)'}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase">閲覧数</span>
            <div className="text-xs text-zinc-400 p-1.5 rounded bg-zinc-800">{local?.visit_count || 0}</div>
          </div>
          <div className="flex items-center justify-center text-zinc-500 text-xs">+</div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase">閲覧数</span>
            <div className="text-xs text-zinc-400 p-1.5 rounded bg-zinc-800">{remote?.visit_count || 0}</div>
          </div>
        </div>

        {autoMerge && (
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">自動マージプレビュー</span>
            </div>
            <div className="text-xs text-zinc-400 space-y-0.5">
              <p>タイトル: <span className="text-zinc-300">{autoMerge.title || '(空)'}</span></p>
              <p>タグ: <span className="text-zinc-300">{autoMerge.tags.map((t) => t.name).join(', ') || '(なし)'}</span></p>
              <p>閲覧数: <span className="text-zinc-300">{autoMerge.visit_count}</span></p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-2 border-t border-zinc-800">
        <button
          onClick={() => handleResolve('local')}
          disabled={resolving}
          className="flex-1 px-2 py-1.5 text-[10px] rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50 transition-colors"
        >
          ローカルを保持
        </button>
        <button
          onClick={() => handleResolve('remote')}
          disabled={resolving}
          className="flex-1 px-2 py-1.5 text-[10px] rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50 transition-colors"
        >
          リモートを採用
        </button>
        <button
          onClick={() => handleResolve('merge')}
          disabled={resolving}
          className="flex-1 px-2 py-1.5 text-[10px] rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
        >
          自動マージ
        </button>
        <button
          onClick={() => handleResolve('skip')}
          disabled={resolving}
          className="px-2 py-1.5 text-[10px] rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          スキップ
        </button>
      </div>
    </div>
  )
}

export function ConflictModal({ conflicts, onResolve, onApplyMerge, onClose, onFinish }: ConflictModalProps) {
  const allResolved = conflicts.every((c) => c.resolved !== null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[720px] max-h-[80vh] bg-zinc-900 border border-zinc-700 rounded-xl flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">
            コンフリクト解決
            <span className="ml-2 text-xs text-zinc-500">{conflicts.length}件</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conflicts.map((c, i) => (
            <ConflictCard key={c.bookmarkId + c.url} conflict={c} index={i} total={conflicts.length} onResolve={onResolve} />
          ))}
        </div>

        <div className="p-3 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            後で解決
          </button>
          <button
            onClick={onFinish}
            disabled={!allResolved}
            className="px-4 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {allResolved ? '完了' : `未解決 ${conflicts.filter((c) => c.resolved === null).length}件`}
          </button>
        </div>
      </div>
    </div>
  )
}
