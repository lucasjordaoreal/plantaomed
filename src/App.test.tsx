// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { LibraryStateProvider } from './app/LibraryState'
import App from './App'
import { clinicalPresentations } from './data/clinicalPresentations'
import { protocols } from './data/protocols'

let originalWindowFetch: typeof window.fetch

function renderRoute(initialEntry = '/inicio') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LibraryStateProvider><AppRouter /></LibraryStateProvider>
    </MemoryRouter>,
  )
}

describe('PlantãoMed independent routes', () => {
  beforeEach(() => {
    localStorage.clear()
    originalWindowFetch = window.fetch
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.fetch = originalWindowFetch
    window.history.replaceState(null, '', '/')
  })

  it('redirects the root and renders only the dashboard page', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { name: 'PlantãoMed' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Biblioteca' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Favoritos' })).not.toBeInTheDocument()
    expect(document.querySelector('.protocol-list')).toBeNull()
    expect(document.querySelector('.document-catalog-section')).toBeNull()
  })

  it.each([
    ['/inicio', 'PlantãoMed'],
    ['/protocolos', 'Biblioteca'],
    ['/sinais-e-sintomas', 'Sinais e sintomas'],
    ['/diretrizes', 'Diretrizes e documentos'],
    ['/medicamentos', 'Medicamentos'],
    ['/calculadoras', 'Calculadoras'],
    ['/favoritos', 'Favoritos'],
    ['/historico', 'Histórico'],
    ['/sobre', /Sobre o PlantãoMed/i],
  ])('renders independent route %s', (route, heading) => {
    renderRoute(route)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('redirects the legacy documents fragment route to the guidelines page', () => {
    renderRoute('/documentos')
    expect(screen.getByRole('heading', { name: 'Diretrizes e documentos' })).toBeInTheDocument()
  })

  it.each([
    ['#inicio', '/inicio'],
    ['#protocolos', '/protocolos'],
    ['#documentos', '/diretrizes'],
    ['#/protocolos/asma-aguda', '/protocolos/asma-aguda'],
    ['#favoritos', '/favoritos'],
    ['#historico', '/historico'],
    ['#sobre', '/sobre'],
  ])('converts legacy fragment %s to the clean route %s', async (legacyHash, route) => {
    window.history.replaceState(null, '', '/')
    window.location.hash = legacyHash
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe(route))
    expect(window.location.hash).toBe('')
  })

  it('provides a not-found page and a route back to the dashboard', () => {
    renderRoute('/rota-inexistente')
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir ao Início/ })).toHaveAttribute('href', '/inicio')
  })

  it('navigates from the shared desktop navigation and updates its active state', () => {
    renderRoute('/inicio')
    const navigation = screen.getByRole('complementary', { name: 'Navegação principal' })
    fireEvent.click(within(navigation).getByRole('link', { name: 'Biblioteca' }))
    expect(screen.getByRole('heading', { name: 'Biblioteca' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Biblioteca' })).toHaveClass('is-active')
    expect(screen.queryByRole('heading', { name: 'PlantãoMed' })).not.toBeInTheDocument()
  })

  it('opens protocol details by stable id and keeps unverified clinical instructions hidden', async () => {
    renderRoute('/protocolos/asma-aguda')
    expect(screen.getByRole('heading', { name: 'Asma aguda' })).toBeInTheDocument()
    expect(screen.getByText(/Conteúdo não validado para uso assistencial/)).toBeInTheDocument()
    expect(screen.queryByText('Administração de broncodilatador de ação curta')).not.toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('plantaomed:history')).toContain('asma-aguda'))
  })

  it('returns from protocol details to the prior filtered library URL', async () => {
    renderRoute('/protocolos?q=asma&especialidade=Pneumologia')
    const topic = protocols.find((protocol) => protocol.id === 'asma-aguda')
    if (!topic) throw new Error('Expected library topic missing.')
    fireEvent.click(screen.getByRole('link', { name: new RegExp(topic.title) }))
    expect(await screen.findByRole('heading', { name: topic.title })).toBeInTheDocument()
    const backLink = document.querySelector<HTMLElement>('.back-link')
    if (!backLink) throw new Error('The detail back link is missing.')
    fireEvent.click(backLink)
    expect(screen.getByRole('heading', { name: 'Biblioteca' })).toBeInTheDocument()
    const restoredSearch = document.querySelector<HTMLInputElement>('.library-page input[type="search"]')
    expect(restoredSearch).toHaveValue('asma')
  })

  it('keeps all legacy protocol ids searchable and makes each detail route available', () => {
    renderRoute('/protocolos')
    const protocolList = document.querySelector<HTMLElement>('.protocol-list')
    if (!protocolList) throw new Error('The library list is missing.')
    for (const protocol of protocols) {
      expect([...protocolList.querySelectorAll('.protocol-row__title')].some((item) => item.textContent === protocol.title)).toBe(true)
    }
    expect(protocols.map(({ id }) => `/protocolos/${id}`)).toHaveLength(6)
  })

  it('adds and removes favorites and persists them across route changes', () => {
    renderRoute('/protocolos')
    const topic = protocols.find((protocol) => protocol.id === 'asma-aguda')
    if (!topic) throw new Error('Expected legacy topic missing.')
    fireEvent.click(screen.getByRole('button', { name: `Adicionar aos favoritos: ${topic.title}` }))
    expect(JSON.parse(localStorage.getItem('plantaomed:favorites') ?? '[]')).toContain(topic.id)
    const navigation = screen.getByRole('complementary', { name: 'Navegação principal' })
    fireEvent.click(within(navigation).getByRole('link', { name: 'Favoritos' }))
    expect(screen.getByRole('link', { name: new RegExp(topic.title) })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Remover dos favoritos: ${topic.title}` }))
    expect(screen.getByRole('heading', { name: 'Nenhum favorito salvo' })).toBeInTheDocument()
  })

  it('shows only recent history entries and clears them after confirmation', async () => {
    localStorage.setItem('plantaomed:history', JSON.stringify(['asma-aguda', 'sepse']))
    renderRoute('/historico')
    const historyList = screen.getByRole('list')
    expect(within(historyList).getAllByRole('listitem')).toHaveLength(2)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: /Limpar histórico/ }))
    expect(screen.getByRole('heading', { name: 'Seu histórico está vazio' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('plantaomed:history') ?? '[]')).toEqual([])
  })

  it('exposes the mobile More menu with medication, history, and about routes', () => {
    renderRoute('/inicio')
    fireEvent.click(screen.getByRole('button', { name: 'Mais' }))
    const menu = screen.getByRole('menu', { name: 'Mais páginas' })
    expect(within(menu).getByRole('menuitem', { name: 'Medicamentos' })).toHaveAttribute('href', '/medicamentos')
    expect(within(menu).getByRole('menuitem', { name: 'Histórico' })).toHaveAttribute('href', '/historico')
    expect(within(menu).getByRole('menuitem', { name: 'Sobre' })).toHaveAttribute('href', '/sobre')
    expect(within(menu).getByRole('menuitem', { name: 'Calculadoras' })).toHaveAttribute('href', '/calculadoras')
  })

  it('lists cataloged presentations and opens a stable detail route', () => {
    renderRoute('/sinais-e-sintomas')
    expect(screen.getByText(`${clinicalPresentations.length} apresentações catalogadas para pesquisa e organização.`)).toBeInTheDocument()
    expect(new Set(clinicalPresentations.map(({ id }) => id)).size).toBe(clinicalPresentations.length)
    fireEvent.click(screen.getByRole('link', { name: 'Dispneia' }))
    expect(screen.getByRole('heading', { name: 'Dispneia' })).toBeInTheDocument()
    expect(screen.getByText(/Não há referências, relações diagnósticas, algoritmos ou condutas associados/)).toBeInTheDocument()
  })

  it('searches accent-insensitive presentation terms from global search', async () => {
    renderRoute('/inicio')
    const header = document.querySelector<HTMLElement>('.app-header')
    if (!header) throw new Error('The shared app header is missing.')
    fireEvent.change(within(header).getByRole('searchbox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' }), { target: { value: 'sibilancia' } })
    fireEvent.click(await screen.findByRole('option', { name: /Sibilância.*Apresentação clínica/ }))
    expect(await screen.findByRole('heading', { name: 'Sibilância' })).toBeInTheDocument()
  })

  it('does not expose unimplemented calculators as clinical outputs', () => {
    renderRoute('/calculadoras')
    expect(screen.getByRole('heading', { name: 'Nenhuma calculadora catalogada' })).toBeInTheDocument()
    expect(screen.queryByText(/resultado:/i)).not.toBeInTheDocument()
  })

  it('includes a shared global search that opens a matching protocol route', async () => {
    renderRoute('/sobre')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' }), { target: { value: 'asma aguda' } })
    await screen.findByRole('alert')
    fireEvent.click(await screen.findByRole('option', { name: /Asma aguda/ }))
    expect(await screen.findByRole('heading', { name: 'Asma aguda' })).toBeInTheDocument()
  })

  it('searches official documents globally and opens their official metadata page', async () => {
    const entry = {
      id: 'pcdt-lombalgia',
      title: 'PCDT Lombalgia',
      specialty: 'Reumatologia',
      type: 'PCDT',
      publicationYear: '2025',
      organization: 'Ministério da Saúde / Conitec',
      version: 'Portaria de exemplo',
      officialUrl: 'https://www.gov.br/conitec/documento',
      pack: 'documents/reumatologia.json',
    }
    const source = {
      id: 'conitec-pcdt-catalog',
      title: 'Catálogo PCDT',
      organization: 'Ministério da Saúde / Conitec',
      url: 'https://www.gov.br/conitec',
      checkedAt: '2026-11-02',
      access: 'catalog_page',
      reuse: 'Somente metadados e links.',
    }
    const documentRecord = {
      ...entry,
      publicationDate: '2025-01-01',
      updatedAt: null,
      sourceId: source.id,
      catalogStatus: 'listed_in_official_catalog',
      validityStatus: 'not_individually_verified',
      reuseStatus: 'metadata_and_link_only',
      catalogedAt: '2026-11-02',
    }
    const index = {
      schemaVersion: 1,
      catalogDate: '2026-11-02',
      counts: {
        identifiedLegacySubjects: 6,
        subjectsWithOfficialDocuments: 1,
        legacySubjectsWithoutVerifiedDocumentLink: 6,
        documentsCataloged: 1,
        documentsWithTextReusePermission: 0,
        documentsWithIndividualCurrentValidityCheck: 0,
        completeClinicallyReviewedProtocols: 0,
        medicinesWithConfirmedAnvisaRegistration: 0,
        medicinesCataloged: 0,
        recordsPendingVerification: 1,
      },
      specialties: [{ id: 'reumatologia', name: 'Reumatologia', documentCount: 1, subjectCount: 1, documentPack: entry.pack, subjectPack: 'subjects/reumatologia.json' }],
      sourcesPath: 'sources.json',
      medicinesPath: 'medicines.json',
      searchEntries: [entry],
    }
    const response = (data: unknown) => ({ ok: true, status: 200, json: async () => data }) as Response
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('catalog-index.json')) return Promise.resolve(response(index))
      if (url.endsWith('sources.json')) return Promise.resolve(response([source]))
      if (url.endsWith(entry.pack)) return Promise.resolve(response({ specialty: entry.specialty, documents: [documentRecord] }))
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)
    })
    window.fetch = fetchMock
    vi.stubGlobal('fetch', fetchMock)

    renderRoute('/inicio')
    const header = document.querySelector<HTMLElement>('.app-header')
    if (!header) throw new Error('The shared app header is missing.')
    fireEvent.change(within(header).getByRole('searchbox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' }), { target: { value: 'lombalgia' } })
    fireEvent.click(await screen.findByRole('option', { name: /PCDT Lombalgia/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar documentos' }))
    expect(await screen.findByRole('heading', { name: 'PCDT Lombalgia' })).toBeInTheDocument()
    expect(await screen.findByText('Listagem e link catalogados; conteúdo e vigência individual não conferidos.')).toBeInTheDocument()
  })
})
