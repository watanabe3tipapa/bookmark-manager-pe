import { X, ExternalLink, Trash2, Save, Globe, Smartphone } from 'lucide-react'
import { TagChip } from './TagChip'
import type { Bookmark, Tag } from '../../types'
import { useState, useEffect } from 'react'

interface DetailPanelProps {
  bookmark: Bookmark | null
  allTags: Tag[]
  onClose: () => void
  onSave: (id: string, data: { title?: string; url?: string; notes?: string; device_scoped?: boolean }) => void
  onDelete: (id: string) => void
  onAddTag: (bookmarkId: string, tagName: string) => void
  onRemoveTag: (bookmarkId: string, tagId: string) => void
  onOpen: (url: string) => void
}

export function DetailPanel({
  bookmark,
  allTags,
  onClose,
  onSave,
  onDelete,
  onAddTag,
  onRemoveTag,
  onOpen,
}: DetailPanelProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [deviceScoped, setDeviceScoped] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title)
      setUrl(bookmark.url)
      setNotes(bookmark.notes)
      setDeviceScoped(bookmark.device_scoped)
      setDirty(false)
    }
  }, [bookmark])

  if (!bookmark) {
    return (
      <div className="w-96 border-l border-zinc-800 bg-zinc-900/50 flex items-center justify-center">
        <p className="text-sm text-zinc-600">ブックマークを選択してください</p>
      </div>
    )
  }

  const handleSave = () => {
    if (dirty) {
      onSave(bookmark.id, { title, url, notes, device_scoped: deviceScoped })
      setDirty(false)
    }
  }

  const handleAddTag = () => {
    const tag = newTag.trim()
    if (tag && !bookmark.tags.some(t => t.name === tag)) {
      onAddTag(bookmark.id, tag)
      setNewTag('')
    }
  }

  const usedTagIds = new Set(bookmark.tags.map(t => t.id))
  const availableTags = allTags.filter(t => !usedTagIds.has(t.id))

  return (
    <div className="w-96 border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300">詳細</h3>
        <div className="flex items-center gap-1">
          {dirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-blue-600
                         text-white hover:bg-blue-500 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              保存
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true) }}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                       text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2
                       focus:ring-blue-500/40 focus:border-blue-500/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-500">URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setDirty(true) }}
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                         text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2
                         focus:ring-blue-500/40 focus:border-blue-500/50"
            />
            <button
              onClick={() => onOpen(bookmark.url)}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400
                         hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-500">メモ</label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setDirty(true) }}
            rows={3}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                       text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2
                       focus:ring-blue-500/40 focus:border-blue-500/50 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-500">タグ</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {bookmark.tags.map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                size="md"
                onRemove={() => onRemoveTag(bookmark.id, tag.id)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag() }}
              placeholder="タグを追加..."
              className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                         text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2
                         focus:ring-blue-500/40"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-700 text-zinc-300
                         hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              追加
            </button>
          </div>
          {availableTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {availableTags.slice(0, 10).map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onAddTag(bookmark.id, tag.name)}
                  className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-500
                             hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                >
                  +{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-500">スコープ</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setDeviceScoped(false); setDirty(true) }}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors
                ${!deviceScoped
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}
              `}
            >
              <Globe className="w-3.5 h-3.5" />
              共有
            </button>
            <button
              onClick={() => { setDeviceScoped(true); setDirty(true) }}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors
                ${deviceScoped
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}
              `}
            >
              <Smartphone className="w-3.5 h-3.5" />
              デバイス固有
            </button>
          </div>
        </div>

        <div className="pt-2 space-y-1 text-xs text-zinc-600">
          <p>作成日: {new Date(bookmark.created_at).toLocaleString('ja-JP')}</p>
          <p>更新日: {new Date(bookmark.updated_at).toLocaleString('ja-JP')}</p>
          <p>閲覧数: {bookmark.visit_count}</p>
          {bookmark.source_device_id && <p>デバイス: {bookmark.source_device_id}</p>}
        </div>
      </div>

      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={() => onDelete(bookmark.id)}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs rounded-lg
                     bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20
                     transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          削除
        </button>
      </div>
    </div>
  )
}
