import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getUser,
  handleAuthCallback,
  login as identityLogin,
  logout as identityLogout,
  onAuthChange,
  recoverPassword,
  requestPasswordRecovery,
} from '@netlify/identity'
import type { User } from '@netlify/identity'
import { IdentityAuthContext } from './identityAuthContextValue'
import type { AuthStatus } from './identityAuthContextValue'

function isAuthUser(user: User | null): user is User {
  return Boolean(user?.id)
}

export function IdentityAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState('')
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthChange((event, nextUser) => {
      if (!active) return
      setUser(isAuthUser(nextUser) ? nextUser : null)
      setStatus('ready')
      setError('')
      if (event === 'logout') setRecoveryToken(null)
    })

    void (async () => {
      try {
        const callback = await handleAuthCallback()
        if (!active) return
        if (callback?.type === 'recovery' && callback.token) setRecoveryToken(callback.token)
        const currentUser = callback?.user ?? await getUser()
        if (!active) return
        setUser(isAuthUser(currentUser) ? currentUser : null)
        setStatus('ready')
        setError('')
      } catch {
        if (!active) return
        setUser(null)
        setStatus('error')
        setError('Não foi possível verificar a sessão do Netlify Identity.')
      }
    })()

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError('')
    try {
      const signedInUser = await identityLogin(email, password)
      setUser(signedInUser)
      setStatus('ready')
      return signedInUser
    } catch {
      setError('Não foi possível entrar. Verifique as credenciais e tente novamente.')
      throw new Error('Falha na autenticação.')
    }
  }, [])

  const logout = useCallback(async () => {
    setError('')
    try {
      await identityLogout()
      setUser(null)
      setRecoveryToken(null)
      setStatus('ready')
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.')
    }
  }, [])

  const requestRecovery = useCallback(async (email: string) => {
    setError('')
    try {
      await requestPasswordRecovery(email)
    } catch {
      setError('Não foi possível solicitar a recuperação. Verifique o e-mail e tente novamente.')
      throw new Error('Falha ao solicitar recuperação.')
    }
  }, [])

  const resetPassword = useCallback(async (password: string) => {
    if (!recoveryToken) throw new Error('Token de recuperação indisponível.')
    setError('')
    try {
      const recoveredUser = await recoverPassword(recoveryToken, password)
      setUser(recoveredUser)
      setRecoveryToken(null)
      setStatus('ready')
    } catch {
      setError('O link de recuperação expirou ou não é válido. Solicite outro link.')
      throw new Error('Falha ao redefinir a senha.')
    }
  }, [recoveryToken])

  const clearRecovery = useCallback(() => setRecoveryToken(null), [])

  const value = useMemo(() => ({
    user,
    status,
    error,
    recoveryToken,
    login,
    logout,
    requestRecovery,
    resetPassword,
    clearRecovery,
  }), [user, status, error, recoveryToken, login, logout, requestRecovery, resetPassword, clearRecovery])

  return <IdentityAuthContext.Provider value={value}>{children}</IdentityAuthContext.Provider>
}
