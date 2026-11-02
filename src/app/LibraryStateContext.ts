import { createContext } from 'react'

export type LibraryStateValue = {
  favorites: string[]
  history: string[]
  toggleFavoriteId: (id: string) => void
  recordHistory: (id: string) => void
  clearHistory: () => void
}

export const LibraryStateContext = createContext<LibraryStateValue | null>(null)
