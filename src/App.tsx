import { useEffect, useMemo, useState } from 'react'
import { Activity, Bell, ChevronRight, Clock3, Heart, Menu, Search, ShieldAlert, Stethoscope, X } from 'lucide-react'
import { branding } from './config/branding'
import { categories } from './data/categories'
import { protocols } from './data/protocols'
import { STORAGE_KEYS, appendHistory, readJson, toggleFavorite, writeJson } from './lib/storage'
import { searchProtocols } from './utils/search'
import type { Protocol } from './types'

const safeProtocols = protocols as Protocol[]

function App() {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => readJson(STORAGE_KEYS.favorites, [] as string[]))
  const [history, setHistory] = useState<string[]>(() => readJson(STORAGE_KEYS.history, [] as string[]))
  const [selectedId, setSelectedId] = useState<string>(safeProtocols[0]?.id ?? '')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    writeJson(STORAGE_KEYS.favorites, favorites)
  }, [favorites])

  useEffect(() => {
    writeJson(STORAGE_KEYS.history, history)
  }, [history])

  const protocolMap = useMemo(() => new Map(safeProtocols.map((protocol) => [protocol.id, protocol])), [])

  const filteredProtocols = useMemo(() => {
    if (!query.trim()) return safeProtocols
    return searchProtocols(query, safeProtocols)
  }, [query])

  const favoriteProtocols = useMemo(
    () => safeProtocols.filter((protocol) => favorites.includes(protocol.id)),
    [favorites],
  )

  const recentProtocols = useMemo(
    () => history.map((id) => protocolMap.get(id)).filter(Boolean) as Protocol[],
    [history, protocolMap],
  )

  const selectedProtocol = protocolMap.get(selectedId) ?? safeProtocols[0]

  const handleSelectProtocol = (id: string) => {
    setSelectedId(id)
    setHistory((current) => appendHistory(id, current))
    setMobileMenuOpen(false)
  }

  const toggleProtocolFavorite = (id: string) => {
    setFavorites((current) => toggleFavorite(id, current))
  }

  const heroStats = [
    { label: 'Protocolos', value: `${safeProtocols.length}` },
    { label: 'Categorias', value: `${categories.length}` },
    { label: 'Offline', value: '100%' },
  ]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white">
              {branding.logoText}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">PlantãoMed</p>
              <h1 className="text-lg font-bold text-slate-900">Base de protocolos</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-5 md:flex">
            <a className="text-sm font-medium text-slate-700 hover:text-slate-900" href="#protocolos">Protocolos</a>
            <a className="text-sm font-medium text-slate-700 hover:text-slate-900" href="#favoritos">Favoritos</a>
            <a className="text-sm font-medium text-slate-700 hover:text-slate-900" href="#historico">Histórico</a>
            <a className="text-sm font-medium text-slate-700 hover:text-slate-900" href="#sobre">Sobre</a>
          </nav>

          <button
            type="button"
            aria-label="Abrir menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <a href="#protocolos" onClick={() => setMobileMenuOpen(false)}>Protocolos</a>
              <a href="#favoritos" onClick={() => setMobileMenuOpen(false)}>Favoritos</a>
              <a href="#historico" onClick={() => setMobileMenuOpen(false)}>Histórico</a>
              <a href="#sobre" onClick={() => setMobileMenuOpen(false)}>Sobre</a>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] bg-slate-900 px-5 py-6 text-white shadow-soft sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-teal-200">
                <Bell size={14} /> Biblioteca clínica demonstrativa
              </div>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                Acesso rápido a protocolos quando o tempo é crítico.
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                {branding.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white/5 p-3 backdrop-blur-sm">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-slate-800/80 px-3 py-2 text-center">
                  <p className="text-xl font-black text-teal-300">{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-3xl bg-white p-4 shadow-soft sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50"
              onClick={() => {
                const firstProtocol = safeProtocols.find((protocol) => protocol.category === category.name)
                if (firstProtocol) handleSelectProtocol(firstProtocol.id)
              }}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                {category.icon === 'HeartPulse' ? <Activity size={18} /> : null}
                {category.icon === 'BrainCircuit' ? <ShieldAlert size={18} /> : null}
                {category.icon === 'Stethoscope' ? <Stethoscope size={18} /> : null}
                {category.icon === 'ShieldAlert' ? <ShieldAlert size={18} /> : null}
                {category.icon === 'Activity' ? <Activity size={18} /> : null}
                {category.icon === 'AlertTriangle' ? <Bell size={18} /> : null}
              </div>
              <p className="text-sm font-semibold text-slate-900">{category.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{category.description}</p>
            </button>
          ))}
        </section>

        <section id="protocolos" className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <aside className="rounded-[28px] bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input
                aria-label="Buscar protocolos"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar protocolo"
                className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="mt-4 space-y-3">
              {filteredProtocols.map((protocol) => {
                const isActive = protocol.id === selectedProtocol?.id
                const isFavorite = favorites.includes(protocol.id)

                return (
                  <button
                    key={protocol.id}
                    type="button"
                    onClick={() => handleSelectProtocol(protocol.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${isActive ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{protocol.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{protocol.category}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Favoritar ${protocol.title}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleProtocolFavorite(protocol.id)
                        }}
                        className={`rounded-full p-1 ${isFavorite ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-400'}`}
                      >
                        <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{protocol.summary}</p>
                  </button>
                )
              })}
            </div>
          </aside>

          <article className="rounded-[28px] bg-white p-5 shadow-soft sm:p-6">
            {selectedProtocol ? (
              <>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{selectedProtocol.category}</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">{selectedProtocol.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{selectedProtocol.population}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleProtocolFavorite(selectedProtocol.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${favorites.includes(selectedProtocol.id) ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}
                  >
                    <Heart size={16} fill={favorites.includes(selectedProtocol.id) ? 'currentColor' : 'none'} />
                    {favorites.includes(selectedProtocol.id) ? 'Salvo' : 'Salvar'}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Resumo</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selectedProtocol.summary}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contexto</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selectedProtocol.context}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  {[
                    { label: 'Avaliação inicial', items: selectedProtocol.initialAssessment },
                    { label: 'Critérios diagnósticos', items: selectedProtocol.diagnosticCriteria },
                    { label: 'Exames', items: selectedProtocol.exams },
                    { label: 'Conduta', items: selectedProtocol.conduct },
                    { label: 'Tratamento', items: selectedProtocol.treatment },
                    { label: 'Monitoramento', items: selectedProtocol.monitoring },
                    { label: 'Encaminhamento', items: selectedProtocol.referral },
                  ].map((section) => (
                    <div key={section.label}>
                      <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">{section.label}</h4>
                      <ul className="mt-3 space-y-2">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-teal-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Clock3 size={16} />
                    <span className="text-xs font-bold uppercase tracking-[0.18em]">Status</span>
                  </div>
                  <p className="mt-2 text-sm text-amber-900">
                    {selectedProtocol.approvalStatus} · {selectedProtocol.statusNote}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Nenhum protocolo encontrado.</p>
            )}
          </article>
        </section>

        <section id="favoritos" className="mt-8 rounded-[28px] bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-900">Favoritos</h3>
            <a href="#protocolos" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
              Explorar <ChevronRight size={16} />
            </a>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {favoriteProtocols.length > 0 ? (
              favoriteProtocols.map((protocol) => (
                <button
                  key={protocol.id}
                  type="button"
                  onClick={() => handleSelectProtocol(protocol.id)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-teal-300"
                >
                  <p className="text-sm font-bold text-slate-900">{protocol.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{protocol.category}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">Ainda não há favoritos salvos.</p>
            )}
          </div>
        </section>

        <section id="historico" className="mt-8 rounded-[28px] bg-white p-5 shadow-soft">
          <h3 className="text-xl font-black text-slate-900">Histórico recente</h3>
          <div className="mt-4 space-y-3">
            {recentProtocols.length > 0 ? (
              recentProtocols.map((protocol) => (
                <button
                  key={protocol.id}
                  type="button"
                  onClick={() => handleSelectProtocol(protocol.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{protocol.title}</p>
                    <p className="text-xs text-slate-500">{protocol.category}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">Seu histórico aparecerá aqui quando você abrir protocolos.</p>
            )}
          </div>
        </section>

        <section id="sobre" className="mt-8 rounded-[28px] bg-slate-900 p-5 text-white shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Atenção</p>
              <h3 className="mt-2 text-2xl font-black">Conteúdo demonstrativo</h3>
            </div>
            <div className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
              Não substitui diretriz institucional
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            PlantãoMed foi pensado como referência visual e funcional para busca rápida, organização por categoria e leitura de protocolos de urgência. O conteúdo exposto é demonstrativo e não representa validação clínica definitiva.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
