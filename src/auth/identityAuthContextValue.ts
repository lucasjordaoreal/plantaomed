import { createContext } from 'react'
import type { CallbackResult, User } from '@netlify/identity'

export type AuthStatus = 'loading' | 'ready' | 'error'
export type IdentityCallbackType = CallbackResult['type']

export type IdentityAuthContextValue = {
  user: User | null
  status: AuthStatus
  error: string
  callbackType: IdentityCallbackType | null
  callbackErrorType: IdentityCallbackType | null
  callbackError: string
  inviteToken: string | null
  recoverySessionActive: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  requestRecovery: (email: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
  acceptInvitation: (password: string) => Promise<User>
}

export const IdentityAuthContext = createContext<IdentityAuthContextValue | null>(null)
