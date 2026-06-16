import { useState, useCallback, useRef, useEffect } from 'react'
import type { Bookmark } from '../../types'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Bookmark[] | null>(null)
  const [searching, setSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
  }, [])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!query.trim()) {
      setResults(null)
      return
    }

    setSearching(true)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await window.electronAPI.bookmark.search(query)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 200)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults(null)
  }, [])

  return { query, results, searching, search, clearSearch }
}
