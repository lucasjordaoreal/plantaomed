import { ArrowRight, BookOpenText, ChevronRight, HeartPulse, Search, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react'
import { useRef, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { setOnboardingCompleted } from '../lib/storage'

const featureCards = [
  {
    icon: Search,
    title: 'Pesquisa clínica',
    text: 'Encontre temas, sinais e sintomas e documentos de forma rápida e organizada.',
  },
  {
    icon: BookOpenText,
    title: 'Biblioteca clínica',
    text: 'Acesse referências e protocolos com navegação simples e leitura focada.',
  },
  {
    icon: HeartPulse,
    title: 'Sinais e sintomas',
    text: 'Explore apresentações clínicas por contexto, relevância e organização visual.',
  },
  {
    icon: ShieldCheck,
    title: 'Diretrizes brasileiras',
    text: 'Consulte materiais institucionais e referências catalogadas para orientação.',
  },
  {
    icon: Stethoscope,
    title: 'Ferramentas clínicas',
    text: 'Utilize recursos práticos para apoio à consulta e ao trabalho profissional.',
  },
  {
    icon: Sparkles,
    title: 'Favoritos e histórico',
    text: 'Guarde itens relevantes e retorne aos contextos mais usados em poucos passos.',
  },
]

const showcaseItems = [
  { label: 'Pesquisa médica', kind: 'search' },
  { label: 'Medicamento', kind: 'drug' },
  { label: 'Referência', kind: 'reference' },
  { label: 'Temas clínicos', kind: 'topics' },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const enteringRef = useRef(false)
  const [isEntering, setIsEntering] = useState(false)

  const handleEnter = (event: MouseEvent<HTMLButtonElement>) => {
    if (enteringRef.current) return
    enteringRef.current = true
    setIsEntering(true)
    setOnboardingCompleted(true)
    const bounds = event.currentTarget.getBoundingClientRect()
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const transitionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    navigate('/inicio', {
      replace: true,
      state: reducedMotion || !window.innerWidth || !window.innerHeight
        ? null
        : {
            onboardingTransition: {
              id: transitionId,
              x: (bounds.left + bounds.width / 2) / window.innerWidth,
              y: (bounds.top + bounds.height / 2) / window.innerHeight,
            },
          },
    })
  }

  return (
    <div className="onboarding-shell">
      <div className="onboarding-backdrop" aria-hidden="true" />
      <header className="onboarding-header">
        <div className="brand-mark">PlantãoMed</div>
      </header>

      <main className="onboarding-main">
        <section className="onboarding-hero">
          <div className="onboarding-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Plataforma clínica</span>
            <h1 data-page-heading tabIndex={-1}>PlantãoMed. Conhecimento clínico, quando você precisa.</h1>
            <p>
              Uma plataforma desenvolvida para a rotina médica brasileira, reunindo referências clínicas,
              diretrizes, medicamentos e ferramentas de consulta em uma experiência rápida e organizada.
            </p>
            <div className="onboarding-actions">
              <button type="button" className="primary-button" onClick={handleEnter} disabled={isEntering}>
                Entrar no PlantãoMed
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <a href="#plataforma" className="secondary-button">
                Conhecer a plataforma
              </a>
            </div>
          </div>

          <div className="onboarding-showcase" aria-label="Demonstração visual da plataforma">
            <div className="showcase-card showcase-card--search">
              <div className="showcase-label">Pesquisar</div>
              <div className="showcase-search">
                <Search size={15} aria-hidden="true" />
                <span>medicina baseada em evidência</span>
              </div>
            </div>
            <div className="showcase-card showcase-card--drug">
              <div className="showcase-badge">Medicamento</div>
              <h2>Dipirona</h2>
              <p>Uso clínico e apresentações gerais</p>
            </div>
            <div className="showcase-card showcase-card--reference">
              <div className="showcase-badge">Referência</div>
              <p>Diretriz e revisão institucional</p>
            </div>
            <div className="showcase-list">
              {showcaseItems.map((item) => (
                <div key={item.label} className={`showcase-pill showcase-pill--${item.kind}`}>
                  <span className="showcase-pill__dot" aria-hidden="true" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plataforma" className="onboarding-features">
          <div className="section-heading section-heading--centered">
            <div>
              <span className="eyebrow">O que você encontra</span>
              <h2>Ferramentas para a rotina clínica</h2>
            </div>
          </div>

          <div className="feature-grid">
            {featureCards.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="feature-card" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="feature-icon"><Icon size={19} aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="onboarding-cta">
          <div className="cta-panel glass-surface">
            <div>
              <span className="eyebrow">Seu ambiente de consulta</span>
              <h2>Seu ambiente de consulta clínica está pronto.</h2>
            </div>
            <button type="button" className="primary-button" onClick={handleEnter} disabled={isEntering}>
              Começar a explorar
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
