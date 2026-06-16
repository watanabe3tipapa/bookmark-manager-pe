import { ExternalLink, MoreHorizontal, Globe, Smartphone } from 'lucide-react'
import { TagChip } from './TagChip'
import type { Bookmark } from '../../types'
import { useState } from 'react'

interface BookmarkRowProps {
  bookmark: Bookmark
  selected: boolean
  onSelect: (id: string, multi: boolean) => void
  onOpen: (url: string) => void
  onRemoveTag: (bookmarkId: string, tagId: string) => void
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BookmarkRow({ bookmark, selected, onSelect, onOpen, onRemoveTag }: BookmarkRowProps) {
  const [showFavicon, setShowFavicon] = useState(true)
  const domain = getDomain(bookmark.url)

  return (
    <div
      className={`
        group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-zinc-800/50
        transition-colors
        ${selected ? 'bg-blue-500/10 border-blue-500/20' : 'hover:bg-zinc-800/30'}
      `}
      onClick={(e) => onSelect(bookmark.id, e.metaKey || e.ctrlKey)}
    >
      <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded overflow-hidden bg-zinc-800">
        {showFavicon ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setShowFavicon(false)}
          />
        ) : (
          <Globe className="w-full h-full p-0.5 text-zinc-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate text-zinc-100 group-hover:text-white transition-colors">
            {bookmark.title || bookmark.url}
          </span>
          {bookmark.device_scoped && (
            <span className="relative group/tooltip">
              <Smartphone className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200 text-[10px] whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                デバイス固有
              </span>
            </span>
          )}
          <span className="text-xs text-zinc-500 shrink-0">{domain}</span>
        </div>

        {bookmark.title && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">{bookmark.url}</p>
        )}

        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {bookmark.tags.map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                onRemove={() => onRemoveTag(bookmark.id, tag.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-zinc-600 mr-1">{formatDate(bookmark.created_at)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(bookmark.url) }}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
          title="ブラウザで開く"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
