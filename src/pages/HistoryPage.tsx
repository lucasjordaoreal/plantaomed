import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Clock3, ExternalLink, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLibraryState } from '../app/useLibraryState'
import { getMedicalCatalogIndex } from '../lib/medicalCatalog'
import { protocols } from '../data/protocols'
import type { OfficialCatalogIndex } from '../types'

export function HistoryPage() {
  const { history, clearHistory } = useLibraryState()
  const [catalog, setCatalog] = useState<OfficialCatalogIndex | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const hasDocuments = history.some((id) => id.startsWith('document:'))

  useEffect(() => {
    if (!hasDocuments) return
    let active = true
    getMedicalCatalogIndex()
      .then((index) => {
        if (active) setCatalog(index)
      })
      .catch((error: unknown) => {
        if (active) setCatalogError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico documental.')
      })
    return () => {
      active = false
    }
  }, [hasDocuments])

  const documentEntries = useMemo(() => new Map(catalog?.searchEntries.map((entry) => [entry.id, entry]) ?? []), [catalog])
  const clear = () => {
    if (window.confirm('Limpar todo o histórico deste dispositivo?')) clearHistory()
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--actions">
        <div><span className="eyebrow"><Clock3 size={14} aria-hidden="true" /> Neste dispositivo</span><h1 data-page-heading tabIndex={-1}>Histórico</h1><p>Registros acessados recentemente, do mais novo ao mais antigo.</p></div>
        {history.length > 0 && <button type="button" className="action-button" onClick={clear}><Trash2 size={15} aria-hidden="true" /> Limpar histórico</button>}
      </header>

      {catalogError && <p className="catalog-error" role="alert">{catalogError}</p>}
      {history.length ? (
        <ol className="history-list">
          {history.map((id) => {
            if (id.startsWith('document:')) {
              const documentId = id.slice('document:'.length)
              const entry = documentEntries.get(documentId)
              if (!entry) {
                return (
                  <li key={id}>
                    <Link to={`/diretrizes?document=${encodeURIComponent(documentId)}`}>
                      <span>
                        <strong>{catalogError ? 'Documento oficial indisponível' : 'Carregando documento oficial…'}</strong>
                        <small>Documento · {documentId}</small>
                      </span>
                      <ExternalLink size={16} aria-hidden="true" />
                    </Link>
                  </li>
                )
              }
              return (
                <li key={id}>
                  <Link to={`/diretrizes?document=${encodeURIComponent(documentId)}`}>
                    <span><strong>{entry.title}</strong><small>Documento · {entry.specialty} · {entry.publicationYear ?? 'ano não informado'}</small></span>
                    <ExternalLink size={16} aria-hidden="true" />
                  </Link>
                </li>
              )
            }
            const protocol = protocols.find((item) => item.id === id)
            if (!protocol) return null
            return (
              <li key={id}>
                <Link to={`/protocolos/${protocol.id}`}>
                  <span><strong>{protocol.title}</strong><small>Protocolo · {protocol.category}</small></span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        <section className="empty-page-state">
          <Clock3 size={24} aria-hidden="true" />
          <h2>Seu histórico está vazio</h2>
          <p>Os protocolos e documentos que você abrir aparecerão aqui.</p>
          <Link className="action-button" to="/protocolos">Explorar Biblioteca <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
      )}
    </div>
  )
}
