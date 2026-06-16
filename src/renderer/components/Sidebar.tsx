import { SearchBox } from './SearchBox'
import { TagChip } from './TagChip'
import {
  Bookmark, RefreshCw, Tag as TagIcon, FolderOpen, Cloud, CloudOff,
  Hash, Clock, EyeOff, Star, Layers,
} from 'lucide-react'
import type { Tag, SmartViewType, ScopeFilter } from '../../types'

interface SmartViewItem {
  type: SmartViewType
  label: string
  icon: typeof Bookmark
  count?: number
}

interface SidebarProps {
  searchQuery: string
  onSearch: (query: string) => void
  onClearSearch: () => void
  searching: boolean
  tags: Tag[]
  selectedTag: string | null
  onSelectTag: (tagName: string | null) => void
  smartView: SmartViewType
  onSmartView: (view: SmartViewType) => void
  scope: ScopeFilter
  onScopeChange: (scope: ScopeFilter) => void
  counts: Record<SmartViewType, number>
  totalBookmarks: number
  onSync: () => void
  onClearSyncConfig: () => void
  syncing: boolean
  syncStatus: { connected: boolean; lastSync: string | null; message: string; config?: { owner: string; repo: string } }
}

const smartViews: SmartViewItem[] = [
  { type: 'all', label: 'すべて', icon: FolderOpen },
  { type: 'untagged', label: '未分類', icon: Hash },
  { type: 'recent', label: '最近追加', icon: Clock },
  { type: 'unused', label: '使われてない', icon: EyeOff },
  { type: 'frequent', label: 'よく見る', icon: Star },
]

const scopeOptions: { value: ScopeFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'shared', label: '共有のみ' },
  { value: 'device_scoped', label: 'デバイス固有のみ' },
]

export function Sidebar({
  searchQuery,
  onSearch,
  onClearSearch,
  searching,
  tags,
  selectedTag,
  onSelectTag,
  smartView,
  onSmartView,
  scope,
  onScopeChange,
  counts,
  totalBookmarks,
  onSync,
  onClearSyncConfig,
  syncing,
  syncStatus,
}: SidebarProps) {
  return (
    <div className="w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-5 h-5 text-blue-400" />
          <h1 className="text-sm font-semibold text-zinc-100">BM PE</h1>
        </div>
        <SearchBox
          value={searchQuery}
          onChange={onSearch}
          onClear={onClearSearch}
          searching={searching}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 space-y-0.5">
          {smartViews.map((sv) => (
            <button
              key={sv.type}
              onClick={() => onSmartView(sv.type)}
              className={`
                flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors
                ${smartView === sv.type
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}
              `}
            >
              <sv.icon className="w-4 h-4" />
              <span>{sv.label}</span>
              <span className="ml-auto text-zinc-600">
                {sv.type === 'all' ? totalBookmarks : counts[sv.type]}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-zinc-800/50 mx-3" />

        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 mb-2 px-2.5">
            <TagIcon className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500 font-medium">タグ</span>
          </div>
          <div className="space-y-0.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { onSelectTag(tag.name); onSmartView('all') }}
                className={`
                  flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors
                  ${selectedTag === tag.name
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}
                `}
              >
                <TagChip name={tag.name} />
              </button>
            ))}
            {tags.length === 0 && (
              <p className="text-xs text-zinc-600 px-2.5 py-1">タグがありません</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-zinc-800 space-y-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Layers className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">スコープ</span>
          </div>
          <div className="flex gap-1">
            {scopeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onScopeChange(opt.value)}
                className={`
                  flex-1 px-2 py-1 text-[10px] rounded-md transition-colors
                  ${scope === opt.value
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncStatus.connected ? (
            <Cloud className="w-3.5 h-3.5 text-green-500 shrink-0" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 truncate">{syncStatus.message}</p>
            {syncStatus.config && (
              <p className="text-[10px] text-zinc-600 truncate">{syncStatus.config.owner}/{syncStatus.config.repo}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs
                       rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {syncing ? '同期中...' : '同期'}
          </button>
          {syncStatus.connected && (
            <button
              onClick={onClearSyncConfig}
              className="px-2 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              解除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
