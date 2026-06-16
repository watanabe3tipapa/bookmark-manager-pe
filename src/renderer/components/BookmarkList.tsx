import { ArrowUpDown, Import, Plus, Bookmark, CopyPlus, Scan, Bot } from 'lucide-react'
import { BookmarkRow } from './BookmarkRow'
import type { Bookmark as BookmarkType } from '../../types'

interface BookmarkListProps {
  bookmarks: BookmarkType[]
  selectedIds: Set<string>
  onSelect: (id: string, multi: boolean) => void
  onOpen: (url: string) => void
  onRemoveTag: (bookmarkId: string, tagId: string) => void
  onImport: () => void
  onCreateNew: () => void
  onFindDuplicates: () => void
  onOpenAIAssistant: () => void
  scanningDuplicates: boolean
  importing: boolean
}

export function BookmarkList({
  bookmarks,
  selectedIds,
  onSelect,
  onOpen,
  onRemoveTag,
  onImport,
  onCreateNew,
  onFindDuplicates,
  onOpenAIAssistant,
  scanningDuplicates,
  importing,
}: BookmarkListProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-400">
            {bookmarks.length > 0
              ? selectedIds.size > 0
                ? `${selectedIds.size} 件選択中`
                : `${bookmarks.length} 件`
              : 'ブックマーク'}
          </h2>
          <button
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="並べ替え"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-zinc-800
                       text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            追加
          </button>
          <button
            onClick={onImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-zinc-800
                       text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Import className="w-3.5 h-3.5" />
            インポート
          </button>
          <button
            onClick={onFindDuplicates}
            disabled={scanningDuplicates}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                       bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanningDuplicates ? (
              <Scan className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <CopyPlus className="w-3.5 h-3.5" />
            )}
            重複
          </button>
          <button
            onClick={onOpenAIAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                       bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            AI
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <Bookmark className="w-12 h-12" />
            <p className="text-sm">ブックマークがありません</p>
            <p className="text-xs text-zinc-700">「インポート」からブラウザのブックマークHTMLを取り込むか、手動で追加してください</p>
          </div>
        ) : (
          bookmarks.map((bm) => (
            <BookmarkRow
              key={bm.id}
              bookmark={bm}
              selected={selectedIds.has(bm.id)}
              onSelect={onSelect}
              onOpen={onOpen}
              onRemoveTag={onRemoveTag}
            />
          ))
        )}
      </div>
    </div>
  )
}
