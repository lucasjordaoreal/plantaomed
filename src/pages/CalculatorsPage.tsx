import { Activity } from 'lucide-react'

export function CalculatorsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow"><Activity size={14} aria-hidden="true" /> Ferramentas clínicas</span>
        <h1 data-page-heading tabIndex={-1}>Calculadoras</h1>
        <p>Escores e calculadoras serão disponibilizados quando critérios, fórmulas e casos de referência estiverem documentados.</p>
      </header>
      <section className="medications-panel">
        <h2>Nenhuma calculadora catalogada</h2>
        <p>Não há fórmulas implementadas nesta versão. Nenhum resultado ou orientação clínica é calculado.</p>
      </section>
    </div>
  )
}
