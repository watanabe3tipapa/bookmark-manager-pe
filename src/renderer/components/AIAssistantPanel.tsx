import { X, Bot, Play, Square, Terminal, Copy, Check, Sparkles } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { PROMPTS } from '../../shared/prompts'

interface AIAssistantPanelProps {
  onClose: () => void
}

const promptList = [
  { key: 'CLASSIFY_TAGS', label: 'タグ分類を提案', icon: Sparkles },
  { key: 'NORMALIZE_TITLES', label: 'タイトルを正規化', icon: Sparkles },
  { key: 'MERGE_DUPLICATES', label: '重複マージを提案', icon: Sparkles },
  { key: 'ANALYZE_COLLECTION', label: 'コレクション分析', icon: Sparkles },
]

export function AIAssistantPanel({ onClose }: AIAssistantPanelProps) {
  const [serverRunning, setServerRunning] = useState(false)
  const [serverPort, setServerPort] = useState(9876)
  const [starting, setStarting] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<string>('CLASSIFY_TAGS')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.electronAPI.ai.serverStatus().then((s) => {
      setServerRunning(s.running)
      setServerPort(s.port)
    })
  }, [])

  const handleToggleServer = useCallback(async () => {
    if (serverRunning) {
      await window.electronAPI.ai.serverStop()
      setServerRunning(false)
    } else {
      setStarting(true)
      const result = await window.electronAPI.ai.serverStart()
      if (result.success) {
        setServerRunning(true)
        setServerPort(result.port!)
      }
      setStarting(false)
    }
  }, [serverRunning])

  const handleCopy = useCallback(async () => {
    const data = PROMPTS[selectedPrompt as keyof typeof PROMPTS]
    const url = `http://localhost:${serverPort}`
    const fullPrompt = `${data}\n\nAPI Endpoint: ${url}`
    try {
      await navigator.clipboard.writeText(fullPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = fullPrompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [selectedPrompt, serverPort])

  const promptData = PROMPTS[selectedPrompt as keyof typeof PROMPTS]

  return (
    <div className="w-96 border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-zinc-300">Zed AI 連携</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${serverRunning ? 'bg-green-500' : 'bg-zinc-600'}`} />
            <span className="text-xs text-zinc-400">
              {serverRunning ? `API Server: ${serverPort}` : 'API Server: 停止中'}
            </span>
          </div>
          <button
            onClick={handleToggleServer}
            disabled={starting}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
              serverRunning
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
            } disabled:opacity-50`}
          >
            {starting ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : serverRunning ? (
              <Square className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {serverRunning ? '停止' : '起動'}
          </button>
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">プロンプト</label>
          <div className="space-y-1">
            {promptList.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedPrompt(p.key)}
                className={`
                  flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors
                  ${selectedPrompt === p.key
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'}
                `}
              >
                <p.icon className="w-3.5 h-3.5" />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-500">プロンプト全文</label>
            <button
              onClick={handleCopy}
              disabled={!serverRunning}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-zinc-800 text-zinc-400
                         hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'コピー完了' : 'コピー'}
            </button>
          </div>
          <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto select-text">
            {serverRunning ? promptData : 'API Serverを起動してください'}
            {serverRunning && `\n\n---\nAPI Endpoint: http://localhost:${serverPort}`}
          </pre>
        </div>

        <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500 font-medium">使い方</span>
          </div>
          <ol className="text-xs text-zinc-500 space-y-1.5 list-decimal list-inside">
            <li>API Server を起動</li>
            <li>プロンプトを選択してコピー</li>
            <li>ZedでAIアシスタントを開きペースト</li>
            <li>AIが生成したJSONを確認後、APIで適用</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
