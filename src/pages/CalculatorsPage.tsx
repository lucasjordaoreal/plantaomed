import { useMemo, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, Calculator, Search, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AppSelect } from '../components/ui/AppSelect'
import { calculatorCategories, calculators, normalizeCalculatorSearch, type CalculatorDefinition } from '../features/calculators/catalog'
import { calculate, parseCalculatorNumber, type CalculatorValues } from '../features/calculators/engine'
import { SharePageButton } from '../components/SharePageButton'

function CalculatorNotice() {
  const automatedTestsCount = calculators.filter(({ automatedTestsIncluded }) => automatedTestsIncluded).length
  const clinicalReviewCount = calculators.filter(({ clinicallyReviewed }) => clinicallyReviewed).length
  const releaseCount = calculators.filter(({ clinicallyReleased }) => clinicallyReleased).length

  return (
    <section className="calculator-library__notice" role="note">
      <strong>Ferramentas de referência técnica</strong>
      <p>Os cálculos são locais e determinísticos. Nenhuma ferramenta deste catálogo tem revisão clínica documentada ou liberação assistencial; resultados não substituem avaliação profissional.</p>
      <div className="calculator-library__counts">
        <span aria-label={`${calculators.length} cálculos implementados`}><strong>{calculators.length}</strong> cálculos implementados</span>
        <span aria-label={`${automatedTestsCount} com testes automatizados`}><strong>{automatedTestsCount}</strong> com testes automatizados</span>
        <span aria-label={`${clinicalReviewCount} com revisão clínica registrada`}><strong>{clinicalReviewCount}</strong> com revisão clínica registrada</span>
        <span aria-label={`${releaseCount} liberados para uso assistencial`}><strong>{releaseCount}</strong> liberados para uso assistencial</span>
      </div>
    </section>
  )
}

function CalculatorCard({ calculator }: { calculator: CalculatorDefinition }) {
  return (
    <Link className="calculator-card" to={`/calculadoras/${calculator.id}`}>
      <span className="calculator-card__icon"><Calculator size={18} aria-hidden="true" /></span>
      <div className="calculator-card__body">
        <span className="calculator-card__category">{calculator.category} · {calculator.specialty}</span>
        <h2>{calculator.name} <span>{calculator.abbreviation}</span></h2>
        <p>{calculator.purpose}</p>
      </div>
      <ArrowRight className="calculator-card__arrow" size={17} aria-hidden="true" />
    </Link>
  )
}

