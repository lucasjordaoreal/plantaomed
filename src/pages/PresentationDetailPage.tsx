import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { clinicalPresentations } from '../data/clinicalPresentations'
import { NotFoundPage } from './NotFoundPage'

export function PresentationDetailPage() {
  const { presentationId = '' } = useParams()
  const presentation = clinicalPresentations.find(({ id }) => id === presentationId)

  if (!presentation) return <NotFoundPage />

  return (
    <div className="page-stack">
      <Link className="back-link" to="/sinais-e-sintomas"><ArrowLeft size={16} aria-hidden="true" /> Sinais e sintomas</Link>
      <article className="protocol-detail protocol-detail-page">
        <header className="protocol-detail__header">
          <div><span className="eyebrow">{presentation.group}</span><h1 data-page-heading tabIndex={-1}>{presentation.name}</h1></div>
        </header>
        <section className="reference-panel presentation-index-note">
          <h2>Índice de apresentações</h2>
          <p>Termo catalogado a partir da lista solicitada. Não há referências, relações diagnósticas, algoritmos ou condutas associados.</p>
        </section>
      </article>
    </div>
  )
}
