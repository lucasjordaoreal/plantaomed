import { useLayoutEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ProtocolCard } from '../components/ProtocolCard'
import { useLibraryState } from '../app/useLibraryState'
import { categories } from '../data/categories'
import { protocols } from '../data/protocols'
import { searchProtocols } from '../utils/search'

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { favorites, toggleFavoriteId } = useLibraryState()
  const query = searchParams.get('q') ?? ''
  const specialty = searchParams.get('especialidade') ?? ''
  const sort = searchParams.get('ordem') === 'alfabetica' ? 'alfabetica' : 'relevancia'
  const filteredProtocols = useMemo(() => {
    const results = searchProtocols(query, protocols)
      .filter((protocol) => !specialty || protocol.category === specialty)
    if (sort === 'alfabetica') return [...results].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    return results
  }, [query, specialty, sort])

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
        <p>Pesquise temas clínicos e organize os registros por especialidade.</p>
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
          {categories.map((category) => (
            <button key={category.id} type="button" className={`category-filter__chip${specialty === category.name ? ' is-selected' : ''}`} aria-pressed={specialty === category.name} onClick={() => updateParam('especialidade', specialty === category.name ? '' : category.name)}>
              {category.name}
            </button>
          ))}
        </div>
        <div className="library-results-heading">
          <h2>Temas clínicos</h2><span className="count-pill">{filteredProtocols.length}</span>
        </div>
        <div className="protocol-list library-results" aria-live="polite">
          {filteredProtocols.length > 0 ? filteredProtocols.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} favorite={favorites.includes(protocol.id)} onToggleFavorite={toggleFavoriteId} onOpen={saveListPosition} />
          )) : <p className="empty-state">Nenhum tema corresponde à busca. Altere os termos ou filtros.</p>}
        </div>
      </section>
    </div>
  )
}
