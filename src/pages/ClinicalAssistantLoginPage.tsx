import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, LogIn } from 'lucide-react'
import { useIdentityAuth, hasClinicalAssistantAccess } from '../auth/useIdentityAuth'

function getRedirectPath(state: unknown) {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/assistente-clinico'
  const from = state.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : '/assistente-clinico'
}

export function ClinicalAssistantLoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    user,
    status,
    error,
    recoveryToken,
    login,
    logout,
    requestRecovery,
    resetPassword,
  } = useIdentityAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recovering, setRecovering] = useState(location.pathname === '/recuperar-senha')

  const redirectPath = getRedirectPath(location.state)

  useEffect(() => {
    if (status === 'ready' && !recoveryToken && hasClinicalAssistantAccess(user)) {
      navigate(redirectPath, { replace: true })
    }
  }, [status, recoveryToken, user, navigate, redirectPath])

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      const signedInUser = await login(email.trim(), password)
      if (hasClinicalAssistantAccess(signedInUser)) {
        navigate(redirectPath, { replace: true })
      } else {
        setFormError('Sua conta não está habilitada para o Assistente Clínico. Solicite acesso ao administrador da plataforma.')
      }
    } catch {
      setFormError(error || 'Não foi possível entrar. Verifique as credenciais e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const submitRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    setMessage('')
    try {
      await requestRecovery(email.trim())
      setMessage('Se houver uma conta associada a esse e-mail, você receberá instruções para redefinir a senha.')
    } catch {
      setFormError('Não foi possível solicitar a recuperação. Tente novamente mais tarde.')
    } finally {
      setBusy(false)
    }
  }

  const submitPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 8) {
      setFormError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      await resetPassword(newPassword)
      setMessage('Senha redefinida. A sessão foi atualizada.')
      navigate(redirectPath, { replace: true })
    } catch {
      setFormError('O link de recuperação expirou ou não é válido. Solicite outro link.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <main className="identity-access-page" role="status">Verificando sessão...</main>
  }

  if (recoveryToken) {
    return (
      <main className="identity-access-page">
        <section className="identity-access-card">
          <span className="identity-access-icon"><KeyRound size={20} aria-hidden="true" /></span>
          <h1>Redefinir senha</h1>
          <p>Crie uma nova senha para sua conta do Netlify Identity.</p>
          <form onSubmit={submitPasswordReset}>
            <label className="identity-access-field">
              <span>Nova senha</span>
              <input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            {formError && <p className="identity-access-error" role="alert">{formError}</p>}
            <button type="submit" className="identity-access-submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar nova senha'}</button>
          </form>
        </section>
      </main>
    )
  }

  if (user && !hasClinicalAssistantAccess(user)) {
    return (
      <main className="identity-access-page">
        <section className="identity-access-card">
          <h1>Acesso não habilitado</h1>
          <p>Esta conta está autenticada, mas não possui a permissão clínica necessária.</p>
          {formError && <p className="identity-access-error" role="alert">{formError}</p>}
          <button type="button" className="identity-access-submit" onClick={() => void logout()}>Sair</button>
          <Link to="/inicio" className="identity-access-back"><ArrowLeft size={15} aria-hidden="true" /> Voltar à plataforma</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="identity-access-page">
      <section className="identity-access-card">
        <span className="identity-access-icon"><LogIn size={20} aria-hidden="true" /></span>
        <h1>Acesso ao Assistente Clínico</h1>
        <p>Entre com uma conta Netlify Identity previamente habilitada pela equipe PlantãoMed. Não há cadastro público.</p>
        {status === 'error' && <p className="identity-access-error" role="alert">{error}</p>}
        <form onSubmit={recovering ? submitRecovery : submitLogin}>
          <label className="identity-access-field">
            <span>E-mail</span>
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {!recovering && <label className="identity-access-field">
            <span>Senha</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>}
          {formError && <p className="identity-access-error" role="alert">{formError}</p>}
          {message && <p className="identity-access-message" role="status">{message}</p>}
          <button type="submit" className="identity-access-submit" disabled={busy}>
            {busy ? 'Aguarde...' : recovering ? 'Enviar link de recuperação' : 'Entrar'}
          </button>
        </form>
        <div className="identity-access-actions">
          <button type="button" className="identity-access-text-button" onClick={() => {
            setRecovering((current) => !current)
            setFormError('')
            setMessage('')
          }} disabled={busy}>{recovering ? 'Voltar ao login' : 'Esqueci minha senha'}</button>
          <Link to="/inicio" className="identity-access-back"><ArrowLeft size={15} aria-hidden="true" /> Voltar à plataforma</Link>
        </div>
      </section>
    </main>
  )
}
