import { ExternalLink } from 'lucide-react'
import { branding } from '../config/branding'
import { officialSources } from '../data/sources'

export function AboutPage() {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">Projeto</span>
        <h1 data-page-heading tabIndex={-1}>Sobre o {branding.commercialName}</h1>
        <p>{branding.description}</p>
      </header>

      <section className="about-content">
        <article>
          <h2>Objetivo</h2>
          <p>Organizar referências e metadados para consulta, pesquisa e desenvolvimento de conteúdo. O catálogo documental não substitui avaliação profissional, protocolos institucionais nem revisão clínica.</p>
        </article>
        <article>
          <h2>Fontes e atualização</h2>
          <p>As referências são organizadas a partir de portais institucionais. Links catalogados e metadados não significam que um documento tenha sido individualmente verificado ou aprovado.</p>
          <ul className="institution-list">
            {officialSources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={13} aria-hidden="true" /></a>
                <small>{source.organization} · {source.scope}</small>
              </li>
            ))}
          </ul>
        </article>
        <article>
          <h2>Privacidade</h2>
          <p>Favoritos e histórico ficam armazenados localmente neste dispositivo. O projeto não apresenta esses dados como registros de conta ou sincronização entre dispositivos.</p>
        </article>
        <article>
          <h2>Versão</h2>
          <p>{branding.commercialName} · versão {branding.appVersion} · aplicação web progressiva.</p>
        </article>
      </section>
    </div>
  )
}
