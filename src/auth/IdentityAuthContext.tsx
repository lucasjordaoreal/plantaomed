import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  acceptInvite,
  getUser,
  handleAuthCallback,
  login as identityLogin,
  logout as identityLogout,
  onAuthChange,
  requestPasswordRecovery,
  updateUser,
} from '@netlify/identity'
import type { CallbackResult, User } from '@netlify/identity'
import { IdentityAuthContext } from './identityAuthContextValue'
import type { AuthStatus, IdentityCallbackType, IdentityAuthContextValue } from './identityAuthContextValue'
import { identityCallbackTypeFromHash } from './identityCallback'

const INVITE_STORAGE_KEY = 'plantaomed:identity-invite'
const RECOVERY_STORAGE_KEY = 'plantaomed:identity-recovery'
const CALLBACK_MAX_AGE_MS = 30 * 60 * 1000

let callbackInFlight: { hash: string; promise: Promise<CallbackResult | null> } | null = null

function isAuthUser(user: User | null): user is User {
  return Boolean(user?.id)
}

function processCallback(hash: string) {
  if (callbackInFlight?.hash === hash) return callbackInFlight.promise
  const promise = handleAuthCallback()
  callbackInFlight = { hash, promise }
  void promise.finally(() => {
    if (callbackInFlight?.promise === promise) callbackInFlight = null
  }).catch(() => {})
  return promise
}

function readStoredInvite() {
  const value = sessionStorage.getItem(INVITE_STORAGE_KEY)
  if (!value) return null
  try {
    const stored = JSON.parse(value) as { token?: unknown; createdAt?: unknown }
    if (
      typeof stored.token === 'string'
      && stored.token.length > 0
      && typeof stored.createdAt === 'number'
      && Date.now() - stored.createdAt < CALLBACK_MAX_AGE_MS
    ) return stored.token
  } catch {
    sessionStorage.removeItem(INVITE_STORAGE_KEY)
    return null
  }
  sessionStorage.removeItem(INVITE_STORAGE_KEY)
  return null
}

function storeInvite(token: string) {
  sessionStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify({ token, createdAt: Date.now() }))
}

function storeRecoveryMarker(state: 'processing' | 'active') {
  sessionStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify({ state, createdAt: Date.now() }))
}

function hasFreshRecoveryMarker() {
  const value = sessionStorage.getItem(RECOVERY_STORAGE_KEY)
  if (!value) return false
  try {
    const stored = JSON.parse(value) as { state?: unknown; createdAt?: unknown }
    const age = typeof stored.createdAt === 'number' ? Date.now() - stored.createdAt : -1
    if (stored.state === 'active' && age >= 0 && age < CALLBACK_MAX_AGE_MS) return true
  } catch {
    sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
    return false
  }
  sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
  return false
}

