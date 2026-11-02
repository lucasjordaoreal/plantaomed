import { useEffect, useRef, useState } from 'react'
import { Activity, BookOpen, Bookmark, Clock3, Home, Info, LogOut, Menu, Pill, Search, Stethoscope } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigationType } from 'react-router-dom'
import { branding } from '../config/branding'
import { useIdentityAuth } from '../auth/useIdentityAuth'
import { RouteTransition } from '../components/transitions/RouteTransition'
import { calculateMobileTabBarOffset } from './mobileTabBarAvoidance'

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
  const moreActive = ['/diretrizes', '/medicamentos', '/calculadoras', '/historico', '/sobre', clinicalAssistantLink.to]
    .some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))

  useEffect(() => {
    const appShell = document.querySelector<HTMLElement>('.app-shell')
    const tabBar = appShell?.querySelector<HTMLElement>('.mobile-tab-bar')
    if (!appShell || !tabBar) return

    const overlaySelector = 'iframe, [id^="nl-"], [class*="nl-"], [id*="netlify"], [class*="netlify"]'
    let scheduledFrame: number | null = null
    const usesAnimationFrame = typeof window.requestAnimationFrame === 'function'
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleMeasurement)

    const getOverlayElements = () => {
      const tabZIndex = Number.parseInt(window.getComputedStyle(tabBar).zIndex, 10) || 0
      const overlays = new Set<Element>()

      document.querySelectorAll(overlaySelector).forEach((element) => {
        if (tabBar.contains(element)) return

        let fixedElement: Element | null = element
        while (fixedElement && fixedElement !== document.body && window.getComputedStyle(fixedElement).position !== 'fixed') {
          fixedElement = fixedElement.parentElement
        }
        if (!fixedElement || fixedElement === document.body) return

        const elementStyle = window.getComputedStyle(element)
        const fixedStyle = window.getComputedStyle(fixedElement)
        const zIndex = Number.parseInt(fixedStyle.zIndex, 10)
        const opacity = Number.parseFloat(fixedStyle.opacity)
        if (
          elementStyle.pointerEvents === 'none'
          || fixedStyle.display === 'none'
          || fixedStyle.visibility === 'hidden'
          || opacity === 0
          || !Number.isFinite(zIndex)
          || zIndex <= tabZIndex
        ) return

        overlays.add(fixedElement)
      })

      return [...overlays]
    }

    const updateAvoidance = () => {
      scheduledFrame = null
      const currentOffset = appShell.style.getPropertyValue('--mobile-tab-obstruction')
      const inlineTransition = tabBar.style.transition
      tabBar.style.transition = 'none'
      appShell.style.setProperty('--mobile-tab-obstruction', '0px')
      const tabRect = tabBar.getBoundingClientRect()
      if (currentOffset) appShell.style.setProperty('--mobile-tab-obstruction', currentOffset)
      else appShell.style.removeProperty('--mobile-tab-obstruction')
      tabBar.style.transition = inlineTransition
      const offset = window.innerWidth <= 920
        ? calculateMobileTabBarOffset(tabRect, getOverlayElements().map((element) => element.getBoundingClientRect()))
        : 0
      appShell.style.setProperty('--mobile-tab-obstruction', `${offset}px`)
    }

    function scheduleMeasurement() {
      if (scheduledFrame !== null) return
      scheduledFrame = usesAnimationFrame
        ? window.requestAnimationFrame(updateAvoidance)
        : window.setTimeout(updateAvoidance, 0)
    }

    const hasOverlayCandidate = (node: Node) => {
      if (!(node instanceof Element)) return false
      return node.matches(overlaySelector) || Boolean(node.querySelector(overlaySelector))
    }

    const refreshObservedElements = () => {
      resizeObserver?.disconnect()
      resizeObserver?.observe(tabBar)
      getOverlayElements().forEach((element) => resizeObserver?.observe(element))
      scheduleMeasurement()
    }

    const mutationObserver = new MutationObserver((records) => {
      const overlayChanged = records.some((record) => {
        if (record.type === 'attributes') return hasOverlayCandidate(record.target)
        return [...record.addedNodes, ...record.removedNodes].some(hasOverlayCandidate)
      })
      if (overlayChanged) refreshObservedElements()
    })

    mutationObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'id', 'style'],
    })
    refreshObservedElements()
    window.addEventListener('resize', scheduleMeasurement)
    window.addEventListener('orientationchange', scheduleMeasurement)
    window.visualViewport?.addEventListener('resize', scheduleMeasurement)

    return () => {
      mutationObserver.disconnect()
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleMeasurement)
      window.removeEventListener('orientationchange', scheduleMeasurement)
      window.visualViewport?.removeEventListener('resize', scheduleMeasurement)
      if (scheduledFrame !== null) {
        if (usesAnimationFrame) window.cancelAnimationFrame(scheduledFrame)
        else window.clearTimeout(scheduledFrame)
      }
      appShell.style.removeProperty('--mobile-tab-obstruction')
    }
  }, [])

  useEffect(() => {
    if (!window.matchMedia) return
    const desktopBreakpoint = window.matchMedia('(min-width: 921px)')
    const closeMoreOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMoreOpen(false)
    }
    desktopBreakpoint.addEventListener?.('change', closeMoreOnDesktop)
    return () => desktopBreakpoint.removeEventListener?.('change', closeMoreOnDesktop)
  }, [])

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
          <RouteTransition />
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
          <button
            type="button"
            className={`mobile-tab${moreActive ? ' is-active' : ''}`}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-current={moreActive ? 'page' : undefined}
            aria-controls="mobile-more-menu"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <Menu size={19} aria-hidden="true" />
            <span>Mais</span>
          </button>
          {moreOpen && (
            <div id="mobile-more-menu" className="mobile-more__menu glass-surface" role="menu" aria-label="Mais páginas">
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
