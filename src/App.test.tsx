// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { LibraryStateProvider } from './app/LibraryState'
import { IdentityAuthProvider } from './auth/IdentityAuthContext'
import App from './App'
import { clinicalPresentations } from './data/clinicalPresentations'
import { protocols } from './data/protocols'

let originalWindowFetch: typeof window.fetch
let originalWindowInnerWidth: PropertyDescriptor | undefined
let originalNavigatorClipboard: PropertyDescriptor | undefined

const identity = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  getUser: vi.fn(),
  handleAuthCallback: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  onAuthChange: vi.fn(),
  recoverPassword: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@netlify/identity', () => identity)

function renderRoute(initialEntry = '/inicio') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <IdentityAuthProvider><LibraryStateProvider><AppRouter /></LibraryStateProvider></IdentityAuthProvider>
    </MemoryRouter>,
  )
}

describe('PlantãoMed independent routes', () => {
  beforeEach(() => {
    originalWindowInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
    originalNavigatorClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    sessionStorage.clear()
    window.history.replaceState(null, '', '/')
    identity.acceptInvite.mockResolvedValue(null)
    identity.getUser.mockResolvedValue(null)
    identity.handleAuthCallback.mockResolvedValue(null)
    identity.login.mockResolvedValue(null)
    identity.logout.mockResolvedValue(undefined)
    identity.onAuthChange.mockReturnValue(vi.fn())
    identity.updateUser.mockResolvedValue(null)
    localStorage.clear()
    originalWindowFetch = window.fetch
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    document.querySelectorAll('#nl-badge-frame').forEach((frame) => frame.remove())
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    if (originalWindowInnerWidth) Object.defineProperty(window, 'innerWidth', originalWindowInnerWidth)
    if (originalNavigatorClipboard) Object.defineProperty(navigator, 'clipboard', originalNavigatorClipboard)
    else Reflect.deleteProperty(navigator, 'clipboard')
    window.fetch = originalWindowFetch
    window.history.replaceState(null, '', '/')
  })

  it('redirects the root to the onboarding page on a first visit', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: /PlantãoMed\. Conhecimento clínico/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Entrar no PlantãoMed/i })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' })).not.toBeInTheDocument()
  })

  it('stores onboarding completion and skips the welcome page later', async () => {
    renderRoute('/')
    fireEvent.click(await screen.findByRole('button', { name: /Entrar no PlantãoMed/i }))
    expect(localStorage.getItem('plantaomed.onboarding.completed')).toBe('true')
    expect(await screen.findByRole('heading', { name: 'PlantãoMed' })).toBeInTheDocument()
    expect(document.querySelector('.onboarding-transition')).toBeInTheDocument()
  })

  it('skips the onboarding reveal when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    renderRoute('/')
    fireEvent.click(await screen.findByRole('button', { name: /Entrar no PlantãoMed/i }))

    expect(await screen.findByRole('heading', { name: 'PlantãoMed' })).toBeInTheDocument()
    expect(document.querySelector('.onboarding-transition')).not.toBeInTheDocument()
  })

  it('animates route content while keeping the application shell mounted', async () => {
    renderRoute('/inicio')
    const sidebar = screen.getByRole('complementary', { name: 'Navegação principal' })
    const header = screen.getByRole('banner')

    fireEvent.click(within(sidebar).getByRole('link', { name: 'Biblioteca' }))

    expect(await screen.findByRole('heading', { name: 'Biblioteca' })).toBeInTheDocument()
    expect(document.querySelector('.route-transition__page')).toHaveAttribute('data-route-transition', 'page')
    expect(screen.getAllByRole('banner')[0]).toBe(header)
    expect(screen.getByRole('complementary', { name: 'Navegação principal' })).toBe(sidebar)
  })

  it('uses contextual route motion when opening and returning from a calculator detail', async () => {
    renderRoute('/calculadoras')
    await screen.findByRole('heading', { name: 'Calculadoras Médicas' })
    fireEvent.click(screen.getByRole('link', { name: /Quick SOFA/ }))

    expect(await screen.findByRole('heading', { name: 'Quick SOFA' })).toBeInTheDocument()
    expect(document.querySelector('.route-transition__page')).toHaveAttribute('data-route-transition', 'detail-forward')

    fireEvent.click(screen.getByRole('link', { name: 'Todas as calculadoras' }))
    expect(await screen.findByRole('heading', { name: 'Calculadoras Médicas' })).toBeInTheDocument()
    expect(document.querySelector('.route-transition__page')).toHaveAttribute('data-route-transition', 'detail-back')
  })

  it('keeps the five mobile navigation items aligned structurally and opens More as a menu', async () => {
    renderRoute('/inicio')
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegação inferior' })
    const moreButton = within(mobileNavigation).getByRole('button', { name: 'Mais' })

    expect(mobileNavigation.children).toHaveLength(5)
    expect(moreButton.parentElement).toHaveClass('mobile-more')
    expect(within(moreButton).getByText('Mais')).toBeInTheDocument()
    expect(moreButton.querySelector('svg')).toBeInTheDocument()
    expect(moreButton).toHaveAttribute('aria-haspopup', 'menu')

    fireEvent.click(moreButton)
    const menu = screen.getByRole('menu', { name: 'Mais páginas' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Medicamentos' }))

    expect(await screen.findByRole('heading', { name: 'Medicamentos' })).toBeInTheDocument()
    expect(screen.queryByRole('menu', { name: 'Mais páginas' })).not.toBeInTheDocument()
  })

  it('updates crawler metadata to the canonical URL of the current public page', async () => {
    renderRoute('/calculadoras/qsofa')
    expect(await screen.findByRole('heading', { name: 'Quick SOFA' })).toBeInTheDocument()

    expect(document.title).toBe('Quick SOFA | PlantãoMed')
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://plantaomeds.netlify.app/calculadoras/qsofa',
    )
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://plantaomeds.netlify.app/calculadoras/qsofa',
    )
  })

  it('copies the production canonical URL when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    renderRoute('/protocolos')

    const shareButton = await screen.findByRole('button', { name: 'Compartilhar' })
    fireEvent.click(shareButton)

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://plantaomeds.netlify.app/protocolos'))
    expect(screen.getByText('Link copiado.')).toBeInTheDocument()
  })

  it('moves the mobile tab bar when a Netlify iframe is injected after mount and restores its position when removed', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    renderRoute('/inicio')

    const appShell = document.querySelector<HTMLElement>('.app-shell')
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegação inferior' })
    vi.spyOn(mobileNavigation, 'getBoundingClientRect').mockReturnValue({
      x: 12, y: 770, left: 12, top: 770, right: 378, bottom: 834, width: 366, height: 64, toJSON: () => ({}),
    })

    const badgeFrame = document.createElement('iframe')
    badgeFrame.id = 'nl-badge-frame'
    badgeFrame.style.position = 'fixed'
    badgeFrame.style.zIndex = '2147483645'
    badgeFrame.style.pointerEvents = 'auto'
    vi.spyOn(badgeFrame, 'getBoundingClientRect').mockReturnValue({
      x: 199, y: 780, left: 199, top: 780, right: 390, bottom: 844, width: 191, height: 64, toJSON: () => ({}),
    })
    document.body.append(badgeFrame)

    await waitFor(() => expect(appShell).toHaveStyle('--mobile-tab-obstruction: 62px'))
    await waitFor(() => expect(appShell).toHaveStyle('--mobile-tab-obstruction-shift: -62px'))
    expect(mobileNavigation).toHaveClass('glass-surface')
    expect(mobileNavigation.children).toHaveLength(5)

    badgeFrame.remove()
    await waitFor(() => expect(appShell).toHaveStyle('--mobile-tab-obstruction: 0px'))
    await waitFor(() => expect(appShell).toHaveStyle('--mobile-tab-obstruction-shift: 0px'))
  })

  it.each([
    ['/inicio', 'PlantãoMed'],
    ['/protocolos', 'Biblioteca'],
    ['/sinais-e-sintomas', 'Sinais e sintomas'],
    ['/assistente-clinico', 'Acesso ao Assistente Clínico'],
    ['/diretrizes', 'Diretrizes e documentos'],
    ['/calculadoras', 'Calculadoras Médicas'],
    ['/favoritos', 'Favoritos'],
    ['/historico', 'Histórico'],
    ['/sobre', /Sobre o PlantãoMed/i],
  ])('renders independent route %s', async (route, heading) => {
    renderRoute(route)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('routes an invitation callback before onboarding or legacy hash redirects run', async () => {
    window.history.replaceState(null, '', '/#invite_token=app-invite-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'invite', user: null, token: 'app-invite-test-20261102' }
    })
    renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Defina sua senha' })).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    expect(screen.queryByRole('heading', { name: /Conhecimento clínico/i })).not.toBeInTheDocument()
  })

  it('lets the user navigate away from the invitation form without callback redirects trapping the route', async () => {
    window.history.replaceState(null, '', '/#invite_token=navigation-invite-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'invite', user: null, token: 'navigation-invite-test-20261102' }
    })
    renderRoute('/')
    await screen.findByRole('heading', { name: 'Defina sua senha' })
    fireEvent.click(screen.getByRole('link', { name: /Voltar ao login/i }))

    expect(await screen.findByRole('heading', { name: 'Acesso ao Assistente Clínico' })).toBeInTheDocument()
  })

  it('routes recovery callbacks to the password form without an early redirect', async () => {
    const recoveryUser = { id: 'recovery-user', email: 'recovery@example.test', roles: [] }
    window.history.replaceState(null, '', '/#recovery_token=app-recovery-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'recovery', user: recoveryUser }
    })
    renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Redefina sua senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'PlantãoMed' })).not.toBeInTheDocument()
  })

  it('allows an authenticated clinical-assistant role to open the production workspace', async () => {
    vi.stubEnv('DEV', false)
    identity.getUser.mockResolvedValue({
      id: 'synthetic-authorized-doctor',
      email: 'doctor@example.test',
      roles: ['clinical-assistant'],
    })
    renderRoute('/assistente-clinico')

    expect(await screen.findByRole('heading', { name: 'Assistente Clínico' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Queixa principal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição clínica')).toBeInTheDocument()
  })

  it('keeps an authenticated account without the clinical role restricted', async () => {
    identity.getUser.mockResolvedValue({
      id: 'synthetic-unprivileged-user',
      roles: ['authenticated'],
    })
    renderRoute('/assistente-clinico')

    expect(await screen.findByRole('heading', { name: 'Acesso não habilitado' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Queixa principal' })).not.toBeInTheDocument()
  })

  it('searches Anvisa records by active ingredient and registration and opens source fields', async () => {
    const manifest = {
      schemaVersion: 1,
      sourceId: 'anvisa-open-medicines-csv',
      sourceUrl: 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv',
      dictionaryUrl: 'https://dados.anvisa.gov.br/dados/Documentacao_e_Dicionario_de_Dados_Registros_Validos_Medicamento_V1.pdf',
      retrievedAt: '2026-11-02',
      recordsRead: 1,
      recordsImported: 1,
      duplicateRowsRemoved: 0,
      rejectedRows: 0,
      recordsWithRegistrationNumber: 1,
      uniqueRegistrationNumbers: 1,
      searchIndexPath: 'medicines/search-index.json',
      shards: [{ id: 'n', path: 'medicines/packs/n.json', recordCount: 1 }],
    }
    const searchRecord = {
      id: 'anvisa-1',
      productName: 'NOVALGINA',
      activeIngredient: 'dipirona monoidratada',
      registrationNumber: '186200018',
      holder: 'OPELLA HEALTHCARE BRAZIL LTDA',
      regulatoryCategory: 'Novo',
      therapeuticClass: 'ANALGESICOS NAO NARCOTICOS',
      registrationSituation: 'Ativo',
      pack: 'medicines/packs/n.json',
    }
    const fullRecord = {
      ...searchRecord,
      processNumber: '25351617747202347',
      holderCnpj: '38391432000143',
      processFinalizedAt: '13/11/2023',
      registrationExpirationField: '042028',
      productType: 'MEDICAMENTO',
      sourceId: manifest.sourceId,
    }
    const response = (data: unknown) => ({ ok: true, status: 200, json: async () => data }) as Response
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('medicines/manifest.json')) return Promise.resolve(response(manifest))
      if (url.endsWith('medicines/search-index.json')) return Promise.resolve(response({
        schemaVersion: 1,
        sourceId: manifest.sourceId,
        retrievedAt: manifest.retrievedAt,
        recordCount: 1,
        records: [searchRecord],
      }))
      if (url.endsWith('medicines/packs/n.json')) return Promise.resolve(response({
        schemaVersion: 1,
        sourceId: manifest.sourceId,
        retrievedAt: manifest.retrievedAt,
        records: [fullRecord],
      }))
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)
    })
    window.fetch = fetchMock
    vi.stubGlobal('fetch', fetchMock)

    renderRoute('/medicamentos')
    const search = await screen.findByRole('searchbox', { name: 'Buscar medicamentos por nome, princípio ativo ou número de registro' })
    await screen.findByText(/1 registros catalogados/)
    fireEvent.change(search, { target: { value: 'dípirona monoidratada' } })
    fireEvent.click(await screen.findByRole('button', { name: /NOVALGINA/ }))
    expect(await screen.findByRole('heading', { name: 'NOVALGINA' })).toBeInTheDocument()
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByText('186200018')).toBeInTheDocument()
    expect(screen.queryByText(/dose recomendada/i)).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: '186200018' } })
    expect(await screen.findByRole('button', { name: /NOVALGINA/ })).toBeInTheDocument()
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

  it('provides a not-found page and a route back to the dashboard', async () => {
    renderRoute('/rota-inexistente')
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Asma aguda' })).toBeInTheDocument()
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

  it('lists cataloged presentations and opens a stable detail route', async () => {
    renderRoute('/sinais-e-sintomas')
    expect(await screen.findByText(`${clinicalPresentations.length} apresentações catalogadas para pesquisa e organização.`)).toBeInTheDocument()
    expect(new Set(clinicalPresentations.map(({ id }) => id)).size).toBe(clinicalPresentations.length)
    fireEvent.click(screen.getByRole('link', { name: 'Dispneia' }))
    expect(await screen.findByRole('heading', { name: 'Dispneia' })).toBeInTheDocument()
    expect(screen.getByText(/Não há referências, relações diagnósticas, algoritmos ou condutas associados/)).toBeInTheDocument()
  })

  it('searches accent-insensitive presentation terms from global search', async () => {
    renderRoute('/inicio')
    fireEvent.change(screen.getByRole('combobox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' }), { target: { value: 'sibilancia' } })
    fireEvent.click(await screen.findByRole('option', { name: /Sibilância.*Apresentação clínica/ }))
    expect(await screen.findByRole('heading', { name: 'Sibilância' })).toBeInTheDocument()
  })

  it('navigates and selects global search suggestions with the keyboard', async () => {
    renderRoute('/inicio')
    const search = screen.getByRole('combobox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' })
    expect(search).toHaveAttribute('aria-autocomplete', 'list')
    fireEvent.change(search, { target: { value: 'sibilancia' } })

    const option = await screen.findByRole('option', { name: /Sibilância.*Apresentação clínica/ })
    fireEvent.keyDown(search, { key: 'ArrowDown' })

    expect(search).toHaveAttribute('aria-activedescendant', option.id)
    expect(option).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'Enter' })
    expect(await screen.findByRole('heading', { name: 'Sibilância' })).toBeInTheDocument()
  })

  it('shows implemented calculator tools and their clinical-review status', async () => {
    renderRoute('/calculadoras')
    expect(await screen.findByRole('heading', { name: 'Calculadoras Médicas' })).toBeInTheDocument()
    expect(screen.getByLabelText('10 cálculos implementados')).toBeInTheDocument()
    expect(screen.getByLabelText('10 com testes automatizados')).toBeInTheDocument()
    expect(screen.getByLabelText('0 com revisão clínica registrada')).toBeInTheDocument()
    expect(document.querySelector('a[href="/calculadoras/ckd-epi-2021-creatinine"]')).not.toBeNull()
  })

  it('calculates BMI locally, updates as inputs change, and clears patient values', async () => {
    renderRoute('/calculadoras/bmi-adult')
    expect(await screen.findByRole('heading', { name: 'Índice de massa corporal — adultos' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Idade · anos'), { target: { value: '42' } })
    fireEvent.change(screen.getByLabelText('Peso · kg'), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText('Estatura · cm'), { target: { value: '175' } })
    expect(screen.getByText('22,9')).toBeInTheDocument()
    expect(screen.getByText('Faixa de peso saudável')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Peso · kg'), { target: { value: '80' } })
    expect(screen.getByText('26,1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(screen.queryByText('26,1')).not.toBeInTheDocument()
    expect(screen.getByText(/O resultado aparecerá quando todos os dados forem preenchidos/)).toBeInTheDocument()
  })

  it('accepts Brazilian decimal commas and blocks BMI categories outside the adult population', async () => {
    renderRoute('/calculadoras/bmi-adult')
    await screen.findByRole('heading', { name: 'Índice de massa corporal — adultos' })

    fireEvent.change(screen.getByLabelText('Idade · anos'), { target: { value: '19' } })
    fireEvent.change(screen.getByLabelText('Peso · kg'), { target: { value: '70,0' } })
    fireEvent.change(screen.getByLabelText('Estatura · cm'), { target: { value: '175,0' } })
    expect(screen.getByRole('alert')).toHaveTextContent('população')
    expect(screen.queryByText('22,9')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Idade · anos'), { target: { value: '20' } })
    expect(screen.getByText('22,9')).toBeInTheDocument()
  })

  it('searches calculators by specialty and category', async () => {
    renderRoute('/calculadoras')
    const search = await screen.findByRole('searchbox', { name: 'Pesquisar calculadoras por nome, sigla, especialidade ou finalidade' })
    fireEvent.change(search, { target: { value: 'filtração glomerular' } })
    expect(screen.getByText('3 calculadoras encontradas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pneumologia' }))
    expect(screen.getByText('0 calculadoras encontradas')).toBeInTheDocument()
  })

  it('includes a global search outside the header that opens a matching protocol route', async () => {
    renderRoute('/sobre')
    fireEvent.change(screen.getByRole('combobox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' }), { target: { value: 'asma aguda' } })
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
        medicinesWithRegistrationNumber: 0,
        medicinesUniqueRegistrationNumbers: 0,
        recordsPendingVerification: 1,
      },
      specialties: [{ id: 'reumatologia', name: 'Reumatologia', documentCount: 1, subjectCount: 1, documentPack: entry.pack, subjectPack: 'subjects/reumatologia.json' }],
      sourcesPath: 'sources.json',
      medicinesPath: 'medicines/manifest.json',
      medicineSearchIndexPath: 'medicines/search-index.json',
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
    fireEvent.change(screen.getByRole('combobox', { name: 'Pesquisar temas, sinais, sintomas e documentos oficiais' }), { target: { value: 'lombalgia' } })
    fireEvent.click(await screen.findByRole('option', { name: /PCDT Lombalgia/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar documentos' }))
    expect(await screen.findByRole('heading', { name: 'PCDT Lombalgia' })).toBeInTheDocument()
    expect(await screen.findByText('Listagem e link catalogados; conteúdo e vigência individual não conferidos.')).toBeInTheDocument()
  })
})