function clearIdentityHash() {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

function callbackFailureMessage(type: IdentityCallbackType | null) {
  if (type === 'invite') return 'Este convite expirou, já foi utilizado ou não é válido. Solicite um novo convite ao administrador.'
  if (type === 'recovery') return 'Este link de recuperação expirou, já foi utilizado ou não é válido. Solicite uma nova recuperação de senha.'
  if (type === 'confirmation') return 'Não foi possível confirmar o e-mail. Solicite um novo link de confirmação.'
  if (type === 'email_change') return 'Não foi possível confirmar a alteração de e-mail. Solicite um novo link.'
  return 'Não foi possível concluir a autenticação pelo provedor. Tente novamente.'
}

export function IdentityAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState('')
  const [callbackType, setCallbackType] = useState<IdentityCallbackType | null>(null)
  const [callbackErrorType, setCallbackErrorType] = useState<IdentityCallbackType | null>(null)
  const [callbackError, setCallbackError] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [recoverySessionActive, setRecoverySessionActive] = useState(false)

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthChange((event, nextUser) => {
      if (!active) return
      setUser(isAuthUser(nextUser) ? nextUser : null)
      setError('')
      if (event === 'logout') {
        setRecoverySessionActive(false)
        sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
      }
    })

    void (async () => {
      const callbackHash = window.location.hash
      const hashType = identityCallbackTypeFromHash(callbackHash)
      try {
        if (hashType === 'invite') {
          const inviteTokenFromHash = new URLSearchParams(callbackHash.replace(/^#/, '')).get('invite_token')
          if (inviteTokenFromHash) storeInvite(inviteTokenFromHash)
        }
        if (hashType === 'recovery') storeRecoveryMarker('processing')
        const callback = hashType ? await processCallback(callbackHash) : null
        if (!active) return

        if (callback) {
          setCallbackType(callback.type)
          setUser(isAuthUser(callback.user) ? callback.user : null)
          if (callback.type === 'invite' && callback.token) {
            storeInvite(callback.token)
            setInviteToken(callback.token)
          }
          if (callback.type === 'recovery' && isAuthUser(callback.user)) {
            storeRecoveryMarker('active')
            setRecoverySessionActive(true)
          }
        } else {
          if (hashType) {
            clearIdentityHash()
            if (hashType === 'invite') sessionStorage.removeItem(INVITE_STORAGE_KEY)
            if (hashType === 'recovery') sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
            setCallbackErrorType(hashType)
            setCallbackError(callbackFailureMessage(hashType))
            setUser(null)
            setStatus('ready')
            setError('')
            return
          }
          const storedInvite = readStoredInvite()
          if (storedInvite) {
            setCallbackType('invite')
            setInviteToken(storedInvite)
          } else if (hasFreshRecoveryMarker()) {
            const recoveredUser = await getUser()
            if (!active) return
            if (isAuthUser(recoveredUser)) {
              setCallbackType('recovery')
              setUser(recoveredUser)
              setRecoverySessionActive(true)
            } else {
              sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
              setCallbackErrorType('recovery')
              setCallbackError(callbackFailureMessage('recovery'))
            }
          } else {
            setUser(await getUser())
          }
        }
        if (!active) return
        setStatus('ready')
        setError('')
      } catch {
        if (!active) return
        if (hashType) clearIdentityHash()
        if (hashType === 'invite') sessionStorage.removeItem(INVITE_STORAGE_KEY)
        if (hashType === 'recovery') sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
        setInviteToken(null)
        setRecoverySessionActive(false)
        setCallbackErrorType(hashType)
        if (hashType) setCallbackError(callbackFailureMessage(hashType))
        setUser(null)
        setStatus(hashType ? 'ready' : 'error')
        setError(hashType ? '' : 'Não foi possível verificar a sessão do Netlify Identity.')
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
      setCallbackErrorType(null)
      setCallbackError('')
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
      setInviteToken(null)
      setRecoverySessionActive(false)
      sessionStorage.removeItem(INVITE_STORAGE_KEY)
      sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
      setCallbackErrorType(null)
      setCallbackError('')
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
    if (!recoverySessionActive || !user) throw new Error('Sessão de recuperação não disponível.')
    setError('')
    try {
      const updatedUser = await updateUser({ password })
      setUser(updatedUser)
      setRecoverySessionActive(false)
      sessionStorage.removeItem(RECOVERY_STORAGE_KEY)
      setCallbackType(null)
      setCallbackErrorType(null)
      setCallbackError('')
    } catch {
      setError('Não foi possível redefinir a senha. O link pode ter expirado ou o serviço estar indisponível.')
      throw new Error('Falha ao redefinir a senha.')
    }
  }, [recoverySessionActive, user])

  const acceptInvitation = useCallback(async (password: string) => {
    if (!inviteToken) throw new Error('Convite indisponível.')
    setError('')
    try {
      const acceptedUser = await acceptInvite(inviteToken, password)
      setUser(acceptedUser)
      setInviteToken(null)
      setCallbackType(null)
      setCallbackErrorType(null)
      setCallbackError('')
      sessionStorage.removeItem(INVITE_STORAGE_KEY)
      setStatus('ready')
      return acceptedUser
    } catch {
      sessionStorage.removeItem(INVITE_STORAGE_KEY)
      setInviteToken(null)
      setCallbackType(null)
      setCallbackErrorType('invite')
      setCallbackError('Este convite expirou, já foi utilizado ou não pôde ser validado. Solicite um novo convite ao administrador.')
      throw new Error('Falha ao aceitar o convite.')
    }
  }, [inviteToken])

  const value: IdentityAuthContextValue = useMemo(() => ({
    user,
    status,
    error,
    callbackType,
    callbackErrorType,
    callbackError,
    inviteToken,
    recoverySessionActive,
    login,
    logout,
    requestRecovery,
    resetPassword,
    acceptInvitation,
  }), [
    user,
    status,
    error,
    callbackType,
    callbackErrorType,
    callbackError,
    inviteToken,
    recoverySessionActive,
    login,
    logout,
    requestRecovery,
    resetPassword,
    acceptInvitation,
  ])

  return <IdentityAuthContext.Provider value={value}>{children}</IdentityAuthContext.Provider>
}
