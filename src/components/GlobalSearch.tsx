import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { BookOpen, Search, Stethoscope } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { protocols } from '../data/protocols'
import { searchClinicalPresentations } from '../data/clinicalPresentations'
import { getMedicalCatalogIndex } from '../lib/medicalCatalog'
import { searchProtocols } from '../utils/search'
import type { CatalogSearchEntry, OfficialCatalogIndex, Protocol } from '../types'

function documentMatches(entry: CatalogSearchEntry, query: string): boolean {
  return `${entry.title} ${entry.specialty} ${entry.type} ${entry.publicationYear} ${entry.organization} ${entry.version ?? ''}`
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes(query.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const resultsId = useId()
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<OfficialCatalogIndex | null>(null)
  const [error, setError] = useState('')
  const [activeResultIndex, setActiveResultIndex] = useState(-1)
  const normalizedQuery = query.trim()
  const resultsOpen = normalizedQuery.length >= 2

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
  const resultCount = protocolResults.length + presentationResults.length + documentResults.length

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

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && resultsOpen) {
      event.preventDefault()
      setQuery('')
      setActiveResultIndex(-1)
      return
    }
    if (!resultsOpen || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return

    const options = document.getElementById(resultsId)?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    if (!options?.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveResultIndex((index) => index < 0 || index === options.length - 1 ? 0 : index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveResultIndex((index) => index <= 0 ? options.length - 1 : index - 1)
    } else if (activeResultIndex >= 0 && activeResultIndex < options.length) {
      event.preventDefault()
      options[activeResultIndex].click()
    }
  }

  return (
    <div className="global-search">
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Pesquisar temas, sinais, sintomas e documentos oficiais</span>
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setError('')
            setActiveResultIndex(-1)
          }}
          placeholder="Buscar tema, sinal, sintoma ou documento oficial"
          aria-expanded={resultsOpen}
          aria-controls={resultsOpen ? resultsId : undefined}
          aria-activedescendant={resultsOpen && activeResultIndex >= 0 && activeResultIndex < resultCount
            ? `${resultsId}-option-${activeResultIndex}`
            : undefined}
          onKeyDown={handleSearchKeyDown}
        />
        {query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Limpar busca">×</button>}
      </label>

      {resultsOpen && (
        <div className="global-search__results glass-surface" id={resultsId} role="listbox" aria-label="Resultados da pesquisa">
          {protocolResults.map((protocol, index) => (
            <button
              id={`${resultsId}-option-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={activeResultIndex === index}
              key={protocol.id}
              onClick={() => openProtocol(protocol)}
            >
              <Stethoscope size={16} aria-hidden="true" />
              <span><strong>{protocol.title}</strong><small>Protocolo · {protocol.category}</small></span>
            </button>
          ))}
          {presentationResults.map((presentation, index) => {
            const optionIndex = protocolResults.length + index
            return (
              <button
                id={`${resultsId}-option-${optionIndex}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={activeResultIndex === optionIndex}
                key={presentation.id}
                onClick={() => openPresentation(presentation.id)}
              >
                <Search size={16} aria-hidden="true" />
                <span><strong>{presentation.name}</strong><small>Apresentação clínica · {presentation.group}</small></span>
              </button>
            )
          })}
          {documentResults.map((entry, index) => {
            const optionIndex = protocolResults.length + presentationResults.length + index
            return (
              <button
                id={`${resultsId}-option-${optionIndex}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={activeResultIndex === optionIndex}
                key={entry.id}
                onClick={() => openDocument(entry)}
              >
                <BookOpen size={16} aria-hidden="true" />
                <span><strong>{entry.title}</strong><small>{entry.type} · {entry.specialty} · {entry.publicationYear ?? 'ano não informado'}</small></span>
              </button>
            )
          })}
          {error && <p role="alert">{error}</p>}
          {!error && catalog && !hasResults && <p>Nenhum resultado encontrado.</p>}
          {!catalog && !error && <p role="status">Pesquisando documentos oficiais…</p>}
        </div>
      )}
    </div>
  )
}
