import { refreshSession } from '@netlify/identity'

const allowedModels = new Set(['gemini-3.8-flash'])

export type ClinicalQuestionType = 'clarify' | 'criteria' | 'references' | 'recovered_content'

export type AiFindingExtraction = {
  chiefComplaint: string
  associatedSymptoms: string[]
  evolution: string
  reportedHistory: string[]
  positiveFindings: string[]
  explicitNegativeFindings: string[]
  unknownInformation: string[]
}

export type AiReference = {
  id: string
  title: string
  url: string
  section: string
  version: string
}

export type AiAssistantResult = {
  summary: string
  answer: string
  findings: AiFindingExtraction
  references: AiReference[]
  evidenceSummary: string
  limitations: string[]
}

export type AiRequest =
  | { action: 'structure'; description: string; syntheticOnly: true }
  | {
    action: 'contextual'
    description: string
    question: string
    questionType: ClinicalQuestionType
    syntheticOnly: true
  }

export class AiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AiRequestError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

function isStringArray(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => isString(item, maxLength))
}

function validateFindings(value: unknown): value is AiFindingExtraction {
  if (!isRecord(value)) return false
  const findingKeys = [
    'chiefComplaint',
    'associatedSymptoms',
    'evolution',
    'reportedHistory',
    'positiveFindings',
    'explicitNegativeFindings',
    'unknownInformation',
  ]
  if (Object.keys(value).some((key) => !findingKeys.includes(key))) return false
  if (!isString(value.chiefComplaint, 300)
    || !isStringArray(value.associatedSymptoms, 20, 200)
    || !isString(value.evolution, 500)
    || !isStringArray(value.reportedHistory, 20, 200)
    || !isStringArray(value.positiveFindings, 30, 200)
    || !isStringArray(value.explicitNegativeFindings, 30, 200)
    || !isStringArray(value.unknownInformation, 30, 200)) return false

  const normalize = (item: string) => item.trim().toLocaleLowerCase('pt-BR')
  const positive = new Set(value.positiveFindings.map(normalize))
  const negatives = value.explicitNegativeFindings.map(normalize)
  return !negatives.some((item) => positive.has(item))
    && !value.unknownInformation.map(normalize).some((item) => positive.has(item) || negatives.includes(item))
}

function validateResult(value: unknown): value is AiAssistantResult {
  if (!isRecord(value)) return false
  const topLevelKeys = ['summary', 'answer', 'findings', 'references', 'evidenceSummary', 'limitations']
  if (Object.keys(value).some((key) => !topLevelKeys.includes(key))) return false
  if (!isString(value.summary, 800) || !isString(value.answer, 1_200)) return false
  if (!isString(value.evidenceSummary, 800) || !isStringArray(value.limitations, 10, 300)) return false
  if (!Array.isArray(value.references) || value.references.length !== 0 || !validateFindings(value.findings)) return false
  return true
}

export async function requestAssistantReply(
  payload: AiRequest,
  options: { signal?: AbortSignal } = {},
): Promise<{ result: AiAssistantResult; model: string }> {
  const request = () => fetch('/.netlify/functions/ai-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
    signal: options.signal,
  })

  let response = await request()
  if (response.status === 401 && !options.signal?.aborted) {
    await refreshSession()
    response = await request()
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new AiRequestError('Não foi possível interpretar a resposta do Assistente Clínico.', response.status)
  }

  if (!response.ok) {
    const message = isRecord(data) && isString(data.error, 240)
      ? data.error
      : 'Não foi possível obter uma resposta do Assistente Clínico.'
    throw new AiRequestError(message, response.status)
  }

  if (!isRecord(data) || !validateResult(data.result) || !isString(data.model, 80) || !allowedModels.has(data.model)) {
    throw new AiRequestError('A resposta do Assistente Clínico não passou pela validação.', response.status)
  }

  return { result: data.result, model: data.model }
}
