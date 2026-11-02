import { ExternalLink, Pill } from 'lucide-react'

const medicationSources = [
  {
    title: 'Consulta de medicamentos registrados',
    organization: 'Anvisa',
    detail: 'Pesquisa oficial de produtos e registros sanitários.',
    url: 'https://consultas.anvisa.gov.br/#/medicamentos/',
  },
  {
    title: 'Bulário Eletrônico',
    organization: 'Anvisa',
    detail: 'Acesso às bulas disponibilizadas pela autoridade sanitária.',
    url: 'https://consultas.anvisa.gov.br/#/bulario/',
  },
  {
    title: 'Rename',
    organization: 'Ministério da Saúde',
    detail: 'Relação Nacional de Medicamentos Essenciais e informações do SUS.',
    url: 'https://www.gov.br/saude/pt-br/composicao/sectics/daf/rename',
  },
]

export function MedicationsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow"><Pill size={14} aria-hidden="true" /> Consulta farmacológica</span>
        <h1 data-page-heading tabIndex={-1}>Medicamentos</h1>
        <p>Consulte informações regulatórias nas fontes oficiais. Não há registros de produtos verificados individualmente neste catálogo.</p>
      </header>

      <section className="medications-panel">
        <h2>Catálogo farmacológico</h2>
        <p>Nenhum medicamento foi verificado individualmente neste catálogo. Consulte as fontes regulatórias abaixo para informações vigentes sobre registro, bula e acesso pelo SUS.</p>
      </section>

      <section className="dashboard-section">
        <div className="section-heading"><div><span className="eyebrow">Referências regulatórias</span><h2>Fontes oficiais</h2></div></div>
        <div className="official-source-grid">
          {medicationSources.map((source) => (
            <a key={source.title} href={source.url} target="_blank" rel="noreferrer" className="official-source-card">
              <span className="eyebrow">{source.organization}</span>
              <strong>{source.title}</strong>
              <small>{source.detail}</small>
              <span className="source-card-link">Abrir fonte <ExternalLink size={14} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
