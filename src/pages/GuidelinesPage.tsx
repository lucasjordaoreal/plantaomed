import { OfficialDocumentCatalog } from '../components/OfficialDocumentCatalog'

export function GuidelinesPage() {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">Fontes oficiais</span>
        <h1 data-page-heading tabIndex={-1}>Diretrizes e documentos</h1>
        <p>Pesquise referências institucionais e acesse os documentos originais. A vigência deve ser conferida na fonte.</p>
      </header>
      <OfficialDocumentCatalog />
    </div>
  )
}
