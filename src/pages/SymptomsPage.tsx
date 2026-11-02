import { useMemo } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { clinicalPresentations, searchClinicalPresentations } from '../data/clinicalPresentations'

export function SymptomsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const groups = useMemo(() => {
    const presentations = searchClinicalPresentations(query)
    return [...new Set(presentations.map(({ group }) => group))].map((group) => ({
      name: group,
      items: presentations.filter((item) => item.group === group),
    }))
  }, [query])

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">Índice clínico</span>
        <h1 data-page-heading tabIndex={-1}>Sinais e sintomas</h1>
        <p>{clinicalPresentations.length} apresentações catalogadas para pesquisa e organização.</p>
      </header>

      <section className="library-page" aria-label="Índice de sinais e sintomas">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar sinais e sintomas</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams)
              if (event.target.value) next.set('q', event.target.value)
              else next.delete('q')
              setSearchParams(next, { replace: true })
            }}
            placeholder="Buscar por apresentação clínica"
          />
        </label>
        {groups.length > 0 ? groups.map(({ name, items }) => (
          <section className="dashboard-section" key={name}>
            <div className="library-results-heading">
              <h2>{name}</h2><span className="count-pill">{items.length}</span>
            </div>
            <div className="presentation-list">
              {items.map((item) => (
                <Link className="presentation-row" key={item.id} to={`/sinais-e-sintomas/${item.id}`}>
                  <span>{item.name}</span><ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )) : <p className="empty-state">Nenhuma apresentação corresponde à busca.</p>}
      </section>
    </div>
  )
}
