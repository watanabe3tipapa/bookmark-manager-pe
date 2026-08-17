import { X, Globe, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface ExploreSetupDialogProps {
  onSave: (config: { workerUrl: string }) => void
  onClose: () => void
}

export function ExploreSetupDialog({ onSave, onClose }: ExploreSetupDialogProps) {
  const [workerUrl, setWorkerUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    if (!workerUrl.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${workerUrl.trim().replace(/\/+$/, '')}/health`, { method: 'GET' })
      if (res.ok) {
        setTestResult({ success: true, message: '接続OK' })
      } else {
        setTestResult({ success: false, message: `HTTP ${res.status}` })
      }
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : '接続エラー' })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workerUrl.trim()) return
    onSave({ workerUrl: workerUrl.trim().replace(/\/+$/, '') })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[440px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-medium text-zinc-200">探索機能の設定</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Cloudflare Worker の URL</label>
            <input
              type="text"
              value={workerUrl}
              onChange={(e) => setWorkerUrl(e.target.value)}
              placeholder="https://bookmark-explore.xxxxx.workers.dev"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
                         text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <p className="text-[10px] text-zinc-600">
              workers/explore を <code className="text-emerald-500/80">npx wrangler deploy</code> して生成された URL を入力します
            </p>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${testResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {testResult.message}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={!workerUrl.trim() || testing}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'テスト中...' : '接続テスト'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!workerUrl.trim()}
              className="px-4 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}