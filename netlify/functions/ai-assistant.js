import { GoogleGenAI } from '@google/genai'

const jsonResponse = (body, statusCode = 200) => new Response(JSON.stringify(body), {
  status: statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
})

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let payload = {}
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const { prompt, systemInstruction, model } = payload
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return jsonResponse({ error: 'Prompt obrigatório.' }, 400)
  }

  const apiKey = process.env.AI_PROVIDER_API_KEY
  if (!apiKey) {
    throw new Error('API de IA não configurada')
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const selectedModel = typeof model === 'string' && model.trim() ? model : process.env.AI_MODEL ?? 'gemini-3.8-flash'
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: typeof systemInstruction === 'string' && systemInstruction.trim()
        ? { systemInstruction }
        : undefined,
    })

    const answer = typeof response?.text === 'string' && response.text.length > 0
      ? response.text
      : 'Não foi possível gerar uma resposta da IA.'

    return jsonResponse({ answer, model: selectedModel })
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erro ao consultar a IA.',
    }, 500)
  }
}
