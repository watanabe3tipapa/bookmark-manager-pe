import { useState, useEffect, useCallback } from 'react'
import type { Bookmark, Tag } from '../../types'

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.electronAPI.bookmark.list()
      setBookmarks(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  const createBookmark = useCallback(async (data: {
    url: string
    title?: string
    tags?: string[]
  }) => {
    const bm = await window.electronAPI.bookmark.create(data)
    setBookmarks(prev => [bm, ...prev])
    return bm
  }, [])

  const updateBookmark = useCallback(async (id: string, data: {
    url?: string
    title?: string
    notes?: string
    visit_count?: number
  }) => {
    const updated = await window.electronAPI.bookmark.update(id, data)
    if (updated) {
      setBookmarks(prev => prev.map(b => b.id === id ? updated : b))
    }
    return updated
  }, [])

  const deleteBookmark = useCallback(async (id: string) => {
    const ok = await window.electronAPI.bookmark.delete(id)
    if (ok) {
      setBookmarks(prev => prev.filter(b => b.id !== id))
    }
    return ok
  }, [])

  const addTag = useCallback(async (bookmarkId: string, tagName: string) => {
    const updated = await window.electronAPI.tag.addToBookmark(bookmarkId, tagName)
    if (updated) {
      setBookmarks(prev => prev.map(b => b.id === bookmarkId ? updated : b))
    }
    return updated
  }, [])

  const removeTag = useCallback(async (bookmarkId: string, tagId: string) => {
    const updated = await window.electronAPI.tag.removeFromBookmark(bookmarkId, tagId)
    if (updated) {
      setBookmarks(prev => prev.map(b => b.id === bookmarkId ? updated : b))
    }
    return updated
  }, [])

  return {
    bookmarks,
    loading,
    error,
    refetch: fetchBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    addTag,
    removeTag,
  }
}
