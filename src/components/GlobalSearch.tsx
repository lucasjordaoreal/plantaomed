import { useEffect, useId, useMemo, useState } from 'react'
import { BookOpen, Search, Stethoscope } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { protocols } from '../data/protocols'
import { searchClinicalPresentations } from '../data/clinicalPresentations'
import { getMedicalCatalogIndex } from '../lib/medicalCatalog'
import { searchProtocols } from '../utils/search'
import type { CatalogSearchEntry, OfficialCatalogIndex, Protocol } from '../types'

type Props = {
  prominent?: boolean
}

function documentMatches(entry: CatalogSearchEntry, query: string): boolean {
  return `${entry.title} ${entry.specialty} ${entry.type} ${entry.publicationYear} ${entry.organization} ${entry.version ?? ''}`
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes(query.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
}

export function GlobalSearch({ prominent = false }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const resultsId = useId()
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<OfficialCatalogIndex | null>(null)
  const [error, setError] = useState('')
  const normalizedQuery = query.trim()

  useEffect(() => {
    if (normalizedQuery.length < 2 || catalog) return
    let active = true
    getMedicalCatalogIndex()
      .then((index) => {
        if (active) setCatalog(index)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao pesquisar documentos.')
      })
    return () => {
      active = false
    }
  }, [normalizedQuery, catalog])

  const protocolResults = useMemo(
    () => normalizedQuery ? searchProtocols(normalizedQuery, protocols).slice(0, 4) : [],
    [normalizedQuery],
  )
  const presentationResults = useMemo(
    () => normalizedQuery ? searchClinicalPresentations(normalizedQuery).slice(0, 4) : [],
    [normalizedQuery],
  )
  const documentResults = useMemo(
    () => normalizedQuery && catalog
      ? catalog.searchEntries.filter((entry) => documentMatches(entry, normalizedQuery)).slice(0, 4)
      : [],
    [catalog, normalizedQuery],
  )
  const hasResults = protocolResults.length > 0 || presentationResults.length > 0 || documentResults.length > 0

  const openProtocol = (protocol: Protocol) => {
    setQuery('')
    navigate(`/protocolos/${protocol.id}`, { state: { from: `${location.pathname}${location.search}` } })
  }
  const openDocument = (entry: CatalogSearchEntry) => {
    setQuery('')
    navigate(`/diretrizes?document=${encodeURIComponent(entry.id)}`)
  }
  const openPresentation = (presentationId: string) => {
    setQuery('')
    navigate(`/sinais-e-sintomas/${presentationId}`)
  }

  return (
    <div className={`global-search${prominent ? ' global-search--prominent' : ''}`}>
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Pesquisar temas, sinais, sintomas e documentos oficiais</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setError('')
          }}
          placeholder={prominent ? 'Buscar tema, sinal, sintoma ou documento oficial' : 'Buscar no PlantãoMed'}
          aria-expanded={normalizedQuery.length >= 2}
          aria-controls={resultsId}
        />
        {query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Limpar busca">×</button>}
      </label>

      {normalizedQuery.length >= 2 && (
        <div className="global-search__results glass-surface" id={resultsId} role="listbox" aria-label="Resultados da pesquisa">
          {protocolResults.map((protocol) => (
            <button type="button" role="option" aria-selected="false" key={protocol.id} onClick={() => openProtocol(protocol)}>
              <Stethoscope size={16} aria-hidden="true" />
              <span><strong>{protocol.title}</strong><small>Protocolo · {protocol.category}</small></span>
            </button>
          ))}
          {presentationResults.map((presentation) => (
            <button type="button" role="option" aria-selected="false" key={presentation.id} onClick={() => openPresentation(presentation.id)}>
              <Search size={16} aria-hidden="true" />
              <span><strong>{presentation.name}</strong><small>Apresentação clínica · {presentation.group}</small></span>
            </button>
          ))}
          {documentResults.map((entry) => (
            <button type="button" role="option" aria-selected="false" key={entry.id} onClick={() => openDocument(entry)}>
              <BookOpen size={16} aria-hidden="true" />
              <span><strong>{entry.title}</strong><small>{entry.type} · {entry.specialty} · {entry.publicationYear ?? 'ano não informado'}</small></span>
            </button>
          ))}
          {error && <p role="alert">{error}</p>}
          {!error && catalog && !hasResults && <p>Nenhum resultado encontrado.</p>}
          {!catalog && !error && <p role="status">Pesquisando documentos oficiais…</p>}
        </div>
      )}
    </div>
  )
}
