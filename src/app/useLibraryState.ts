import { useContext } from 'react'
import { LibraryStateContext } from './LibraryStateContext'
import type { LibraryStateValue } from './LibraryStateContext'

export function useLibraryState(): LibraryStateValue {
  const context = useContext(LibraryStateContext)
  if (!context) throw new Error('useLibraryState must be used within LibraryStateProvider.')
  return context
}
