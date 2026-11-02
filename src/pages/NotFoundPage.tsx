import { ArrowLeft, Home } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <section className="empty-page-state not-found-page">
      <span className="eyebrow">Erro 404</span>
      <h1 data-page-heading tabIndex={-1}>Página não encontrada</h1>
      <p>O endereço solicitado não corresponde a uma página do PlantãoMed.</p>
      <div>
        <Link className="action-button" to="/inicio"><Home size={15} aria-hidden="true" /> Ir ao Início</Link>
        <button type="button" className="action-button" onClick={() => navigate(-1)}><ArrowLeft size={15} aria-hidden="true" /> Voltar</button>
      </div>
    </section>
  )
}
