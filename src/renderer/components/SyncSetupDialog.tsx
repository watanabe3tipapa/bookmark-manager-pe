import { X, Github } from 'lucide-react'
import { useState } from 'react'

interface SyncSetupDialogProps {
  onSave: (config: { token: string; owner: string; repo: string; deviceId: string; deviceName: string }) => void
  onClose: () => void
}

export function SyncSetupDialog({ onSave, onClose }: SyncSetupDialogProps) {
  const [token, setToken] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [deviceName, setDeviceName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim() || !owner.trim() || !repo.trim()) return
    onSave({
      token: token.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
      deviceId: `mac-${Date.now().toString(36)}`,
      deviceName: deviceName.trim() || 'My Mac',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[440px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-200">GitHub 同期設定</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Personal Access Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                         text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="text-[10px] text-zinc-600">スコープ: repo (contents) が必要です</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">リポジトリ所有者</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="username"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                           text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">リポジトリ名</label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="my-bookmarks"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                           text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">デバイス名（識別用）</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="My MacBook"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                         text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!token.trim() || !owner.trim() || !repo.trim()}
              className="px-4 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              接続テスト＆保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
