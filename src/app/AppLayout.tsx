import { useEffect, useRef, useState } from 'react'
import { Activity, BookOpen, Bookmark, Clock3, Home, Info, LogOut, Menu, Pill, Search, Stethoscope } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { branding } from '../config/branding'
import { GlobalSearch } from '../components/GlobalSearch'
import { useIdentityAuth } from '../auth/useIdentityAuth'

type NavigationLink = {
  to: string
  label: string
  icon: typeof Home
  end: boolean
  shortLabel?: string
}

const mainLinks: NavigationLink[] = [
  { to: '/inicio', label: 'Início', icon: Home, end: true },
  { to: '/protocolos', label: 'Biblioteca', icon: Stethoscope, end: false },
  { to: '/sinais-e-sintomas', label: 'Sinais e sintomas', icon: Search, end: false },
  { to: '/diretrizes', label: 'Diretrizes', icon: BookOpen, end: true },
  { to: '/medicamentos', label: 'Medicamentos', icon: Pill, end: true },
  { to: '/calculadoras', label: 'Calculadoras', icon: Activity, end: true },
  { to: '/favoritos', label: 'Favoritos', icon: Bookmark, end: true },
  { to: '/historico', label: 'Histórico', icon: Clock3, end: true },
  { to: '/sobre', label: 'Sobre', icon: Info, end: true },
]

const mobileLinks: NavigationLink[] = [
  mainLinks[0],
  mainLinks[1],
  { ...mainLinks[2], shortLabel: 'Sintomas' },
  mainLinks[6],
]
const moreLinks = mainLinks.filter(({ to }) => ['/diretrizes', '/medicamentos', '/calculadoras', '/historico', '/sobre'].includes(to))
const clinicalAssistantLink: NavigationLink = {
  to: '/assistente-clinico',
  label: 'Assistente Clínico',
  icon: Stethoscope,
  end: true,
}

function RouteEffects() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef<string | null>(null)

  useEffect(() => {
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname
    const heading = document.querySelector<HTMLElement>('[data-page-heading]')
    heading?.focus({ preventScroll: true })

    if (location.pathname === '/protocolos' && navigationType === 'POP') {
      const savedPageY = sessionStorage.getItem('plantaomed:library-page-scroll')
      const savedListY = sessionStorage.getItem('plantaomed:library-list-scroll')
      if (savedPageY !== null || savedListY !== null) {
        requestAnimationFrame(() => {
          const list = document.querySelector<HTMLElement>('.protocol-list')
          if (list && savedListY !== null) list.scrollTop = Number(savedListY)
          if (savedPageY !== null) window.scrollTo({ top: Number(savedPageY), behavior: 'instant' })
        })
      }
      return
    }

    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname, navigationType])

  return null
}

export function AppLayout() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const { user, logout, error: authError } = useIdentityAuth()
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const moreActive = ['/diretrizes', '/medicamentos', '/calculadoras', '/historico', '/sobre', clinicalAssistantLink.to].includes(location.pathname)

  useEffect(() => {
    if (!moreOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !moreMenuRef.current?.contains(event.target)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [moreOpen])

  return (
    <div className="app-shell">
      <RouteEffects />
      <header className="app-header glass-surface">
        <div className="app-header__inner">
          <Link className="brand-lockup" to="/inicio" aria-label={`${branding.commercialName} - início`}>
            <span className="brand-name">{branding.commercialName}</span>
          </Link>
          {user && (
            <div className="identity-session">
              <span className="identity-session__email">{user.email ?? 'Sessão autenticada'}</span>
              <button type="button" className="identity-session__logout" onClick={() => void logout()} aria-label="Encerrar sessão">
                <LogOut size={16} aria-hidden="true" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </header>
      {authError && <p className="identity-session__error" role="alert">{authError}</p>}

      <div className="app-frame">
        <aside className="desktop-sidebar glass-surface" aria-label="Navegação principal">
          <nav>
            <NavLink
              to={clinicalAssistantLink.to}
              end={clinicalAssistantLink.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
            >
              <Stethoscope size={18} aria-hidden="true" />
              <span>{clinicalAssistantLink.label}</span>
            </NavLink>
            {mainLinks.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="page-content" id="main-content" tabIndex={-1}>
          {location.pathname !== '/inicio' && <GlobalSearch />}
          <Outlet />
        </main>
      </div>

      <nav className="mobile-tab-bar glass-surface" aria-label="Navegação inferior">
        {mobileLinks.map(({ to, label, shortLabel, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `mobile-tab${isActive ? ' is-active' : ''}`}>
            <Icon size={19} aria-hidden="true" />
            <span>{shortLabel ?? label}</span>
          </NavLink>
        ))}
        <div className="mobile-more" ref={moreMenuRef}>
          <button type="button" className={`mobile-tab${moreActive ? ' is-active' : ''}`} aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>
            <Menu size={19} aria-hidden="true" />
            <span>Mais</span>
          </button>
          {moreOpen && (
            <div className="mobile-more__menu glass-surface" role="menu" aria-label="Mais páginas">
              {[clinicalAssistantLink, ...moreLinks].map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} role="menuitem" className={({ isActive }) => `mobile-more__link${isActive ? ' is-active' : ''}`} onClick={() => setMoreOpen(false)}>
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
