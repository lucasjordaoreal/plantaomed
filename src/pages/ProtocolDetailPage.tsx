import { useEffect } from 'react'
import { ArrowLeft, ChevronRight, Heart } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useLibraryState } from '../app/useLibraryState'
import { protocols } from '../data/protocols'
import { getProtocolSectionsForDisplay, getProtocolSummaryForDisplay, isProtocolApproved } from '../utils/protocolValidation'
import { NotFoundPage } from './NotFoundPage'

export function ProtocolDetailPage() {
  const { protocolId = '' } = useParams()
  const location = useLocation()
  const { favorites, toggleFavoriteId, recordHistory } = useLibraryState()
  const routeState = location.state as { from?: unknown } | null
  const returnTo = typeof routeState?.from === 'string' ? routeState.from : '/protocolos'
  const protocol = protocols.find((item) => item.id === protocolId)

  useEffect(() => {
    if (protocol) recordHistory(protocol.id)
  }, [protocol, recordHistory])

  if (!protocol) return <NotFoundPage />

  const approved = isProtocolApproved(protocol)
  const favorite = favorites.includes(protocol.id)
  return (
    <div className="page-stack">
      <Link className="back-link" to={returnTo}><ArrowLeft size={16} aria-hidden="true" /> {returnTo.startsWith('/protocolos') ? 'Biblioteca' : 'Voltar'}</Link>
      <article className="protocol-detail protocol-detail-page">
        <header className="protocol-detail__header">
          <div><span className="eyebrow">{protocol.category}</span><h1 data-page-heading tabIndex={-1}>{protocol.title}</h1></div>
          <button type="button" className={`action-button${favorite ? ' is-favorite' : ''}`} onClick={() => toggleFavoriteId(protocol.id)} aria-pressed={favorite}>
            <Heart size={17} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />{favorite ? 'Salvo' : 'Salvar'}
          </button>
        </header>
        {approved ? (
          <>
            <p className="validation-status is-approved" role="status">Aprovado para exibição · {protocol.reviewedBy} · {protocol.reviewedAt}</p>
            <p className="protocol-population">{protocol.population}</p>
            <div className="detail-summary">
              <div><h2>Resumo</h2><p>{getProtocolSummaryForDisplay(protocol)}</p></div>
              <div><h2>Contexto assistencial</h2><p>{protocol.context}</p></div>
            </div>
            <div className="clinical-sections">
              {getProtocolSectionsForDisplay(protocol).map((section) => (
                <section key={section.key}><h2>{section.label}</h2><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>
              ))}
            </div>
          </>
        ) : (
          <div className="legacy-reference">
            <p className="validation-status" role="status">Conteúdo não validado para uso assistencial</p>
            <Link to="/diretrizes">Consultar documentos oficiais <ChevronRight size={15} aria-hidden="true" /></Link>
          </div>
        )}
        <section className="reference-panel">
          <h2>Referências e metadados</h2>
          <ul>{protocol.references.map((reference) => <li key={reference}>{reference}</li>)}</ul>
          {protocol.sourceReferences.map((reference) => (
            <p key={reference.url}>
              <a href={reference.url} target="_blank" rel="noreferrer">{reference.title} — {reference.organization}</a>
              {reference.documentVersion ? ` · ${reference.documentVersion}` : ''}{` · consultado em ${reference.consultedAt}`}
            </p>
          ))}
          <p>Versão {protocol.version} · Data registrada: {protocol.lastReviewed}</p>
          {protocol.sourcePublishedAt && <p>Publicação da fonte: {protocol.sourcePublishedAt}</p>}
          {protocol.sourceConsultedAt && <p>Consulta da fonte: {protocol.sourceConsultedAt}</p>}
        </section>
      </article>
    </div>
  )
}
