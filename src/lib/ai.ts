export type AiRequest = {
  prompt: string
  systemInstruction?: string
  model?: string
}

export async function requestAssistantReply(payload: AiRequest): Promise<string> {
  const response = await fetch('/.netlify/functions/ai-assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as { answer?: string; error?: string }

  if (!response.ok) {
    throw new Error(data.error ?? 'Não foi possível obter a resposta da IA.')
  }

  if (!data.answer) {
    throw new Error('A IA não retornou uma resposta válida.')
  }

  return data.answer
}
