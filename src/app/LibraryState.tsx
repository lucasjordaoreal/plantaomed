import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEYS, appendHistory, readJson, toggleFavorite, writeJson } from '../lib/storage'
import { LibraryStateContext } from './LibraryStateContext'
import type { LibraryStateValue } from './LibraryStateContext'

export function LibraryStateProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => readJson(STORAGE_KEYS.favorites, []))
  const [history, setHistory] = useState<string[]>(() => readJson(STORAGE_KEYS.history, []))

  useEffect(() => writeJson(STORAGE_KEYS.favorites, favorites), [favorites])
  useEffect(() => writeJson(STORAGE_KEYS.history, history), [history])

  const toggleFavoriteId = useCallback((id: string) => setFavorites((current) => toggleFavorite(id, current)), [])
  const recordHistory = useCallback((id: string) => setHistory((current) => appendHistory(id, current)), [])
  const clearHistory = useCallback(() => setHistory([]), [])

  const value = useMemo<LibraryStateValue>(() => ({
    favorites,
    history,
    toggleFavoriteId,
    recordHistory,
    clearHistory,
  }), [favorites, history, toggleFavoriteId, recordHistory, clearHistory])

  return <LibraryStateContext.Provider value={value}>{children}</LibraryStateContext.Provider>
}
