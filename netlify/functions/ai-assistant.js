import { createHash } from 'node:crypto'
import { ApiError, GoogleGenAI } from '@google/genai'
import { getUser, refreshSession } from '@netlify/identity'

export const config = {
  path: '/.netlify/functions/ai-assistant',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}

const MAX_BODY_BYTES = 12_000
const MAX_DESCRIPTION_LENGTH = 9_000
const MAX_QUESTION_LENGTH = 500
const REQUEST_TIMEOUT_MS = 12_000
const MAX_OUTPUT_TOKENS = 900
const ALLOWED_MODELS = new Set(['gemini-3.8-flash'])
const DOCUMENT_ACTIONS = new Set(['criteria', 'references', 'recovered_content'])
const SYNTHETIC_CASE_PREFIX = '[PLANTAOMED SYNTHETIC CASE]\n'

const responseJson = (body, statusCode = 200, headers = {}) => new Response(JSON.stringify(body), {
  status: statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
})

const unavailable = () => responseJson({ error: 'Assistente de IA indisponível neste ambiente.' }, 503)

const responseSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    answer: { type: 'STRING' },
    findings: {
      type: 'OBJECT',
      properties: {
        chiefComplaint: { type: 'STRING' },
        associatedSymptoms: { type: 'ARRAY', items: { type: 'STRING' } },
        evolution: { type: 'STRING' },
        reportedHistory: { type: 'ARRAY', items: { type: 'STRING' } },
        positiveFindings: { type: 'ARRAY', items: { type: 'STRING' } },
        explicitNegativeFindings: { type: 'ARRAY', items: { type: 'STRING' } },
        unknownInformation: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: [
        'chiefComplaint',
        'associatedSymptoms',
        'evolution',
        'reportedHistory',
        'positiveFindings',
        'explicitNegativeFindings',
        'unknownInformation',
      ],
      additionalProperties: false,
    },
    references: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          url: { type: 'STRING' },
          section: { type: 'STRING' },
          version: { type: 'STRING' },
        },
        required: ['id', 'title', 'url', 'section', 'version'],
        additionalProperties: false,
      },
    },
    evidenceSummary: { type: 'STRING' },
    limitations: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'answer', 'findings', 'references', 'evidenceSummary', 'limitations'],
  additionalProperties: false,
}

const systemInstruction = [
  'Você é um assistente de estruturação clínica para médicos, não um mecanismo de diagnóstico ou prescrição.',
  'Use somente fatos explicitamente presentes na descrição sintética. Não infira nem invente sintomas, sinais vitais, exames, antecedentes ou achados negativos.',
  'Separe achados positivos de negativos explicitamente mencionados. O que não foi informado deve permanecer em unknownInformation.',
  'Não apresente probabilidades, diagnóstico confirmado, conduta, medicamento ou posologia.',
  'Não invente citações. Não há trechos documentais recuperados nesta chamada; references deve ser [].',
  'Para perguntas de esclarecimento, explique apenas o termo ou texto perguntado e explicite limites clínicos.',
  'Escreva em português claro, de forma breve, e devolva somente JSON compatível com o schema.',
].join(' ')

const fields = {
  chiefComplaint: ['string', 300],
  associatedSymptoms: ['array', 20, 200],
  evolution: ['string', 500],
  reportedHistory: ['array', 20, 200],
  positiveFindings: ['array', 30, 200],
  explicitNegativeFindings: ['array', 30, 200],
  unknownInformation: ['array', 30, 200],
}

function isBoundedString(value, maxLength) {
  return typeof value === 'string' && value.length <= maxLength
}

function isStringArray(value, maxItems, maxLength) {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => isBoundedString(item, maxLength))
}

function validateModelResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const allowedTopLevel = ['summary', 'answer', 'findings', 'references', 'evidenceSummary', 'limitations']
  if (Object.keys(value).some((key) => !allowedTopLevel.includes(key))) return false
  if (!isBoundedString(value.summary, 800) || !isBoundedString(value.answer, 1_200)) return false
  if (!isBoundedString(value.evidenceSummary, 800) || !isStringArray(value.limitations, 10, 300)) return false
  if (!Array.isArray(value.references) || value.references.length !== 0) return false
  if (!value.findings || typeof value.findings !== 'object' || Array.isArray(value.findings)) return false
  if (Object.keys(value.findings).some((key) => !(key in fields))) return false
  const validFindings = Object.entries(fields).every(([key, [type, firstLimit, secondLimit]]) => {
    const field = value.findings[key]
    if (type === 'string') return isBoundedString(field, firstLimit)
    return isStringArray(field, firstLimit, secondLimit)
  })
  if (!validFindings) return false

  const normalize = (item) => item.trim().toLocaleLowerCase('pt-BR')
  const positive = new Set(value.findings.positiveFindings.map(normalize))
  const negatives = value.findings.explicitNegativeFindings.map(normalize)
  const unknown = value.findings.unknownInformation.map(normalize)
  return !negatives.some((item) => positive.has(item))
    && !unknown.some((item) => positive.has(item) || negatives.includes(item))
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null
  if (!request.body) return null

  const reader = request.body.getReader()
  const chunks = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  try {
    const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return null
  }
}

function validRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const allowedKeys = ['action', 'description', 'question', 'questionType', 'syntheticOnly']
  if (Object.keys(payload).some((key) => !allowedKeys.includes(key))) return false
  if (!['structure', 'contextual'].includes(payload.action) || payload.syntheticOnly !== true) return false
  if (!isBoundedString(payload.description, MAX_DESCRIPTION_LENGTH)
    || !payload.description.startsWith(SYNTHETIC_CASE_PREFIX)
    || !payload.description.slice(SYNTHETIC_CASE_PREFIX.length).trim()) return false
  if (payload.action === 'contextual') {
    if (!isBoundedString(payload.question, MAX_QUESTION_LENGTH) || !payload.question.trim()) return false
    if (!['clarify', 'criteria', 'references', 'recovered_content'].includes(payload.questionType)) return false
  }
  if (payload.action === 'structure' && (payload.question !== undefined || payload.questionType !== undefined)) return false

  const combined = `${payload.description} ${payload.question ?? ''}`
  const containsIdentifier = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/i.test(combined)
  return !containsIdentifier
}

async function enforceRateLimit({ baseUrl, token, userIdHash }) {
  const now = new Date()
  const minuteBucket = Math.floor(now.getTime() / 60_000)
  const dayBucket = now.toISOString().slice(0, 10)
  const script = [
    "local limits = {5, 20, 300}",
    'for i, limit in ipairs(limits) do',
    "  if tonumber(redis.call('GET', KEYS[i]) or '0') >= limit then return 0 end",
    'end',
    'for i, limit in ipairs(limits) do',
    "  local count = redis.call('INCR', KEYS[i])",
    "  if count == 1 then redis.call('EXPIRE', KEYS[i], ARGV[i]) end",
    'end',
    'return 1',
  ].join('\n')
  const keys = [
    `plantaomed:ai:user:${userIdHash}:minute:${minuteBucket}`,
    `plantaomed:ai:user:${userIdHash}:day:${dayBucket}`,
    `plantaomed:ai:global:day:${dayBucket}`,
  ]

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['EVAL', script, '3', ...keys, '120', '172800', '172800']]),
    signal: AbortSignal.timeout(2_000),
  })
  if (!response.ok) throw new Error('rate limit unavailable')
  const results = await response.json()
  return results?.[0]?.result === 1
}

