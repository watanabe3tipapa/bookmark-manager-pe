import { X } from 'lucide-react'

interface TagChipProps {
  name: string
  onRemove?: () => void
  size?: 'sm' | 'md'
}

export function TagChip({ name, onRemove, size = 'sm' }: TagChipProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-400
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
      `}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="hover:text-blue-200 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
