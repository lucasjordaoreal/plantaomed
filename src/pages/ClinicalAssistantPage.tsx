import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FlaskConical,
  Info,
  LoaderCircle,
  MessageCircle,
  Pill,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { clinicalPresentations, searchClinicalPresentations } from '../data/clinicalPresentations'
import { assessClinicalCase } from '../features/clinical-assistant/engine/assessCase'
import { clinicalKnowledgeBase } from '../features/clinical-assistant/rules'
import type { ClinicalCase, VitalSignId, VitalSignObservation } from '../features/clinical-assistant/types'
import { validateVitalSigns, vitalSignDefinitions } from '../features/clinical-assistant/validation/vitalSigns'
import { AiRequestError, requestAssistantReply } from '../lib/ai'
import type { AiAssistantResult, ClinicalQuestionType } from '../lib/ai'

const steps = [
  { label: 'Avaliação clínica', icon: ClipboardList },
  { label: 'Gravidade e dados objetivos', icon: ShieldAlert },
  { label: 'Hipóteses', icon: Stethoscope },
  { label: 'Investigação', icon: FlaskConical },
  { label: 'Manejo', icon: Pill },
]

const emptyObservation = (): VitalSignObservation => ({ state: 'not_assessed', value: '' })

const createEmptyCase = (): ClinicalCase => ({
  ageYears: '',
  biologicalSex: 'not_informed',
  pregnancyStatus: 'unknown',
  weightKg: '',
  careSetting: '',
  comorbidities: '',
  currentMedications: '',
  allergies: '',
  primaryPresentationId: '',
  associatedPresentationIds: [],
  onset: '',
  duration: '',
  progression: '',
  severity: '',
  location: '',
  aggravatingFactors: '',
  relievingFactors: '',
  relevantNegatives: '',
  physicalExamFindings: [],
  laboratoryResults: [],
  imagingResults: [],
  vitalSigns: {
    systolicPressure: emptyObservation(),
    diastolicPressure: emptyObservation(),
    heartRate: emptyObservation(),
    respiratoryRate: emptyObservation(),
    oxygenSaturation: emptyObservation(),
    temperature: emptyObservation(),
    capillaryGlucose: emptyObservation(),
  },
  consciousness: 'not_assessed',
})

const fieldClass = 'clinical-assistant__field'
type AiStatus = 'ready' | 'analyzing' | 'additional' | 'result' | 'failed' | 'limited'

