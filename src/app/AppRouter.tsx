import { lazy, Suspense, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useIdentityAuth, hasClinicalAssistantAccess } from '../auth/useIdentityAuth'
import { isIdentityCallbackHash } from '../auth/identityCallback'
import { AppLayout } from './AppLayout'
import { AboutPage } from '../pages/AboutPage'
import { ClinicalAssistantPage } from '../pages/ClinicalAssistantPage'
import { ClinicalAssistantLoginPage } from '../pages/ClinicalAssistantLoginPage'
import { InviteAcceptancePage, PasswordResetPage } from '../pages/IdentityCredentialPages'
import { FavoritesPage } from '../pages/FavoritesPage'
import { GuidelinesPage } from '../pages/GuidelinesPage'
import { HistoryPage } from '../pages/HistoryPage'
import { HomePage } from '../pages/HomePage'
import { LibraryPage } from '../pages/LibraryPage'
import { MedicationsPage } from '../pages/MedicationsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PresentationDetailPage } from '../pages/PresentationDetailPage'
import { ProtocolDetailPage } from '../pages/ProtocolDetailPage'
import { SymptomsPage } from '../pages/SymptomsPage'
import { getOnboardingCompleted } from '../lib/storage'
import { OnboardingTransition } from '../components/transitions/OnboardingTransition'

function getOnboardingTransition(state: unknown) {
  if (!state || typeof state !== 'object' || !('onboardingTransition' in state)) return null
  const transition = state.onboardingTransition
  if (
    !transition
    || typeof transition !== 'object'
    || !('id' in transition)
    || !('x' in transition)
    || !('y' in transition)
  ) return null
  const { id, x, y } = transition
  if (
    typeof id !== 'string'
    || typeof x !== 'number'
    || typeof y !== 'number'
    || !Number.isFinite(x)
    || !Number.isFinite(y)
    || x < 0
    || x > 1
    || y < 0
    || y > 1
  ) return null
  return { id, x, y }
}

const CalculatorsPage = lazy(() => import('../pages/CalculatorsPage').then(({ CalculatorsPage: page }) => ({ default: page })))

function ProtectedClinicalAssistant() {
  const { user, status, logout } = useIdentityAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="page-stack" role="status">Verificando sessão do Assistente Clínico...</div>
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (!hasClinicalAssistantAccess(user)) {
    return (
      <div className="page-stack">
        <header className="page-heading">
          <h1 data-page-heading tabIndex={-1}>Acesso não habilitado</h1>
          <p>Esta conta não possui a permissão necessária para o Assistente Clínico.</p>
        </header>
        <section className="clinical-assistant__notice" role="alert">
          <div>
            <strong>Área restrita</strong>
            <p>Solicite ao administrador que habilite a função clínica para sua conta. Biblioteca, Medicamentos e Diretrizes continuam acessíveis.</p>
            <button type="button" className="clinical-assistant__secondary-button" onClick={() => void logout()}>Sair</button>
          </div>
        </section>
      </div>
    )
  }
  return <ClinicalAssistantPage />
}

export function AppRouter() {
  const location = useLocation()
  const navigate = useNavigate()
  const onboardingTransition = getOnboardingTransition(location.state)
  const callbackRedirectHandled = useRef(false)
  const { status, callbackType, callbackErrorType, callbackError } = useIdentityAuth()

  useEffect(() => {
    if (status === 'loading') return

    const activeCallback = callbackType ?? callbackErrorType
    if (activeCallback === 'invite' || activeCallback === 'recovery') {
      if (callbackRedirectHandled.current) return
      callbackRedirectHandled.current = true
      const callbackPath = activeCallback === 'invite' ? '/aceitar-convite' : '/redefinir-senha'
      if (location.pathname !== callbackPath) navigate(callbackPath, { replace: true })
      return
    }

    const hash = window.location.hash
    if (hash) {
      if (isIdentityCallbackHash(hash)) return
      const legacyRoute = hash.slice(1)

      if (legacyRoute.startsWith('/')) {
        const [legacyPath, ...queryParts] = legacyRoute.split('?')
        const destination = legacyPath === '/documentos' ? '/diretrizes' : legacyPath || '/inicio'
        const query = queryParts.length ? `?${queryParts.join('?')}` : ''
        navigate(`${destination}${query}`, { replace: true })
        return
      }

      const [legacyPath, ...queryParts] = legacyRoute.split('?')
      const destinations: Record<string, string> = {
        inicio: '/inicio',
        protocolos: '/protocolos',
        documentos: '/diretrizes',
        diretrizes: '/diretrizes',
        medicamentos: '/medicamentos',
        calculadoras: '/calculadoras',
        sintomas: '/sinais-e-sintomas',
        'sinais-e-sintomas': '/sinais-e-sintomas',
        favoritos: '/favoritos',
        historico: '/historico',
        sobre: '/sobre',
      }
      const destination = destinations[legacyPath]
      if (destination) {
        const query = queryParts.length ? `?${queryParts.join('?')}` : ''
        navigate(`${destination}${query}`, { replace: true })
      }
      return
    }

    if (location.pathname === '/') {
      navigate(getOnboardingCompleted() ? '/inicio' : '/boas-vindas', { replace: true })
    }
  }, [status, callbackType, callbackErrorType, location.pathname, navigate])

  return (
    <>
      {callbackError && callbackErrorType !== 'invite' && callbackErrorType !== 'recovery' && (
        <p className="identity-session__error" role="alert">{callbackError}</p>
      )}
      <Routes>
        <Route path="boas-vindas" element={<OnboardingPage />} />
        <Route path="login" element={<ClinicalAssistantLoginPage />} />
        <Route path="recuperar-senha" element={<ClinicalAssistantLoginPage />} />
        <Route path="aceitar-convite" element={<InviteAcceptancePage />} />
        <Route path="redefinir-senha" element={<PasswordResetPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="inicio" element={<HomePage />} />
          <Route path="protocolos" element={<LibraryPage />} />
          <Route path="protocolos/:protocolId" element={<ProtocolDetailPage />} />
          <Route path="sinais-e-sintomas" element={<SymptomsPage />} />
          <Route path="sinais-e-sintomas/:presentationId" element={<PresentationDetailPage />} />
          <Route path="diretrizes" element={<GuidelinesPage />} />
          <Route path="medicamentos" element={<MedicationsPage />} />
          <Route path="calculadoras" element={<Suspense fallback={<div className="page-stack" role="status">Carregando calculadoras...</div>}><CalculatorsPage /></Suspense>} />
          <Route path="calculadoras/:calculatorId" element={<Suspense fallback={<div className="page-stack" role="status">Carregando calculadora...</div>}><CalculatorsPage /></Suspense>} />
          <Route path="assistente-clinico" element={<ProtectedClinicalAssistant />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="historico" element={<HistoryPage />} />
          <Route path="sobre" element={<AboutPage />} />
          <Route path="documentos" element={<Navigate to="/diretrizes" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      {onboardingTransition && (
        <OnboardingTransition
          key={onboardingTransition.id}
          id={onboardingTransition.id}
          x={onboardingTransition.x}
          y={onboardingTransition.y}
        />
      )}
    </>
  )
}
