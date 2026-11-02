import { useEffect, useState } from 'react'
import { ArrowRight, Clock3, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GlobalSearch } from '../components/GlobalSearch'
import { ProtocolCard } from '../components/ProtocolCard'
import { useLibraryState } from '../app/useLibraryState'
import { categories } from '../data/categories'
import { protocols } from '../data/protocols'
import { getMedicalCatalogIndex } from '../lib/medicalCatalog'
import type { CatalogSearchEntry } from '../types'

export function HomePage() {
  const { favorites, history, toggleFavoriteId } = useLibraryState()
  const [documentEntries, setDocumentEntries] = useState<Map<string, CatalogSearchEntry>>(() => new Map())
  const [documentHistoryError, setDocumentHistoryError] = useState('')
  const favoriteProtocols = favorites
    .map((id) => protocols.find((protocol) => protocol.id === id))
    .filter((protocol): protocol is (typeof protocols)[number] => Boolean(protocol))
    .slice(0, 3)
  const hasDocumentHistory = history.some((id) => id.startsWith('document:'))
  const recentHistory = history
    .filter((id) => id.startsWith('document:') || !favorites.includes(id))
    .slice(0, 3)
  const hasRecentHistory = recentHistory.length > 0
  useEffect(() => {
    if (!hasDocumentHistory) return
    let active = true
    getMedicalCatalogIndex()
      .then((index) => {
        if (active) setDocumentEntries(new Map(index.searchEntries.map((entry) => [entry.id, entry])))
      })
      .catch((error: unknown) => {
        if (active) setDocumentHistoryError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico de documentos.')
      })
    return () => {
      active = false
    }
  }, [hasDocumentHistory])
  return (
    <div className="page-stack dashboard-page">
      <section className="dashboard-hero">
        <span className="eyebrow"><span className="eyebrow-dot" /> Consulta clínica</span>
        <h1 data-page-heading tabIndex={-1}>PlantãoMed</h1>
        <p>Pesquise temas clínicos, apresentações e documentos oficiais.</p>
        <GlobalSearch prominent />
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div><span className="eyebrow">Navegue por área</span><h2>Especialidades</h2></div>
          <Link className="text-link" to="/protocolos">Ver biblioteca <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <div className="dashboard-categories">
          {categories.map((category) => {
            const count = protocols.filter((protocol) => protocol.category === category.name).length
            return (
              <Link key={category.id} to={`/protocolos?especialidade=${encodeURIComponent(category.name)}`} className="dashboard-category">
                <span>{category.name}</span>
                <small>{count} {count === 1 ? 'tema' : 'temas'}</small>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </section>

      {(favoriteProtocols.length > 0 || hasRecentHistory) && (
        <div className="dashboard-personal">
          {favoriteProtocols.length > 0 && (
            <section className="dashboard-section">
              <div className="section-heading">
                <div><span className="eyebrow"><Heart size={13} aria-hidden="true" /> Seus salvos</span><h2>Favoritos recentes</h2></div>
                <Link className="text-link" to="/favoritos">Ver todos <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className="saved-list">
                {favoriteProtocols.map((protocol) => (
                  <ProtocolCard key={protocol.id} protocol={protocol} favorite onToggleFavorite={toggleFavoriteId} />
                ))}
              </div>
            </section>
          )}
          {hasRecentHistory && (
            <section className="dashboard-section">
              <div className="section-heading">
                <div><span className="eyebrow"><Clock3 size={13} aria-hidden="true" /> Neste dispositivo</span><h2>Vistos recentemente</h2></div>
                <Link className="text-link" to="/historico">Ver histórico <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className="saved-list">
                {recentHistory.map((id) => {
                  if (id.startsWith('document:')) {
                    const documentId = id.slice('document:'.length)
                    const entry = documentEntries.get(documentId)
                    return (
                      <Link key={id} className="home-history-row" to={`/diretrizes?document=${encodeURIComponent(documentId)}`}>
                        <span><strong>{entry?.title ?? 'Documento oficial'}</strong><small>{entry ? `Documento · ${entry.specialty} · ${entry.publicationYear}` : 'Documento salvo no histórico'}</small></span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    )
                  }
                  const protocol = protocols.find((item) => item.id === id)
                  return protocol ? (
                    <ProtocolCard key={id} protocol={protocol} favorite={favorites.includes(protocol.id)} onToggleFavorite={toggleFavoriteId} />
                  ) : null
                })}
                {documentHistoryError && <p className="catalog-error" role="alert">{documentHistoryError}</p>}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
