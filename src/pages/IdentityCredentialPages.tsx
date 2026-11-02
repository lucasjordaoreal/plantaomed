import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, KeyRound, UserRoundPlus } from 'lucide-react'
import { hasClinicalAssistantAccess, useIdentityAuth } from '../auth/useIdentityAuth'

type CredentialFlow = 'invite' | 'recovery'

function IdentityCredentialPage({ flow }: { flow: CredentialFlow }) {
  const navigate = useNavigate()
  const {
    user,
    status,
    callbackErrorType,
    callbackError,
    inviteToken,
    recoverySessionActive,
    acceptInvitation,
    resetPassword,
  } = useIdentityAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [completed, setCompleted] = useState(false)

  const isInvite = flow === 'invite'
  const flowAvailable = isInvite ? Boolean(inviteToken) : recoverySessionActive && Boolean(user)
  const hasFlowError = callbackErrorType === flow
  const destination = isInvite && user && hasClinicalAssistantAccess(user) ? '/assistente-clinico' : '/inicio'

  const passwordIssue = password.length > 0 && password.length < 8
    ? 'Use pelo menos 8 caracteres.'
    : ''
  const confirmationIssue = confirmation.length > 0 && password !== confirmation
    ? 'As senhas ainda não coincidem.'
    : ''

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (password.length < 8) {
      setFormError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setFormError('As senhas informadas não coincidem.')
      return
    }

    setBusy(true)
    try {
      if (isInvite) await acceptInvitation(password)
      else await resetPassword(password)
      setPassword('')
      setConfirmation('')
      setCompleted(true)
    } catch {
      setFormError(isInvite
        ? 'Não foi possível concluir o convite. O link pode ter expirado ou já ter sido utilizado. Solicite outro convite ao administrador.'
        : 'Não foi possível alterar a senha. O link pode ter expirado ou o serviço estar indisponível. Solicite uma nova recuperação.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <main className="identity-access-page" role="status">Validando link seguro...</main>
  }

  if (completed) {
    return (
      <main className="identity-access-page">
        <section className="identity-access-card" aria-labelledby="identity-credential-success">
          <span className="identity-access-icon"><KeyRound size={20} aria-hidden="true" /></span>
          <h1 id="identity-credential-success">{isInvite ? 'Conta ativada' : 'Senha redefinida'}</h1>
          <p>{isInvite
            ? 'Sua senha foi criada e sua conta está ativa. As permissões do Assistente Clínico continuam sendo administradas separadamente.'
            : 'Sua nova senha foi salva. Use-a na próxima vez que entrar na plataforma.'}</p>
          <button type="button" className="identity-access-submit" onClick={() => navigate(destination, { replace: true })}>
            {isInvite && hasClinicalAssistantAccess(user) ? 'Abrir Assistente Clínico' : 'Continuar para a plataforma'}
          </button>
          <Link to="/login" className="identity-access-back"><ArrowLeft size={15} aria-hidden="true" /> Ir para o login</Link>
        </section>
      </main>
    )
  }

  if (!flowAvailable) {
    const message = hasFlowError
      ? callbackError
      : isInvite
        ? 'Não há um convite válido nesta sessão. Abra novamente o link recebido ou solicite um novo convite ao administrador.'
        : 'Não foi possível validar uma sessão de recuperação. Solicite um novo link de redefinição de senha.'
    return (
      <main className="identity-access-page">
        <section className="identity-access-card" aria-labelledby="identity-credential-unavailable">
          <span className="identity-access-icon"><KeyRound size={20} aria-hidden="true" /></span>
          <h1 id="identity-credential-unavailable">{isInvite ? 'Convite indisponível' : 'Link de recuperação indisponível'}</h1>
          <p className="identity-access-error" role="alert">{message}</p>
          <Link to="/login" className="identity-access-submit identity-access-submit--link">
            {isInvite ? 'Ir para o login' : 'Ir para o login e solicitar outro link'}
          </Link>
          {isInvite && <p>Para receber outro convite, entre em contato com o administrador da plataforma.</p>}
        </section>
      </main>
    )
  }

  const title = isInvite ? 'Defina sua senha' : 'Redefina sua senha'

  return (
    <main className="identity-access-page">
      <section className="identity-access-card" aria-labelledby="identity-credential-title">
        <span className="identity-access-icon">
          {isInvite ? <UserRoundPlus size={20} aria-hidden="true" /> : <KeyRound size={20} aria-hidden="true" />}
        </span>
        <h1 id="identity-credential-title">{title}</h1>
        <p>{isInvite
          ? 'Crie uma senha para ativar sua conta PlantãoMed. A permissão para o Assistente Clínico não é concedida automaticamente.'
          : 'Escolha e confirme uma nova senha. O link de recuperação é validado antes de exibir este formulário.'}</p>
        <form onSubmit={submit} noValidate>
          <label className="identity-access-field" htmlFor={`${flow}-password`}>
            <span>{isInvite ? 'Senha' : 'Nova senha'}</span>
            <span className="identity-access-password">
              <input
                id={`${flow}-password`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                aria-describedby={`${flow}-password-hint`}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFormError('')
                }}
              />
              <button
                type="button"
                className="identity-access-password-toggle"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </span>
          </label>
          <p id={`${flow}-password-hint`} className={passwordIssue ? 'identity-access-validation is-invalid' : 'identity-access-validation'}>
            {passwordIssue || 'Mínimo de 8 caracteres.'}
          </p>
          <label className="identity-access-field" htmlFor={`${flow}-confirmation`}>
            <span>Confirme a senha</span>
            <span className="identity-access-password">
              <input
                id={`${flow}-confirmation`}
                type={showConfirmation ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmation}
                aria-describedby={`${flow}-confirmation-hint`}
                onChange={(event) => {
                  setConfirmation(event.target.value)
                  setFormError('')
                }}
              />
              <button
                type="button"
                className="identity-access-password-toggle"
                aria-label={showConfirmation ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                aria-pressed={showConfirmation}
                onClick={() => setShowConfirmation((visible) => !visible)}
              >
                {showConfirmation ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </span>
          </label>
          <p id={`${flow}-confirmation-hint`} className={confirmationIssue ? 'identity-access-validation is-invalid' : 'identity-access-validation'}>
            {confirmationIssue || (confirmation ? 'As senhas coincidem.' : 'Digite novamente a senha escolhida.')}
          </p>
          {formError && <p className="identity-access-error" role="alert">{formError}</p>}
          <button type="submit" className="identity-access-submit" disabled={busy || !password || !confirmation}>
            {busy ? 'Salvando...' : isInvite ? 'Ativar conta' : 'Salvar nova senha'}
          </button>
        </form>
        <Link to="/login" className="identity-access-back"><ArrowLeft size={15} aria-hidden="true" /> Voltar ao login</Link>
      </section>
    </main>
  )
}

export function InviteAcceptancePage() {
  return <IdentityCredentialPage flow="invite" />
}

export function PasswordResetPage() {
  return <IdentityCredentialPage flow="recovery" />
}
