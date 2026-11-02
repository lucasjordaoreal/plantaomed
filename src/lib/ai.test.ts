// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const identity = vi.hoisted(() => ({ refreshSession: vi.fn() }))
vi.mock('@netlify/identity', () => identity)

import { AiRequestError, requestAssistantReply } from './ai'

const result = {
  summary: 'Caso sintético para revisão.',
  answer: '',
  findings: {
    chiefComplaint: 'Dor torácica',
    associatedSymptoms: ['Dispneia'],
    evolution: 'Há uma hora.',
    reportedHistory: ['Hipertensão'],
    positiveFindings: ['Dor torácica', 'Dispneia'],
    explicitNegativeFindings: [],
    unknownInformation: ['Exames não informados'],
  },
  references: [],
  evidenceSummary: 'Nenhum documento recuperado.',
  limitations: ['Não constitui diagnóstico.'],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('clinical assistant API client', () => {
  it('refreshes an expired Netlify Identity session once before retrying', async () => {
    identity.refreshSession.mockResolvedValue('renewed-session')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Autenticação necessária.' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result, model: 'gemini-3.8-flash' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await requestAssistantReply({
      action: 'structure',
      description: '[PLANTAOMED SYNTHETIC CASE]\nCaso fictício com sintomas relatados.',
      syntheticOnly: true,
    })

    expect(response.model).toBe('gemini-3.8-flash')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(identity.refreshSession).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin')
  })

  it('returns a controlled error after an expired session cannot be refreshed', async () => {
    identity.refreshSession.mockResolvedValue(null)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Autenticação necessária.' }),
      { status: 401 },
    )))

    await expect(requestAssistantReply({
      action: 'structure',
      description: '[PLANTAOMED SYNTHETIC CASE]\nCaso fictício.',
      syntheticOnly: true,
    })).rejects.toMatchObject<Partial<AiRequestError>>({ status: 401 })
  })

  it('rejects invalid structured data and does not accept invented references', async () => {
    const invalid = { ...result, references: [{ id: 'invented' }] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      result: invalid,
      model: 'gemini-3.8-flash',
    }), { status: 200 })))

    await expect(requestAssistantReply({
      action: 'structure',
      description: '[PLANTAOMED SYNTHETIC CASE]\nCaso fictício.',
      syntheticOnly: true,
    })).rejects.toThrow('não passou pela validação')
  })

  it('rejects models outside the client-side allowlist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      result,
      model: 'gemini-unapproved',
    }), { status: 200 })))

    await expect(requestAssistantReply({
      action: 'structure',
      description: '[PLANTAOMED SYNTHETIC CASE]\nCaso fictício.',
      syntheticOnly: true,
    })).rejects.toThrow('não passou pela validação')
  })

  it('maps HTTP 429 into an explicit utilization error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Limite de utilização atingido.' }),
      { status: 429 },
    )))

    await expect(requestAssistantReply({
      action: 'structure',
      description: '[PLANTAOMED SYNTHETIC CASE]\nCaso fictício.',
      syntheticOnly: true,
    })).rejects.toMatchObject<Partial<AiRequestError>>({ status: 429 })
  })
})
