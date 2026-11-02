import { OfficialDocumentCatalog } from '../components/OfficialDocumentCatalog'
import { SharePageButton } from '../components/SharePageButton'

export function GuidelinesPage() {
  return (
    <div className="page-stack">
      <header className="page-heading page-heading--actions">
        <div>
          <span className="eyebrow">Fontes oficiais</span>
          <h1 data-page-heading tabIndex={-1}>Diretrizes e documentos</h1>
          <p>Pesquise referências institucionais e acesse os documentos originais. A vigência deve ser conferida na fonte.</p>
        </div>
        <SharePageButton />
      </header>
      <OfficialDocumentCatalog />
    </div>
  )
}
