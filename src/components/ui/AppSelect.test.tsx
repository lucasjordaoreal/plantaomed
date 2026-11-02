// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AppSelect } from './AppSelect'

afterEach(cleanup)
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  class TestPointerEvent extends MouseEvent {
    pointerType: string
    pointerId: number

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerType = init.pointerType ?? 'mouse'
      this.pointerId = init.pointerId ?? 1
    }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent)
})

function openWithPointer(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
}

describe('AppSelect', () => {
  it('opens a portalled menu with separated popper positioning and preserves empty option values', async () => {
    let selected = 'yes'
    const onValueChange = (value: string) => { selected = value }
    render(
      <label>
        Resposta
        <AppSelect
          value={selected}
          onValueChange={onValueChange}
          options={[
            { value: '', label: 'Não informado' },
            { value: 'yes', label: 'Sim' },
            { value: 'no', label: 'Não' },
          ]}
        />
      </label>,
    )

    const trigger = screen.getByRole('combobox', { name: /Resposta/ })
    expect(trigger).toHaveTextContent('Sim')
    openWithPointer(trigger)
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sim' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('option', { name: 'Não informado' }))
    expect(selected).toBe('')
  })

  it('supports keyboard opening, option navigation and selection', async () => {
    let selected = ''
    render(
      <AppSelect
        aria-label="Categoria"
        value=""
        onValueChange={(value) => { selected = value }}
        options={[
          { value: 'one', label: 'Uma opção' },
          { value: 'two', label: 'Outra opção longa com texto acessível completo' },
          { value: 'three', label: 'Terceira opção' },
        ]}
      />,
    )
    const trigger = screen.getByRole('combobox', { name: 'Categoria' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' })
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    const firstOption = screen.getByRole('option', { name: 'Uma opção' })
    const secondOption = screen.getByRole('option', { name: 'Outra opção longa com texto acessível completo' })
    expect(secondOption).toBeInTheDocument()
    fireEvent.keyDown(firstOption, { key: 'ArrowDown', code: 'ArrowDown' })
    await waitFor(() => expect(document.activeElement).toBe(secondOption))
    fireEvent.keyDown(secondOption, { key: 'Enter', code: 'Enter' })
    expect(selected).toBe('two')
  })

  it('renders long labels fully in options and preserves the full selected label as a title', async () => {
    const longLabel = 'Insuficiência cardíaca com fração de ejeção reduzida'
    const onValueChange = () => {}
    render(
      <AppSelect
        aria-label="Diagnóstico"
        value="heart-failure"
        onValueChange={onValueChange}
        options={[{ value: 'heart-failure', label: longLabel }]}
      />,
    )
    const trigger = screen.getByRole('combobox', { name: 'Diagnóstico' })
    expect(trigger).toHaveAttribute('title', longLabel)
    openWithPointer(trigger)
    expect(await screen.findByRole('option', { name: longLabel })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    render(<AppSelect aria-label="Estado" value="open" onValueChange={() => {}} options={[{ value: 'open', label: 'Aberto' }]} />)
    const trigger = screen.getByRole('combobox', { name: 'Estado' })
    openWithPointer(trigger)
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
