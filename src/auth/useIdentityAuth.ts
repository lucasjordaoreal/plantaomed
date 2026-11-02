import { useContext } from 'react'
import type { User } from '@netlify/identity'
import { IdentityAuthContext } from './identityAuthContextValue'

export function useIdentityAuth() {
  const context = useContext(IdentityAuthContext)
  if (!context) throw new Error('useIdentityAuth deve ser usado dentro de IdentityAuthProvider.')
  return context
}

export function hasClinicalAssistantAccess(user: User | null) {
  return user?.roles?.includes('clinical-assistant') === true
}