export function ClinicalAssistantPage() {
  const [clinicalCase, setClinicalCase] = useState(createEmptyCase)
  const [step, setStep] = useState(0)
  const [symptomQuery, setSymptomQuery] = useState('')
  const [symptomToAdd, setSymptomToAdd] = useState('')
  const [vitalErrors, setVitalErrors] = useState<ReturnType<typeof validateVitalSigns>>([])
  const [aiDescription, setAiDescription] = useState('')
  const [syntheticConfirmed, setSyntheticConfirmed] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiStatus>('ready')
  const [aiResult, setAiResult] = useState<AiAssistantResult | null>(null)
  const [aiFindingsConfirmed, setAiFindingsConfirmed] = useState(false)
  const [aiModel, setAiModel] = useState('')
  const [aiError, setAiError] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiQuestionType, setAiQuestionType] = useState<ClinicalQuestionType>('clarify')
  const findingSequence = useRef(0)
  const aiRequestController = useRef<AbortController | null>(null)

  const assessment = useMemo(() => assessClinicalCase(clinicalCase), [clinicalCase])
  const primaryPresentation = clinicalPresentations.find(({ id }) => id === clinicalCase.primaryPresentationId)
  const associatedPresentations = clinicalCase.associatedPresentationIds
    .map((id) => clinicalPresentations.find((presentation) => presentation.id === id))
    .filter((presentation) => presentation !== undefined)
  const availableSymptoms = searchClinicalPresentations(symptomQuery)
    .filter(({ id }) => id !== clinicalCase.primaryPresentationId && !clinicalCase.associatedPresentationIds.includes(id))
  const currentVitalErrors = new Map(vitalErrors.map(({ id, message }) => [id, message]))

  useEffect(() => () => aiRequestController.current?.abort(), [])

  const updateCase = <K extends keyof ClinicalCase>(field: K, value: ClinicalCase[K]) => {
    setClinicalCase((current) => ({ ...current, [field]: value }))
  }

  const updateVital = (id: VitalSignId, updates: Partial<VitalSignObservation>) => {
    setClinicalCase((current) => ({
      ...current,
      vitalSigns: { ...current.vitalSigns, [id]: { ...current.vitalSigns[id], ...updates } },
    }))
    setVitalErrors((current) => current.filter((error) => error.id !== id && !(id === 'diastolicPressure' && error.id === 'systolicPressure')))
  }

  const addAssociatedSymptom = () => {
    if (!symptomToAdd || clinicalCase.associatedPresentationIds.includes(symptomToAdd)) return
    updateCase('associatedPresentationIds', [...clinicalCase.associatedPresentationIds, symptomToAdd])
    setSymptomToAdd('')
  }

  const addClinicalFinding = (field: 'physicalExamFindings' | 'laboratoryResults' | 'imagingResults') => {
    findingSequence.current += 1
    updateCase(field, [...clinicalCase[field], {
      id: `finding-${findingSequence.current}`,
      label: '',
      state: 'not_assessed',
    }])
  }

  const updateClinicalFinding = (
    field: 'physicalExamFindings' | 'laboratoryResults' | 'imagingResults',
    id: string,
    updates: Partial<ClinicalCase['physicalExamFindings'][number]>,
  ) => {
    updateCase(field, clinicalCase[field].map((finding) => finding.id === id ? { ...finding, ...updates } : finding))
  }

  const removeClinicalFinding = (field: 'physicalExamFindings' | 'laboratoryResults' | 'imagingResults', id: string) => {
    updateCase(field, clinicalCase[field].filter((finding) => finding.id !== id))
  }

  const advance = () => {
    if (step === 0) {
      if (aiResult && !aiFindingsConfirmed) {
        setAiError('Revise e confirme os achados estruturados antes de prosseguir.')
        return
      }
      const age = clinicalCase.ageYears.trim() ? Number(clinicalCase.ageYears) : null
      const weight = clinicalCase.weightKg.trim() ? Number(clinicalCase.weightKg) : null
      if (age !== null && (!Number.isInteger(age) || age < 0 || age > 120)) return
      if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 500)) return
      if (!clinicalCase.primaryPresentationId) return
    }
    if (step === 1) {
      const errors = validateVitalSigns(clinicalCase)
      setVitalErrors(errors)
      if (errors.length > 0) return
    }
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  const reset = () => {
    aiRequestController.current?.abort()
    setClinicalCase(createEmptyCase())
    setStep(0)
    setSymptomQuery('')
    setSymptomToAdd('')
    setVitalErrors([])
    setAiDescription('')
    setSyntheticConfirmed(false)
    setAiStatus('ready')
    setAiResult(null)
    setAiFindingsConfirmed(false)
    setAiModel('')
    setAiError('')
    setAiQuestion('')
    findingSequence.current = 0
  }

  const runAiRequest = async (action: 'structure' | 'contextual') => {
    if (!syntheticConfirmed || !aiDescription.trim()) {
      setAiStatus('additional')
      setAiError('Informe uma descrição sintética e confirme que não contém dados de pacientes reais.')
      return
    }

    const confirmedSummary = aiResult
      ? JSON.stringify(Object.fromEntries(Object.entries(aiResult.findings).map(([field, value]) => [
        field,
        typeof value === 'string'
          ? value.slice(0, 250)
          : value.slice(0, 5).map((item) => item.slice(0, 120)),
      ])))
      : ''
    const clinicalDescription = action === 'contextual' && aiResult
      ? `${aiDescription}\n\nAchados revisados pelo médico:\n${confirmedSummary}`
      : aiDescription
    const description = `[PLANTAOMED SYNTHETIC CASE]\n${clinicalDescription}`
    const controller = new AbortController()
    aiRequestController.current = controller
    setAiStatus('analyzing')
    setAiError('')

    try {
      const request = action === 'structure'
        ? { action, description, syntheticOnly: true as const }
        : {
          action,
          description,
          question: aiQuestion.trim(),
          questionType: aiQuestionType,
          syntheticOnly: true as const,
        }
      const response = await requestAssistantReply(request, { signal: controller.signal })
      setAiResult(response.result)
      setAiFindingsConfirmed(false)
      setAiModel(response.model)
      setAiStatus(response.result.findings.unknownInformation.length > 0 ? 'additional' : 'result')
      if (action === 'contextual') setAiQuestion('')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setAiStatus('failed')
        setAiError('Consulta cancelada. Nenhuma avaliação clínica foi alterada.')
      } else if (error instanceof AiRequestError && error.status === 429) {
        setAiStatus('limited')
        setAiError(error.message)
      } else if (error instanceof AiRequestError && error.status === 401) {
        setAiStatus('failed')
        setAiError('Sua sessão expirou. Entre novamente para continuar.')
      } else {
        setAiStatus('failed')
        setAiError(error instanceof Error ? error.message : 'Falha ao consultar o Assistente Clínico.')
      }
    } finally {
      if (aiRequestController.current === controller) aiRequestController.current = null
    }
  }

  const updateAiFindingList = (field: keyof AiAssistantResult['findings'], value: string) => {
    if (!aiResult) return
    const parsed = field === 'chiefComplaint' || field === 'evolution'
      ? value
      : value.split('\n').map((item) => item.trim()).filter(Boolean)
    setAiResult({
      ...aiResult,
      findings: { ...aiResult.findings, [field]: parsed },
    })
    setAiFindingsConfirmed(false)
  }

  const handleAiQuestion = () => {
    if (!aiQuestion.trim()) {
      setAiError('Escreva uma pergunta para continuar.')
      return
    }
    if (aiQuestionType !== 'clarify') {
      setAiStatus('failed')
      setAiError('A biblioteca contém metadados, mas ainda não há texto documental indexado. Critérios, referências e perguntas sobre trechos recuperados estão indisponíveis.')
      return
    }
    void runAiRequest('contextual')
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <h1 data-page-heading tabIndex={-1}>Assistente Clínico</h1>
        <p>Organize achados sem identificadores. Os dados ficam somente na memória desta página e são descartados ao limpar ou sair.</p>
      </header>
      <section className="clinical-assistant__notice" role="status">
        <Info size={20} aria-hidden="true" />
        <div>
          <strong>Ferramenta de organização, não de decisão clínica</strong>
          <p>A estruturação por IA depende da disponibilidade da Function e aceita somente casos sintéticos. Hipóteses, investigações e opções terapêuticas permanecem indisponíveis sem regras e validação clínica aprovadas.</p>
        </div>
      </section>
      <section className="clinical-assistant__ai-panel" aria-labelledby="clinical-assistant-ai-heading">
        <div className="clinical-assistant__section-heading">
          <Sparkles size={20} aria-hidden="true" />
          <div>
            <h2 id="clinical-assistant-ai-heading">Estruturar descrição com Gemini</h2>
            <p>A IA organiza somente o que foi escrito. A resposta precisa ser revisada e não confirma diagnóstico.</p>
          </div>
        </div>
        <label className={fieldClass}>
          <span>Descrição clínica</span>
          <textarea
            rows={4}
            maxLength={5_000}
            value={aiDescription}
            onChange={(event) => {
              setAiDescription(event.target.value)
              setAiResult(null)
              setAiFindingsConfirmed(false)
              setAiStatus('ready')
              setAiError('')
            }}
            placeholder="Ex.: Paciente adulto com dor torácica, dispneia e sudorese há cerca de uma hora. Antecedente de hipertensão."
            autoComplete="off"
            disabled={aiStatus === 'analyzing'}
          />
        </label>
        <label className="clinical-assistant__synthetic-confirmation">
          <input
            type="checkbox"
            checked={syntheticConfirmed}
            onChange={(event) => setSyntheticConfirmed(event.target.checked)}
            disabled={aiStatus === 'analyzing'}
          />
          <span>Confirmo que não me devo basear nas informações fornecidas.</span>
        </label>
        <div className="clinical-assistant__ai-actions">
          {aiStatus === 'analyzing'
            ? <button className="clinical-assistant__secondary-button" type="button" onClick={() => aiRequestController.current?.abort()}><X size={16} aria-hidden="true" /> Cancelar consulta</button>
            : <button className="clinical-assistant__primary-button" type="button" onClick={() => void runAiRequest('structure')} disabled={!aiDescription.trim() || !syntheticConfirmed}><Sparkles size={16} aria-hidden="true" /> Analisar descrição</button>}
          <span className="clinical-assistant__ai-status" role="status" aria-live="polite">
            {aiStatus === 'analyzing' && <><LoaderCircle size={15} className="clinical-assistant__spinner" aria-hidden="true" /> Analisando</>}
            {aiStatus === 'ready' && 'Pronto para análise'}
            {aiStatus === 'additional' && 'Solicitando informações adicionais'}
            {aiStatus === 'result' && 'Resultado disponível · revisão médica necessária'}
            {aiStatus === 'failed' && 'Falha na consulta'}
            {aiStatus === 'limited' && 'Limite de utilização atingido'}
          </span>
        </div>
        {aiError && <p className="clinical-assistant__error" role="alert">{aiError}</p>}

        {aiResult && (
          <div className="clinical-assistant__ai-result">
            <div className="clinical-assistant__result-card">
              <strong>Resumo para conferência — não é diagnóstico</strong>
              <p>{aiResult.summary || 'Sem resumo informado.'}</p>
            </div>
            <div className="clinical-assistant__ai-findings">
              <label className={fieldClass}><span>Queixa principal extraída</span><textarea rows={2} value={aiResult.findings.chiefComplaint} onChange={(event) => updateAiFindingList('chiefComplaint', event.target.value)} /></label>
              <label className={fieldClass}><span>Sintomas associados</span><textarea rows={3} value={aiResult.findings.associatedSymptoms.join('\n')} onChange={(event) => updateAiFindingList('associatedSymptoms', event.target.value)} /></label>
              <label className={fieldClass}><span>Tempo e evolução</span><textarea rows={2} value={aiResult.findings.evolution} onChange={(event) => updateAiFindingList('evolution', event.target.value)} /></label>
              <label className={fieldClass}><span>Antecedentes informados</span><textarea rows={3} value={aiResult.findings.reportedHistory.join('\n')} onChange={(event) => updateAiFindingList('reportedHistory', event.target.value)} /></label>
              <label className={fieldClass}><span>Achados positivos informados</span><textarea rows={3} value={aiResult.findings.positiveFindings.join('\n')} onChange={(event) => updateAiFindingList('positiveFindings', event.target.value)} /></label>
              <label className={fieldClass}><span>Achados negativos explicitamente mencionados</span><textarea rows={3} value={aiResult.findings.explicitNegativeFindings.join('\n')} onChange={(event) => updateAiFindingList('explicitNegativeFindings', event.target.value)} /></label>
              <label className={fieldClass}><span>Informações desconhecidas / não informadas</span><textarea rows={3} value={aiResult.findings.unknownInformation.join('\n')} onChange={(event) => updateAiFindingList('unknownInformation', event.target.value)} /></label>
            </div>
            <p className="clinical-assistant__muted">Confirme ou corrija cada campo antes de usá-lo. Os campos desconhecidos não são tratados como negativos. Revisão: {aiModel || 'modelo não identificado'}.</p>
            {aiResult.answer && <div className="clinical-assistant__result-card"><strong>Resposta</strong><p>{aiResult.answer}</p></div>}
            {aiResult.evidenceSummary && <div className="clinical-assistant__result-card"><strong>Base documental</strong><p>{aiResult.evidenceSummary}</p></div>}
            {aiResult.references.length > 0
              ? <ul className="clinical-assistant__ai-references">{aiResult.references.map((reference) => <li key={reference.id}><a href={reference.url} target="_blank" rel="noreferrer">{reference.title} — {reference.section} ({reference.version})</a></li>)}</ul>
              : <p className="clinical-assistant__muted">Nenhum trecho documental foi recuperado; não são apresentadas referências geradas pela IA.</p>}
            {aiResult.limitations.map((limitation) => <p className="clinical-assistant__muted" key={limitation}>{limitation}</p>)}
            <label className="clinical-assistant__synthetic-confirmation">
              <input type="checkbox" checked={aiFindingsConfirmed} onChange={(event) => {
                setAiFindingsConfirmed(event.target.checked)
                setAiError('')
              }} />
              <span>Revisei e confirmei os achados acima. Vou preencher o formulário clínico existente manualmente; a IA não altera regras nem dados objetivos.</span>
            </label>
            <div className="clinical-assistant__ai-chat">
              <div className="clinical-assistant__section-heading"><MessageCircle size={18} aria-hidden="true" /><div><h3>Interação contextual</h3><p>O contexto permanece nesta página e será enviado somente após a confirmação de caso fictício.</p></div></div>
              <label className={fieldClass}>
                <span>Tipo de interação</span>
                <select value={aiQuestionType} onChange={(event) => setAiQuestionType(event.target.value as ClinicalQuestionType)}>
                  <option value="clarify">Esclarecer um termo do texto</option>
                  <option value="criteria">Consultar critérios documentados</option>
                  <option value="references">Buscar referências</option>
                  <option value="recovered_content">Perguntar sobre conteúdo recuperado</option>
                </select>
              </label>
              <label className={fieldClass}>
                <span>Pergunta ou correção contextual</span>
                <textarea rows={2} maxLength={500} value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} placeholder="Ex.: O que significa o termo X nesta descrição?" disabled={aiStatus === 'analyzing'} />
              </label>
              <button className="clinical-assistant__secondary-button" type="button" onClick={handleAiQuestion} disabled={aiStatus === 'analyzing'}><MessageCircle size={16} aria-hidden="true" /> Enviar pergunta</button>
            </div>
          </div>
        )}
      </section>

      <nav className="clinical-assistant__steps" aria-label="Etapas da avaliação">
        {steps.map(({ label, icon: Icon }, index) => (
          <button
            type="button"
            className={`clinical-assistant__step${index === step ? ' is-current' : ''}${index < step ? ' is-complete' : ''}`}
            key={label}
            aria-current={index === step ? 'step' : undefined}
            onClick={() => setStep(index)}
          >
            <span className="clinical-assistant__step-icon">
              {index < step ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="clinical-assistant__workspace">
        <section className="clinical-assistant__panel">
          {step === 0 && (
            <div className="clinical-assistant__step-content">
              <div className="clinical-assistant__section-heading">
                <ClipboardList size={20} aria-hidden="true" />
                <div><h2>Avaliação clínica</h2><p>Informe somente o necessário. Campos não preenchidos permanecem desconhecidos.</p></div>
              </div>
              <div className="clinical-assistant__form-grid">
                <label className={fieldClass}>
                  <span>Idade em anos <small>(opcional; 0 a 120)</small></span>
                  <input type="number" min="0" max="120" step="1" inputMode="numeric" autoComplete="off" value={clinicalCase.ageYears} onChange={(event) => updateCase('ageYears', event.target.value)} />
                </label>
                <label className={fieldClass}>
                  <span>Sexo biológico <small>(quando relevante)</small></span>
                  <select value={clinicalCase.biologicalSex} onChange={(event) => updateCase('biologicalSex', event.target.value as ClinicalCase['biologicalSex'])}>
                    <option value="not_informed">Não informado</option><option value="female">Feminino</option><option value="male">Masculino</option><option value="other_or_intersex">Outra variação / intersexo</option>
                  </select>
                </label>
                <label className={fieldClass}>
                  <span>Gestação</span>
                  <select value={clinicalCase.pregnancyStatus} onChange={(event) => updateCase('pregnancyStatus', event.target.value as ClinicalCase['pregnancyStatus'])}>
                    <option value="unknown">Desconhecida / não informada</option><option value="not_applicable">Não se aplica</option><option value="pregnant">Gestante</option><option value="not_pregnant">Não gestante</option>
                  </select>
                </label>
                <label className={fieldClass}>
                  <span>Peso <small>(opcional; kg)</small></span>
                  <input type="number" min="0.1" max="500" step="0.1" inputMode="decimal" autoComplete="off" value={clinicalCase.weightKg} onChange={(event) => updateCase('weightKg', event.target.value)} />
                </label>
                <label className={fieldClass}>
                  <span>Contexto de atendimento</span>
                  <select value={clinicalCase.careSetting} onChange={(event) => updateCase('careSetting', event.target.value)}>
                    <option value="">Não informado</option><option>Urgência / emergência</option><option>Ambulatório</option><option>Enfermaria</option><option>Outro</option>
                  </select>
                </label>
                <label className={`${fieldClass} clinical-assistant__field--wide`}>
                  <span>Queixa principal</span>
                  <select value={clinicalCase.primaryPresentationId} onChange={(event) => updateCase('primaryPresentationId', event.target.value)}>
                    <option value="">Selecione uma manifestação</option>
                    {clinicalPresentations.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
                  </select>
                </label>
              </div>

              {clinicalCase.primaryPresentationId && (
                <div className="clinical-assistant__symptoms">
                  <label className={fieldClass}>
                    <span>Pesquisar sintomas associados</span>
                    <input type="search" autoComplete="off" value={symptomQuery} onChange={(event) => setSymptomQuery(event.target.value)} placeholder="Buscar manifestação" />
                  </label>
                  <div className="clinical-assistant__add-symptom">
                    <label className={`${fieldClass} clinical-assistant__field--wide`}>
                      <span>Adicionar manifestação</span>
                      <select value={symptomToAdd} onChange={(event) => setSymptomToAdd(event.target.value)}>
                        <option value="">Selecione um sintoma</option>
                        {availableSymptoms.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
                      </select>
                    </label>
                    <button className="clinical-assistant__secondary-button" type="button" onClick={addAssociatedSymptom} disabled={!symptomToAdd}><Plus size={16} aria-hidden="true" /> Adicionar</button>
                  </div>
                  {associatedPresentations.length > 0 ? (
                    <ul className="clinical-assistant__chips" aria-label="Sintomas associados informados">
                      {associatedPresentations.map(({ id, name }) => (
                        <li key={id}>{name}<button type="button" aria-label={`Remover ${name}`} onClick={() => updateCase('associatedPresentationIds', clinicalCase.associatedPresentationIds.filter((item) => item !== id))}><X size={14} aria-hidden="true" /></button></li>
                      ))}
                    </ul>
                  ) : <p className="clinical-assistant__muted">Nenhum sintoma associado informado; isso não significa ausência de sintomas.</p>}
                  <p className="clinical-assistant__muted">Termos não selecionados são desconhecidos, não achados negativos.</p>
                </div>
              )}

              <div className="clinical-assistant__form-grid clinical-assistant__form-grid--details">
                {([
                  ['onset', 'Início'],
                  ['duration', 'Duração'],
                  ['progression', 'Evolução'],
                  ['severity', 'Intensidade relatada'],
                  ['location', 'Localização / irradiação'],
                  ['aggravatingFactors', 'Fatores desencadeantes ou de piora'],
                  ['relievingFactors', 'Fatores de melhora'],
                  ['relevantNegatives', 'Achados negativos explicitamente avaliados'],
                ] as const).map(([field, label]) => (
                  <label className={fieldClass} key={field}>
                    <span>{label}</span>
                    <input type="text" autoComplete="off" value={clinicalCase[field]} onChange={(event) => updateCase(field, event.target.value)} />
                  </label>
                ))}
                {([
                  ['comorbidities', 'Comorbidades'],
                  ['currentMedications', 'Medicamentos em uso'],
                  ['allergies', 'Alergias medicamentosas'],
                ] as const).map(([field, label]) => (
                  <label className={`${fieldClass} clinical-assistant__field--wide`} key={field}>
                    <span>{label}</span>
                    <textarea rows={2} autoComplete="off" value={clinicalCase[field]} onChange={(event) => updateCase(field, event.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="clinical-assistant__step-content">
              <div className="clinical-assistant__section-heading">
                <ShieldAlert size={20} aria-hidden="true" />
                <div><h2>Dados objetivos e identificação de gravidade</h2><p>Não informado, desconhecido e valor registrado são estados distintos. Nenhum valor será interpretado como normal.</p></div>
              </div>
              <div className="clinical-assistant__vitals-grid">
                {vitalSignDefinitions.map(({ id, label, unit }) => {
                  const observation = clinicalCase.vitalSigns[id]
                  const error = currentVitalErrors.get(id)
                  return (
                    <div className="clinical-assistant__vital" key={id}>
                      <label className={fieldClass}>
                        <span>{label} <small>{unit}</small></span>
                        <select aria-label={`${label}: estado da informação`} value={observation.state} onChange={(event) => updateVital(id, { state: event.target.value as VitalSignObservation['state'], value: event.target.value === 'value' ? observation.value : '' })}>
                          <option value="not_assessed">Não avaliado</option><option value="unknown">Desconhecido</option><option value="value">Valor registrado</option>
                        </select>
                      </label>
                      {observation.state === 'value' && (
                        <label className={fieldClass}>
                          <span className="sr-only">{label} em {unit}</span>
                          <input type="number" step="any" inputMode="decimal" aria-label={`${label} em ${unit}`} aria-invalid={Boolean(error)} value={observation.value} onChange={(event) => updateVital(id, { value: event.target.value })} />
                        </label>
                      )}
                      {error && <p className="clinical-assistant__error" role="alert">{error}</p>}
                    </div>
                  )
                })}
                <label className={fieldClass}>
                  <span>Estado de consciência</span>
                  <select value={clinicalCase.consciousness} onChange={(event) => updateCase('consciousness', event.target.value as ClinicalCase['consciousness'])}>
                    <option value="not_assessed">Não avaliado</option><option value="unknown">Desconhecido</option><option value="present">Alteração informada</option><option value="absent">Alteração explicitamente ausente</option>
                  </select>
                </label>
              </div>
              <p className="clinical-assistant__muted">Os intervalos são validações técnicas de entrada para detectar erros de digitação; não são limites clínicos, critérios de gravidade ou recomendações.</p>
              {([
                ['physicalExamFindings', 'Exame físico direcionado'],
                ['laboratoryResults', 'Resultados laboratoriais'],
                ['imagingResults', 'Exames de imagem e outros testes'],
              ] as const).map(([field, label]) => (
                <details className="clinical-assistant__finding-group" key={field}>
                  <summary>{label} <span>({clinicalCase[field].length})</span></summary>
                  <div className="clinical-assistant__finding-list">
                    {clinicalCase[field].map((finding) => (
                      <div className="clinical-assistant__finding-row" key={finding.id}>
                        <label className={fieldClass}>
                          <span>Achado / exame</span>
                          <input type="text" autoComplete="off" value={finding.label} onChange={(event) => updateClinicalFinding(field, finding.id, { label: event.target.value })} />
                        </label>
                        <label className={fieldClass}>
                          <span>Estado da informação</span>
                          <select value={finding.state} onChange={(event) => updateClinicalFinding(field, finding.id, { state: event.target.value as ClinicalCase['physicalExamFindings'][number]['state'], value: undefined, unit: undefined })}>
                            <option value="not_assessed">Não avaliado</option><option value="unknown">Desconhecido</option><option value="present">Presente</option><option value="absent">Ausente</option><option value="value">Valor registrado</option>
                          </select>
                        </label>
                        {finding.state === 'value' && (
                          <>
                            <label className={fieldClass}>
                              <span>Valor numérico</span>
                              <input type="number" step="any" inputMode="decimal" value={finding.value ?? ''} onChange={(event) => updateClinicalFinding(field, finding.id, { value: event.target.value === '' ? undefined : Number(event.target.value) })} />
                            </label>
                            <label className={fieldClass}>
                              <span>Unidade</span>
                              <input type="text" autoComplete="off" value={finding.unit ?? ''} onChange={(event) => updateClinicalFinding(field, finding.id, { unit: event.target.value })} />
                            </label>
                          </>
                        )}
                        <button className="clinical-assistant__remove-finding" type="button" aria-label={`Remover ${label}`} onClick={() => removeClinicalFinding(field, finding.id)}><X size={15} aria-hidden="true" /> Remover</button>
                      </div>
                    ))}
                    <button className="clinical-assistant__secondary-button" type="button" onClick={() => addClinicalFinding(field)}><Plus size={15} aria-hidden="true" /> Adicionar registro</button>
                  </div>
                </details>
              ))}
              <div className="clinical-assistant__result-card">
                <strong>{assessment.severityFindings.length > 0 ? 'Critérios de gravidade identificados' : 'Nenhuma regra de gravidade foi aplicada'}</strong>
                {assessment.severityFindings.map((finding) => <p key={finding}>{finding}</p>)}
                <p>{assessment.explanation}</p>
                <p>A ausência de alertas gerados por este protótipo não significa ausência de risco clínico.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="clinical-assistant__step-content">
              <div className="clinical-assistant__section-heading">
                <Stethoscope size={20} aria-hidden="true" />
                <div><h2>Hipóteses diagnósticas</h2><p>Resultados explicáveis só serão exibidos quando houver associações clínicas revisadas.</p></div>
              </div>
              <div className="clinical-assistant__result-card">
                <strong>{assessment.hypotheses.length > 0 ? 'Hipóteses relacionadas aos critérios aplicados' : assessment.status === 'pending_clinical_data' ? 'Dados adicionais necessários' : 'Informação insuficiente para apresentar hipóteses'}</strong>
                {assessment.questions.map(({ inputId, prompt, priority }) => (
                  <p className="clinical-assistant__question" key={inputId}>
                    <strong>{priority === 'high' ? 'Prioridade clínica' : 'Dado complementar'}:</strong> {prompt}
                    <button type="button" onClick={() => setStep(
                      inputId.startsWith('vitalSigns.')
                      || inputId === 'consciousness'
                      || inputId.startsWith('physicalExamFindings.')
                      || inputId.startsWith('laboratoryResults.')
                      || inputId.startsWith('imagingResults.')
                        ? 1
                        : 0,
                    )}>Registrar informação</button>
                  </p>
                ))}
                {assessment.hypotheses.length > 0
                  ? assessment.hypotheses.map((hypothesis) => (
                    <article className="clinical-assistant__knowledge-result" key={hypothesis.conditionId}>
                      <h3>{hypothesis.name}</h3>
                      <p>Especialidade: {hypothesis.specialty}</p>
                      {hypothesis.supportingFindings.length > 0 && <p>Achados favoráveis: {hypothesis.supportingFindings.join('; ')}</p>}
                      {hypothesis.findingsThatReducePlausibility.length > 0 && <p>Achados que reduzem plausibilidade: {hypothesis.findingsThatReducePlausibility.join('; ')}</p>}
                      {hypothesis.missingData.length > 0 && <p>Dados ausentes: {hypothesis.missingData.join('; ')}</p>}
                      {hypothesis.evidence.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.organization} — {source.title}, {source.section}</a>)}
                    </article>
                  ))
                  : <p>{assessment.explanation}</p>}
                <p>Dados não preenchidos permanecem desconhecidos e não são tratados como negativos.</p>
              </div>
              <div className="clinical-assistant__case-summary">
                <strong>Achados informados</strong>
                <p>Queixa principal: {primaryPresentation?.name ?? 'não informada'}</p>
                <p>Sintomas associados: {associatedPresentations.map(({ name }) => name).join(', ') || 'não informados; não interpretados como ausentes'}</p>
                <p>Consciência: {clinicalCase.consciousness === 'not_assessed' ? 'não avaliada' : clinicalCase.consciousness === 'unknown' ? 'desconhecida' : clinicalCase.consciousness === 'present' ? 'alteração informada' : 'alteração explicitamente ausente'}</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="clinical-assistant__step-content">
              <div className="clinical-assistant__section-heading">
                <FlaskConical size={20} aria-hidden="true" />
                <div><h2>Investigação complementar</h2><p>Exames e critérios precisam estar ligados a uma condição, população e fonte verificadas.</p></div>
              </div>
              <div className="clinical-assistant__result-card">
                <strong>{assessment.investigations.length > 0 ? 'Investigações relacionadas aos critérios' : 'Nenhuma investigação foi recomendada'}</strong>
                {assessment.investigations.length > 0
                  ? assessment.investigations.map((investigation) => (
                    <article className="clinical-assistant__knowledge-result" key={investigation.id}>
                      <p>{investigation.description}</p>
                      {investigation.applicabilityCriteria.map((criterion) => <p key={criterion}>{criterion}</p>)}
                      {investigation.limitations.map((limitation) => <p key={limitation}>Limitação: {limitation}</p>)}
                      {investigation.evidence.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.organization} — {source.title}, {source.section}</a>)}
                    </article>
                  ))
                  : <><p>Não há relações condição–investigação clinicamente revisadas disponíveis. Não serão sugeridos exames por associação de palavras.</p><Link to="/diretrizes">Consultar o catálogo de diretrizes</Link></>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="clinical-assistant__step-content">
              <div className="clinical-assistant__section-heading">
                <Pill size={20} aria-hidden="true" />
                <div><h2>Manejo e opções terapêuticas</h2><p>Não confundir registro regulatório de produto com indicação ou adequação individual.</p></div>
              </div>
              <div className="clinical-assistant__result-card">
                <strong>{assessment.treatmentOptions.length > 0 ? 'Manejo e opções terapêuticas documentadas' : 'Nenhuma opção terapêutica foi vinculada'}</strong>
                {assessment.treatmentOptions.length > 0
                  ? assessment.treatmentOptions.map((option) => (
                    <article className="clinical-assistant__knowledge-result" key={option.id}>
                      <h3>{option.description}</h3>
                      <p>População: {option.population}</p>
                      {option.criteria.map((criterion) => <p key={criterion}>Critério: {criterion}</p>)}
                      {option.restrictions.map((restriction) => <p key={restriction}>Restrição: {restriction}</p>)}
                      {option.contraindications.map((contraindication) => <p key={contraindication}>Contraindicação: {contraindication}</p>)}
                      {option.medication && <p>Princípio ativo: {option.medication.dcb} · Situação regulatória: {option.medication.regulatoryStatus}</p>}
                      {option.evidence.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.organization} — {source.title}, {source.section}</a>)}
                    </article>
                  ))
                  : <><p>Não há opções terapêuticas clinicamente revisadas e vinculadas. O catálogo Anvisa é regulatório e não valida indicação individual. Não são apresentados medicamentos ou posologias individualizadas.</p><Link to="/medicamentos">Consultar o catálogo regulatório de medicamentos</Link></>}
              </div>
              <section className="clinical-assistant__sources" aria-labelledby="clinical-assistant-sources-heading">
                <h3 id="clinical-assistant-sources-heading">Documentos com fonte auditada</h3>
                <p>Referências consultadas para auditoria editorial. Não representam regras clínicas habilitadas nem recomendação para este caso.</p>
                {clinicalKnowledgeBase.sources.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                    <strong>{source.title}</strong>
                    <span>{source.organization} · {source.version} · acesso em {source.accessedAt}</span>
                    <small>Metadados e acesso verificados; conteúdo não revisado para uso automatizado.</small>
                  </a>
                ))}
              </section>
            </div>
          )}

          <div className="clinical-assistant__actions">
            <button type="button" className="clinical-assistant__secondary-button" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}><ArrowLeft size={16} aria-hidden="true" /> Voltar</button>
            {step < steps.length - 1
              ? <button type="button" className="clinical-assistant__primary-button" onClick={advance}>{step === 0 ? 'Registrar avaliação' : 'Continuar'} <ArrowRight size={16} aria-hidden="true" /></button>
              : <button type="button" className="clinical-assistant__primary-button" onClick={reset}><RotateCcw size={16} aria-hidden="true" /> Encerrar e descartar avaliação</button>}
          </div>
          {step === 0 && (!clinicalCase.primaryPresentationId || (clinicalCase.ageYears.trim() && (!Number.isInteger(Number(clinicalCase.ageYears)) || Number(clinicalCase.ageYears) < 0 || Number(clinicalCase.ageYears) > 120)) || (clinicalCase.weightKg.trim() && (!Number.isFinite(Number(clinicalCase.weightKg)) || Number(clinicalCase.weightKg) <= 0 || Number(clinicalCase.weightKg) > 500))) && (
            <p className="clinical-assistant__error" role="status">Selecione uma queixa principal e confira idade (0–120 anos) e peso (0–500 kg), se informados.</p>
          )}
        </section>

        <aside className="clinical-assistant__aside" aria-label="Status do conteúdo clínico">
          <span className="clinical-assistant__aside-icon"><Info size={18} aria-hidden="true" /></span>
          <strong>Estado da base clínica</strong>
          <dl>
            <div><dt>Regras no catálogo</dt><dd>{clinicalKnowledgeBase.rules.length}</dd></div>
            <div><dt>Fontes com acesso auditado</dt><dd>{clinicalKnowledgeBase.sources.filter(({ verificationStatus }) => verificationStatus === 'source_verified').length}</dd></div>
            <div><dt>Hipóteses estruturadas</dt><dd>{clinicalKnowledgeBase.hypotheses.length}</dd></div>
            <div><dt>Investigações estruturadas</dt><dd>{clinicalKnowledgeBase.investigations.length}</dd></div>
            <div><dt>Opções terapêuticas estruturadas</dt><dd>{clinicalKnowledgeBase.treatmentOptions.length}</dd></div>
          </dl>
          <p>Uma fonte consultada não equivale a uma regra validada. O catálogo de sintomas e os protocolos existentes não são usados para raciocínio automatizado sem aprovação editorial e clínica.</p>
        </aside>
      </div>
    </div>
  )
}
