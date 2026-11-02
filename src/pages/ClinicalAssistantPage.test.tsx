// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { ClinicalAssistantPage } from './ClinicalAssistantPage'

function renderAssistant() {
  return render(
    <MemoryRouter initialEntries={['/assistente-clinico']}>
      <ClinicalAssistantPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('ClinicalAssistantPage', () => {
  it('collects symptoms without treating unselected findings as absent', () => {
    renderAssistant()

    fireEvent.change(screen.getByRole('combobox', { name: 'Queixa principal' }), { target: { value: 'dor-toracica' } })
    fireEvent.change(screen.getByLabelText('Adicionar manifestação'), { target: { value: 'dispneia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(within(screen.getByRole('list', { name: 'Sintomas associados informados' })).getByText('Dispneia')).toBeInTheDocument()
    expect(screen.getByText('Termos não selecionados são desconhecidos, não achados negativos.')).toBeInTheDocument()
  })

  it('validates recorded values and reports no reviewed clinical rules', () => {
    renderAssistant()
    fireEvent.change(screen.getByRole('combobox', { name: 'Queixa principal' }), { target: { value: 'dor-toracica' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar avaliação' }))

    const pulseStatus = screen.getByRole('combobox', { name: 'Frequência cardíaca: estado da informação' })
    expect(pulseStatus).toHaveValue('not_assessed')
    fireEvent.change(pulseStatus, { target: { value: 'value' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(/Informe um valor numérico/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Frequência cardíaca em bpm' }), { target: { value: '82' } })
    expect(screen.getByText('Nenhuma regra de gravidade foi aplicada')).toBeInTheDocument()
    expect(screen.getByText(/A ausência de alertas gerados por este protótipo não significa ausência de risco clínico/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Informação insuficiente para apresentar hipóteses')).toBeInTheDocument()
  })

  it('accepts structured exam and laboratory observations with explicit states and units', () => {
    renderAssistant()
    fireEvent.change(screen.getByRole('combobox', { name: 'Queixa principal' }), { target: { value: 'febre' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar avaliação' }))
    fireEvent.click(screen.getByText('Exame físico direcionado'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar registro' })[0])

    fireEvent.change(screen.getByLabelText('Achado / exame'), { target: { value: 'Sinal de teste' } })
    fireEvent.change(screen.getByLabelText('Estado da informação'), { target: { value: 'present' } })
    expect(screen.getByLabelText('Achado / exame')).toHaveValue('Sinal de teste')
    expect(screen.getByLabelText('Estado da informação')).toHaveValue('present')

    fireEvent.click(screen.getByText('Resultados laboratoriais'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar registro' })[1])
    fireEvent.change(screen.getAllByLabelText('Achado / exame')[1], { target: { value: 'Exame sintético' } })
    fireEvent.change(screen.getAllByLabelText('Estado da informação')[1], { target: { value: 'value' } })
    expect(screen.getByLabelText('Valor numérico')).toBeInTheDocument()
    expect(screen.getByLabelText('Unidade')).toBeInTheDocument()
  })

  it('does not store clinical case data and lets the user discard it', () => {
    localStorage.setItem('test:existing-setting', 'preserve')
    renderAssistant()
    fireEvent.change(screen.getByRole('combobox', { name: 'Queixa principal' }), { target: { value: 'febre' } })
    fireEvent.change(screen.getByLabelText('Idade em anos (opcional; 0 a 120)'), { target: { value: '45' } })

    expect(localStorage.getItem('test:existing-setting')).toBe('preserve')
    expect(localStorage.length).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Registrar avaliação' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: /Encerrar e descartar avaliação/ }))

    expect(screen.getByRole('combobox', { name: 'Queixa principal' })).toHaveValue('')
    expect(localStorage.getItem('test:existing-setting')).toBe('preserve')
    expect(localStorage.length).toBe(1)
  })

  it('keeps the authorized clinical workspace available in production builds', () => {
    vi.stubEnv('DEV', false)
    renderAssistant()
    expect(screen.getByRole('heading', { name: 'Assistente Clínico' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Queixa principal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição clínica')).toBeInTheDocument()
    expect(screen.getByText('Ferramenta de organização, não de decisão clínica')).toBeInTheDocument()
    expect(screen.getByText(/aceita somente casos clínicos/)).toBeInTheDocument()
  })

  it('structures a synthetic description, preserves unknown findings and allows correction', async () => {
    const result = {
      summary: 'Caso sintético para revisão.',
      answer: '',
      findings: {
        chiefComplaint: 'Dor torácica',
        associatedSymptoms: ['Dispneia', 'Sudorese'],
        evolution: 'Há aproximadamente uma hora.',
        reportedHistory: ['Hipertensão informada'],
        positiveFindings: ['Dor torácica', 'Dispneia', 'Sudorese'],
        explicitNegativeFindings: [],
        unknownInformation: ['Sinais vitais não informados', 'Exames não informados'],
      },
      references: [],
      evidenceSummary: 'Nenhum documento foi recuperado.',
      limitations: ['Não constitui diagnóstico.'],
    }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ result, model: 'gemini-3.8-flash' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderAssistant()

    fireEvent.change(screen.getByLabelText('Descrição clínica'), {
      target: { value: 'Caso: paciente adulto com dor torácica, dispneia e sudorese há uma hora. Antecedente de hipertensão.' },
    })
    fireEvent.click(screen.getByLabelText(/Confirmo que não me devo basear nas informações fornecidas/))
    fireEvent.click(screen.getByRole('button', { name: 'Analisar descrição' }))

    await waitFor(() => expect(screen.getByText('Resumo para conferência — não é diagnóstico')).toBeInTheDocument())
    expect(screen.getByLabelText('Informações desconhecidas / não informadas')).toHaveValue('Sinais vitais não informados\nExames não informados')
    expect(screen.getByText(/Nenhum trecho documental foi recuperado/)).toBeInTheDocument()
    expect(screen.getByText(/Solicitando informações adicionais/)).toBeInTheDocument()

    const confirmFindings = screen.getByLabelText(/Revisei e confirmei os achados acima/)
    fireEvent.click(confirmFindings)
    expect(confirmFindings).toBeChecked()
    fireEvent.change(screen.getByLabelText('Achados positivos informados'), { target: { value: 'Dor torácica\nDispneia corrigida' } })
    expect(confirmFindings).not.toBeChecked()
    expect(fetchMock).toHaveBeenCalledWith('/.netlify/functions/ai-assistant', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"syntheticOnly":true'),
    }))
  })

  it('shows a safe failure state when the function is unavailable', async () => {
    vi.stubEnv('DEV', false)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Assistente de IA indisponível neste ambiente.' }),
      { status: 503 },
    )))
    renderAssistant()
    fireEvent.change(screen.getByLabelText('Descrição clínica'), { target: { value: 'Caso clínico' } })
    fireEvent.click(screen.getByLabelText(/Confirmo que não me devo basear nas informações fornecidas/))
    fireEvent.click(screen.getByRole('button', { name: 'Analisar descrição' }))

    expect(await screen.findByText('Falha na consulta')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Assistente de IA indisponível neste ambiente.')
    expect(screen.getByRole('combobox', { name: 'Queixa principal' })).toBeInTheDocument()
  })
})
