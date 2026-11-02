import { useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { GlobalSearch } from '../GlobalSearch'

type TransitionDirection = 'page' | 'detail-forward' | 'detail-back'

type ActiveTransition = {
  pathname: string
  direction: TransitionDirection
}

function getDetailParent(pathname: string) {
  const match = pathname.match(/^\/(protocolos|calculadoras|sinais-e-sintomas)\/[^/]+$/)
  return match ? `/${match[1]}` : null
}

function getDirection(previousPath: string, pathname: string): TransitionDirection {
  if (getDetailParent(pathname) === previousPath) return 'detail-forward'
  if (getDetailParent(previousPath) === pathname) return 'detail-back'
  return 'page'
}

export function RouteTransition() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef<string | null>(null)
  const [activeTransition, setActiveTransition] = useState<ActiveTransition | null>(null)

  useLayoutEffect(() => {
    const previous = previousPath.current
    if (previous && previous !== location.pathname && navigationType !== 'REPLACE') {
      setActiveTransition({
        pathname: location.pathname,
        direction: getDirection(previous, location.pathname),
      })
    } else {
      setActiveTransition(null)
    }
    previousPath.current = location.pathname
  }, [location.key, location.pathname, navigationType])

  const direction = activeTransition?.pathname === location.pathname
    ? activeTransition.direction
    : null

  return (
    <div
      key={location.pathname}
      className={`route-transition__page${direction ? ` route-transition__page--${direction}` : ''}`}
      data-route-transition={direction ?? 'none'}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          setActiveTransition((current) => current?.pathname === location.pathname ? null : current)
        }
      }}
    >
      {location.pathname !== '/inicio' && <GlobalSearch />}
      <Outlet />
    </div>
  )
}