function CalculatorLibrary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const filteredCalculators = useMemo(() => {
    const normalizedQuery = normalizeCalculatorSearch(query)
    return calculators.filter((calculator) => {
      const matchesCategory = category === 'Todas' || calculator.category === category
      const searchableContent = normalizeCalculatorSearch([
        calculator.name,
        calculator.abbreviation,
        calculator.category,
        calculator.specialty,
        calculator.purpose,
        ...calculator.synonyms,
      ].join(' '))
      return matchesCategory && (!normalizedQuery || searchableContent.includes(normalizedQuery))
    })
  }, [category, query])

  return (
    <div className="page-stack calculator-library">
      <header className="page-heading page-heading--actions">
        <div>
          <span className="eyebrow"><Activity size={14} aria-hidden="true" /> Ferramentas clínicas</span>
          <h1 data-page-heading tabIndex={-1}>Calculadoras Médicas</h1>
          <p>Escores, índices e equações clínicas para consulta profissional.</p>
        </div>
        <SharePageButton />
      </header>
      <CalculatorNotice />
      <section className="calculator-library__controls" aria-label="Pesquisar e filtrar calculadoras">
        <label className="calculator-library__search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Pesquisar calculadoras por nome, sigla, especialidade ou finalidade</span>
          <input
            type="search"
            aria-label="Pesquisar calculadoras por nome, sigla, especialidade ou finalidade"
            placeholder="Pesquisar calculadoras"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="calculator-library__categories" aria-label="Categorias">
          {['Todas', ...calculatorCategories].map((item) => (
            <button
              className={category === item ? 'is-selected' : ''}
              type="button"
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <p className="calculator-library__result-count" role="status">
        {filteredCalculators.length} {filteredCalculators.length === 1 ? 'calculadora encontrada' : 'calculadoras encontradas'}
      </p>
      {filteredCalculators.length > 0
        ? <section className="calculator-library__grid" aria-label="Calculadoras disponíveis">
          {filteredCalculators.map((calculator) => <CalculatorCard key={calculator.id} calculator={calculator} />)}
        </section>
        : <section className="medications-panel"><h2>Nenhuma ferramenta encontrada</h2><p>Altere os termos da pesquisa ou selecione outra categoria.</p></section>}
    </div>
  )
}

function CalculatorDetail({ calculator }: { calculator: CalculatorDefinition }) {
  const [values, setValues] = useState<CalculatorValues>({})
  const [copyMessage, setCopyMessage] = useState('')
  const result = calculate(calculator.id, values)
  const missingFields = calculator.fields
    .filter(({ id }) => !values[id]?.trim())
    .map(({ label }) => label)

  const setFieldValue = (id: string, value: string) => {
    setValues((current) => ({ ...current, [id]: value }))
    setCopyMessage('')
  }

  const clearValues = () => {
    setValues({})
    setCopyMessage('')
  }

  const copyResult = async () => {
    if (!result) return
    const text = [
      `${calculator.name} (${calculator.abbreviation}): ${result.value}${result.unit ? ` ${result.unit}` : ''}`,
      result.classification ? `Classificação: ${result.classification}` : '',
      `Interpretação: ${result.interpretation}`,
      `Entradas: ${result.components.join('; ')}`,
      `Referência: ${calculator.references.map(({ title, url }) => `${title} — ${url}`).join('; ')}`,
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopyMessage('Resultado copiado.')
    } catch {
      setCopyMessage('Não foi possível copiar. Selecione e copie o resultado manualmente.')
    }
  }

  const hasInvalidInput = calculator.fields.some(({ id }) => {
    const raw = values[id]
    if (!raw?.trim()) return false
    const field = calculator.fields.find((item) => item.id === id)
    if (field?.options) return !field.options.some(({ value }) => value === raw)
    const numeric = parseCalculatorNumber(raw)
    if (numeric === null) return true
    if (id === 'age') return numeric < 18 || !Number.isInteger(numeric)
      || (calculator.id === 'bmi-adult' && numeric < 20)
      || (calculator.id === 'rcri' && numeric < 50)
    if (id === 'fiO2') return numeric < 21 || numeric > 100
    return numeric <= 0
  })

  return (
    <div className="page-stack calculator-detail">
      <Link className="calculator-detail__back" to="/calculadoras"><ArrowLeft size={16} aria-hidden="true" /> Todas as calculadoras</Link>
      <header className="page-heading">
        <span className="eyebrow">{calculator.category} · {calculator.specialty}</span>
        <h1 data-page-heading tabIndex={-1}>{calculator.name}</h1>
        <p>{calculator.purpose}</p>
        <SharePageButton />
      </header>
      <CalculatorNotice />
      <div className="calculator-detail__layout">
        <section className="calculator-detail__panel" aria-labelledby="calculator-inputs-heading">
          <div className="calculator-detail__panel-heading">
            <div><h2 id="calculator-inputs-heading">Dados de entrada</h2><p>{calculator.population}</p></div>
            <button className="calculator-detail__clear" type="button" onClick={clearValues} disabled={Object.keys(values).length === 0}>
              <Trash2 size={15} aria-hidden="true" /> Limpar
            </button>
          </div>
          <div className="calculator-detail__fields">
            {calculator.fields.map((field) => (
              <label className="calculator-detail__field" key={field.id}>
                <span>{field.label}{field.unit && <small> · {field.unit}</small>}</span>
                {field.options
                  ? <AppSelect
                    value={values[field.id] ?? ''}
                    onValueChange={(nextValue) => setFieldValue(field.id, nextValue)}
                    options={field.options}
                    placeholder="Selecione"
                  />
                  : <input
                    type="text"
                    inputMode={field.inputMode ?? 'decimal'}
                    autoComplete="off"
                    value={values[field.id] ?? ''}
                    onChange={(event) => setFieldValue(field.id, event.target.value)}
                  />}
                {field.helpText && <small className="calculator-detail__help">{field.helpText}</small>}
              </label>
            ))}
          </div>
          {missingFields.length > 0 && <p className="calculator-detail__muted">Preencha: {missingFields.join(', ')}.</p>}
          {hasInvalidInput && <p className="calculator-detail__error" role="alert">Revise os campos: utilize números válidos e respeite a população e as unidades indicadas. Campos ausentes não são tratados como zero.</p>}
        </section>
        <section className="calculator-detail__panel calculator-detail__result" aria-live="polite" aria-labelledby="calculator-result-heading">
          <h2 id="calculator-result-heading">Resultado</h2>
          {result && !hasInvalidInput
            ? <>
              <p className="calculator-detail__result-value">{result.value} <span>{result.unit}</span></p>
              {result.classification && <p className="calculator-detail__classification">{result.classification}</p>}
              <p>{result.interpretation}</p>
              <h3>Componentes utilizados</h3>
              <ul>{result.components.map((component) => <li key={component}>{component}</li>)}</ul>
              <button className="calculator-detail__copy" type="button" onClick={() => void copyResult()}>Copiar descrição</button>
              {copyMessage && <p className="calculator-detail__copy-status" role="status">{copyMessage}</p>}
            </>
            : <p className="calculator-detail__muted">O resultado aparecerá quando todos os dados forem preenchidos e válidos.</p>}
        </section>
      </div>
      <section className="calculator-detail__panel calculator-detail__info">
        <h2>Fórmula e aplicabilidade</h2>
        <p>{calculator.formula}</p>
        <h3>Limitações</h3>
        <ul>{calculator.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
        <h3>Referências</h3>
        <ul className="calculator-detail__references">
          {calculator.references.map((reference) => (
            <li key={reference.url}>
              <a href={reference.url} target="_blank" rel="noreferrer">
                {reference.organization}{reference.year ? ` (${reference.year})` : ''}: {reference.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function CalculatorsPage() {
  const { calculatorId } = useParams()
  if (!calculatorId) return <CalculatorLibrary />
  const calculator = calculators.find(({ id }) => id === calculatorId)
  if (!calculator) {
    return (
      <div className="page-stack">
        <header className="page-heading"><h1 data-page-heading tabIndex={-1}>Calculadora não encontrada</h1><p>Esse identificador não corresponde a uma ferramenta disponível.</p></header>
        <Link className="calculator-detail__back" to="/calculadoras"><ArrowLeft size={16} aria-hidden="true" /> Voltar à biblioteca</Link>
      </div>
    )
  }
  return <CalculatorDetail calculator={calculator} />
}
