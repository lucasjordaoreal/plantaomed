import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProtocolCard } from '../components/ProtocolCard'
import { useLibraryState } from '../app/useLibraryState'
import { categories } from '../data/categories'
import { protocols } from '../data/protocols'
import { getMedicalCatalogIndex } from '../lib/medicalCatalog'
import type { CatalogSearchEntry, OfficialCatalogIndex } from '../types'
import { searchProtocols } from '../utils/search'

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { favorites, toggleFavoriteId } = useLibraryState()
  const [catalog, setCatalog] = useState<OfficialCatalogIndex | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const query = searchParams.get('q') ?? ''
  const specialty = searchParams.get('especialidade') ?? ''
  const sort = searchParams.get('ordem') === 'alfabetica' ? 'alfabetica' : 'relevancia'
  const filteredProtocols = useMemo(() => {
    const results = searchProtocols(query, protocols)
      .filter((protocol) => !specialty || protocol.category === specialty)
    if (sort === 'alfabetica') return [...results].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    return results
  }, [query, specialty, sort])
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return (catalog?.searchEntries ?? []).filter((entry) => {
      if (specialty && entry.specialty !== specialty) return false
      return !normalizedQuery || `${entry.title} ${entry.specialty} ${entry.type} ${entry.publicationYear ?? ''} ${entry.version ?? ''}`
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes(normalizedQuery)
    }).sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))
  }, [catalog, query, specialty])
  const specialties = useMemo(
    () => [...new Set([...categories.map(({ name }) => name), ...(catalog?.specialties.map(({ name }) => name) ?? [])])]
      .sort((left, right) => left.localeCompare(right, 'pt-BR')),
    [catalog],
  )

  useEffect(() => {
    let active = true
    getMedicalCatalogIndex()
      .then((index) => {
        if (active) setCatalog(index)
      })
      .catch((error: unknown) => {
        if (active) setCatalogError(error instanceof Error ? error.message : 'Erro inesperado ao carregar temas com documentos oficiais.')
      })
    return () => {
      active = false
    }
  }, [])

  useLayoutEffect(() => {
    const list = document.querySelector<HTMLElement>('.protocol-list')
    if (list) list.scrollTop = 0
  }, [query, specialty, sort])

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const saveListPosition = () => {
    const list = document.querySelector<HTMLElement>('.protocol-list')
    sessionStorage.setItem('plantaomed:library-page-scroll', String(window.scrollY))
    if (list) sessionStorage.setItem('plantaomed:library-list-scroll', String(list.scrollTop))
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">Temas cadastrados</span>
        <h1 data-page-heading tabIndex={-1}>Biblioteca</h1>
        <p>Pesquise temas e assuntos com documentos oficiais catalogados. Um documento listado não equivale a protocolo completo revisado.</p>
      </header>

      <section className="library-page" aria-label="Biblioteca de protocolos">
        <div className="library-controls">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Buscar temas clínicos</span>
            <input type="search" value={query} onChange={(event) => updateParam('q', event.target.value)} placeholder="Buscar por tema ou categoria" />
            {query && <button type="button" className="clear-search" onClick={() => updateParam('q', '')} aria-label="Limpar busca">×</button>}
          </label>
          <label className="library-sort">
            <span>Ordenar</span>
            <select value={sort} onChange={(event) => updateParam('ordem', event.target.value === 'alfabetica' ? 'alfabetica' : '')}>
              <option value="relevancia">Relevância</option>
              <option value="alfabetica">Ordem alfabética</option>
            </select>
          </label>
        </div>
        <div className="category-filter" aria-label="Filtrar por especialidade">
          <button type="button" className={`category-filter__chip${!specialty ? ' is-selected' : ''}`} aria-pressed={!specialty} onClick={() => updateParam('especialidade', '')}>Todas</button>
          {specialties.map((name) => (
            <button key={name} type="button" className={`category-filter__chip${specialty === name ? ' is-selected' : ''}`} aria-pressed={specialty === name} onClick={() => updateParam('especialidade', specialty === name ? '' : name)}>
              {name}
            </button>
          ))}
        </div>
        <div className="library-results-heading">
          <h2>Temas e assuntos catalogados</h2><span className="count-pill">{filteredProtocols.length + filteredDocuments.length}</span>
        </div>
        <div className="protocol-list library-results" aria-live="polite">
          {filteredProtocols.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} favorite={favorites.includes(protocol.id)} onToggleFavorite={toggleFavoriteId} onOpen={saveListPosition} />
          ))}
          {filteredDocuments.map((entry: CatalogSearchEntry) => (
            <Link
              key={entry.id}
              className="presentation-row"
              to={`/diretrizes?document=${encodeURIComponent(entry.id)}`}
              onClick={saveListPosition}
            >
              <span><strong>{entry.title}</strong><small>{entry.specialty} · PCDT catalogado · {entry.publicationYear ?? 'ano não informado'}</small></span>
            </Link>
          ))}
          {catalogError && <p className="catalog-error" role="alert">{catalogError}</p>}
          {filteredProtocols.length + filteredDocuments.length === 0 && <p className="empty-state">Nenhum tema corresponde à busca. Altere os termos ou filtros.</p>}
        </div>
      </section>
    </div>
  )
}