function modelPrompt(payload) {
  const description = payload.description.slice(SYNTHETIC_CASE_PREFIX.length)
  if (payload.action === 'structure') {
    return `Estruture os fatos da descrição clínica sintética abaixo sem completar lacunas.\n\nDescrição:\n${description}`
  }

  if (DOCUMENT_ACTIONS.has(payload.questionType)) {
    return null
  }

  return `Esclareça apenas a dúvida textual abaixo usando a descrição sintética como contexto. Não diagnostique nem recomende conduta.\n\nDescrição:\n${description}\n\nDúvida:\n${payload.question}`
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return responseJson({ error: 'Método não permitido.' }, 405, { Allow: 'POST' })
  }

  const model = process.env.AI_MODEL
  const apiKey = process.env.AI_PROVIDER_API_KEY
  const rateLimitUrl = process.env.UPSTASH_REDIS_REST_URL
  const rateLimitToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (
    process.env.AI_ASSISTANT_ENABLED !== 'true'
    || process.env.AI_PROVIDER !== 'gemini'
    || !apiKey
    || !rateLimitUrl
    || !rateLimitToken
    || !model
    || !ALLOWED_MODELS.has(model)
  ) {
    return unavailable()
  }

  let user
  try {
    await refreshSession()
    user = await getUser()
  } catch {
    try {
      user = await getUser()
    } catch {
      return unavailable()
    }
    if (!user) return responseJson({ error: 'Autenticação necessária.' }, 401)
    return unavailable()
  }
  if (!user) return responseJson({ error: 'Autenticação necessária.' }, 401)
  if (!user.roles?.includes('clinical-assistant')) {
    return responseJson({ error: 'Acesso não habilitado para o Assistente Clínico.' }, 403)
  }
  const userIdHash = createHash('sha256').update(user.id).digest('hex')

  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return responseJson({ error: 'Formato de requisição inválido.' }, 415)
  }
  let payload
  try {
    payload = await readJsonBody(request)
  } catch {
    return responseJson({ error: 'Corpo da requisição inválido.' }, 400)
  }
  if (!validRequest(payload)) return responseJson({ error: 'Dados inválidos ou não sintéticos.' }, 400)
  if (payload.action === 'contextual' && DOCUMENT_ACTIONS.has(payload.questionType)) {
    return responseJson({ error: 'Consulta documental indisponível: os documentos ainda não foram extraídos e indexados.' }, 503)
  }

  try {
    const withinQuota = await enforceRateLimit({ baseUrl: rateLimitUrl, token: rateLimitToken, userIdHash })
    if (!withinQuota) {
      return responseJson({ error: 'Limite de utilização atingido. Tente novamente mais tarde.' }, 429, { 'Retry-After': '60' })
    }
  } catch {
    return unavailable()
  }

  const prompt = modelPrompt(payload)
  if (!prompt) return responseJson({ error: 'Consulta documental indisponível.' }, 503)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortRequest = () => controller.abort()
  if (request.signal.aborted) controller.abort()
  else request.signal.addEventListener('abort', abortRequest, { once: true })

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    })
    const modelResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.1,
        abortSignal: controller.signal,
      },
    })
    const answerText = modelResponse.text
    if (typeof answerText !== 'string') {
      return responseJson({ error: 'A resposta do provedor não pôde ser validada.' }, 502)
    }

    let result
    try {
      result = JSON.parse(answerText)
    } catch {
      return responseJson({ error: 'A resposta estruturada não pôde ser validada.' }, 502)
    }
    if (!validateModelResult(result)) {
      return responseJson({ error: 'A resposta estruturada não pôde ser validada.' }, 502)
    }

    return responseJson({ result, model })
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      return responseJson({ error: 'Limite do provedor de IA atingido. Tente novamente mais tarde.' }, 429, { 'Retry-After': '60' })
    }
    return responseJson(
      { error: controller.signal.aborted ? 'Consulta cancelada ou excedeu o tempo limite.' : 'Não foi possível concluir a consulta de IA.' },
      controller.signal.aborted ? 504 : 502,
    )
  } finally {
    clearTimeout(timeout)
    request.signal.removeEventListener('abort', abortRequest)
  }
}
