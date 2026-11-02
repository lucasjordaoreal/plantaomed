import { createContext } from 'react'
import type { User } from '@netlify/identity'

export type AuthStatus = 'loading' | 'ready' | 'error'

export type IdentityAuthContextValue = {
  user: User | null
  status: AuthStatus
  error: string
  recoveryToken: string | null
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  requestRecovery: (email: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
  clearRecovery: () => void
}

export const IdentityAuthContext = createContext<IdentityAuthContextValue | null>(null)
