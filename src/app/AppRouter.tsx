import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { AboutPage } from '../pages/AboutPage'
import { CalculatorsPage } from '../pages/CalculatorsPage'
import { FavoritesPage } from '../pages/FavoritesPage'
import { GuidelinesPage } from '../pages/GuidelinesPage'
import { HistoryPage } from '../pages/HistoryPage'
import { HomePage } from '../pages/HomePage'
import { LibraryPage } from '../pages/LibraryPage'
import { MedicationsPage } from '../pages/MedicationsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PresentationDetailPage } from '../pages/PresentationDetailPage'
import { ProtocolDetailPage } from '../pages/ProtocolDetailPage'
import { SymptomsPage } from '../pages/SymptomsPage'

export function AppRouter() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) {
      if (location.pathname === '/') navigate('/inicio', { replace: true })
      return
    }

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
  }, [location.pathname, location.search, navigate])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="inicio" element={<HomePage />} />
        <Route path="protocolos" element={<LibraryPage />} />
        <Route path="protocolos/:protocolId" element={<ProtocolDetailPage />} />
        <Route path="sinais-e-sintomas" element={<SymptomsPage />} />
        <Route path="sinais-e-sintomas/:presentationId" element={<PresentationDetailPage />} />
        <Route path="diretrizes" element={<GuidelinesPage />} />
        <Route path="medicamentos" element={<MedicationsPage />} />
        <Route path="calculadoras" element={<CalculatorsPage />} />
        <Route path="favoritos" element={<FavoritesPage />} />
        <Route path="historico" element={<HistoryPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="documentos" element={<Navigate to="/diretrizes" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
