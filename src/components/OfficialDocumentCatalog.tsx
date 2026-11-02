import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ExternalLink, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useLibraryState } from '../app/useLibraryState'
import type {
  CatalogSearchEntry,
  OfficialCatalogIndex,
  OfficialDocumentRecord,
  OfficialSourceRecord,
} from '../types'

type DocumentPack = {
  specialty: string
  documents: OfficialDocumentRecord[]
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const catalogUrl = (path: string): URL =>
  new URL(`${import.meta.env.BASE_URL}data/medical-library/${path}`, window.location.origin)

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(catalogUrl(path))
  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${path} (HTTP ${response.status}).`)
  }
  return response.json() as Promise<T>
}

export function OfficialDocumentCatalog() {
  const sectionRef = useRef<HTMLElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { recordHistory } = useLibraryState()
  const [catalog, setCatalog] = useState<OfficialCatalogIndex | null>(null)
  const [sources, setSources] = useState<OfficialSourceRecord[]>([])
  const selectedId = searchParams.get('document')
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [institution, setInstitution] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [detailErrorState, setDetailErrorState] = useState<{ id: string; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailRequest, setDetailRequest] = useState(0)
  const [packCache, setPackCache] = useState(() => new Map<string, DocumentPack>())
  const started = useRef(false)

  const loadCatalog = useCallback(async () => {
    if (started.current) return
    started.current = true
    setLoading(true)
    setCatalogError('')
    try {
      const [index, sourceRecords] = await Promise.all([
        fetchJson<OfficialCatalogIndex>('catalog-index.json'),
        fetchJson<OfficialSourceRecord[]>('sources.json'),
      ])
      setCatalog(index)
      setSources(sourceRecords)
    } catch (error) {
      started.current = false
      setCatalogError(error instanceof Error ? error.message : 'Erro inesperado ao carregar o catálogo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadCatalog()
          observer.disconnect()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [loadCatalog])

  useEffect(() => {
    if (!catalog || !selectedId) return
    const entry = catalog.searchEntries.find((item) => item.id === selectedId)
    if (!entry) return
    const cachedPack = packCache.get(entry.pack)
    if (cachedPack) return

    let active = true
    fetchJson<DocumentPack>(entry.pack)
      .then((pack) => {
        if (!active) return
        const document = pack.documents.find((item) => item.id === entry.id)
        if (!document) throw new Error(`O documento ${entry.id} não foi encontrado no pacote ${entry.pack}.`)
        setPackCache((current) => new Map(current).set(entry.pack, pack))
      })
      .catch((error: unknown) => {
        if (active) setDetailErrorState({
          id: entry.id,
          message: error instanceof Error ? error.message : 'Erro ao carregar os metadados do documento.',
        })
      })
    return () => {
      active = false
    }
  }, [catalog, selectedId, detailRequest, packCache])

  const filteredEntries = useMemo(() => {
    if (!catalog) return []
    const normalizedQuery = normalize(query)
    return catalog.searchEntries.filter((entry) => {
      if (specialty && entry.specialty !== specialty) return false
      if (institution && entry.organization !== institution) return false
      return !normalizedQuery || normalize(`${entry.title} ${entry.specialty} ${entry.type} ${entry.publicationYear} ${entry.organization} ${entry.version ?? ''}`).includes(normalizedQuery)
    })
  }, [catalog, query, specialty, institution])

  const selectedEntry = catalog?.searchEntries.find((entry) => entry.id === selectedId)
  const cachedPack = selectedEntry ? packCache.get(selectedEntry.pack) : undefined
  const detail = selectedEntry
    ? cachedPack?.documents.find((document) => document.id === selectedEntry.id) ?? null
    : null
  const detailError = detailErrorState?.id === selectedId ? detailErrorState.message : ''
  const source = detail ? sources.find((record) => record.id === detail.sourceId) : undefined
  const institutions = useMemo(
    () => [...new Set(catalog?.searchEntries.map((entry) => entry.organization) ?? [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [catalog],
  )

  useEffect(() => {
    if (detail) recordHistory(`document:${detail.id}`)
  }, [detail, recordHistory])

  return (
    <section id="official-document-catalog" className="document-catalog-section" ref={sectionRef} aria-labelledby="document-catalog-title">
      <header className="catalog-heading">
        <div>
          <span className="eyebrow">Catálogo bibliográfico</span>
          <h2 id="document-catalog-title">Diretrizes e documentos oficiais</h2>
        </div>
        {catalog && <span className="count-pill">{catalog.counts.documentsCataloged}</span>}
      </header>
      <p className="catalog-intro">
        Metadados e links para documentos listados em fontes oficiais. A página de origem e a vigência de cada documento devem ser conferidas antes do uso.
      </p>

      {!catalog && (
        <div className="catalog-load">
          {loading && <p role="status">Carregando o índice do catálogo…</p>}
          {catalogError && <p className="catalog-error" role="alert">{catalogError}</p>}
          {!loading && (
            <button type="button" className="action-button" onClick={() => void loadCatalog()}>
              <BookOpen size={16} aria-hidden="true" />
              Carregar documentos
            </button>
          )}
        </div>
      )}

      {catalog && (
        <>
          <div className="catalog-controls">
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Buscar documentos oficiais</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar documento ou especialidade"
              />
            </label>
            <label className="catalog-specialty">
              <span className="sr-only">Filtrar especialidade</span>
              <select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
                <option value="">Todas as especialidades</option>
                {catalog.specialties.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label className="catalog-specialty">
              <span className="sr-only">Filtrar por instituição</span>
              <select value={institution} onChange={(event) => setInstitution(event.target.value)}>
                <option value="">Todas as instituições</option>
                {institutions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="catalog-browser">
            <div className="catalog-results" aria-live="polite">
              <p className="catalog-results__count">{filteredEntries.length} documentos</p>
              {filteredEntries.map((entry: CatalogSearchEntry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={`catalog-result ${selectedId === entry.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams)
                    next.set('document', entry.id)
                    setSearchParams(next)
                  }}
                  aria-pressed={selectedId === entry.id}
                >
                  <strong>{entry.title}</strong>
                  <span>{entry.specialty} · {entry.type} · {entry.publicationYear}</span>
                </button>
              ))}
              {filteredEntries.length === 0 && <p className="empty-state">Nenhum documento corresponde à busca.</p>}
            </div>

            <article className="catalog-document">
              {detail ? (
                <>
                  <span className="eyebrow">{detail.specialty} · {detail.type}</span>
                  <h3>{detail.title}</h3>
                  <dl>
                    <div><dt>Instituição</dt><dd>{detail.organization}</dd></div>
                    <div><dt>Data listada</dt><dd>{detail.publicationDate}</dd></div>
                    {detail.version && <div><dt>Referência normativa</dt><dd>{detail.version}</dd></div>}
                    {detail.updatedAt && <div><dt>Atualização indicada na listagem</dt><dd>{detail.updatedAt}</dd></div>}
                    {source && <div><dt>Catálogo de origem</dt><dd><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></dd></div>}
                    <div><dt>Situação da verificação</dt><dd>Listagem e link catalogados; conteúdo e vigência individual não conferidos.</dd></div>
                    <div><dt>Conteúdo e reprodução</dt><dd>Somente metadados e link; o conteúdo não foi reproduzido.</dd></div>
                    <div><dt>Catalogado em</dt><dd>{detail.catalogedAt}</dd></div>
                  </dl>
                  <a className="action-button catalog-official-link" href={detail.officialUrl} target="_blank" rel="noreferrer">
                    Abrir documento oficial <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </>
              ) : detailError ? (
                <div className="catalog-detail-error">
                  <p className="catalog-error" role="alert">{detailError}</p>
                  <button type="button" className="action-button" onClick={() => setDetailRequest((current) => current + 1)}>
                    Tentar novamente
                  </button>
                </div>
              ) : selectedId && catalog && !selectedEntry ? (
                <p className="catalog-error" role="alert">Este documento não está presente no índice carregado.</p>
              ) : selectedId ? (
                <p role="status">Carregando os metadados deste documento…</p>
              ) : (
                <p className="empty-state">Selecione um documento para ver a referência e abrir a fonte oficial.</p>
              )}
            </article>
          </div>

          <details className="catalog-sources">
            <summary>Ver fontes oficiais consultadas ({sources.length})</summary>
            <ul>
              {sources.map((item) => (
                <li key={item.id}>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                  <span>{item.organization} · acesso em {item.checkedAt} · {item.access.replaceAll('_', ' ')}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}
