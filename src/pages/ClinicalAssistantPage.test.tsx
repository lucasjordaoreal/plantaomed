// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('is unavailable outside development builds', () => {
    vi.stubEnv('DEV', false)
    renderAssistant()
    expect(screen.getByRole('heading', { name: 'Assistente Clínico' })).toBeInTheDocument()
    expect(screen.getByText('Recurso restrito ao ambiente de desenvolvimento')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Queixa principal' })).not.toBeInTheDocument()
  })
})
