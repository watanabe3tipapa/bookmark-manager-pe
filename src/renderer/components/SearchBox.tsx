import { Search, X } from 'lucide-react'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  searching?: boolean
}

export function SearchBox({ value, onChange, onClear, searching }: SearchBoxProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="検索..."
        className="w-full pl-9 pr-8 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm
                   placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40
                   focus:border-blue-500/50 transition-colors"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded
                     text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {searching ? (
            <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}
