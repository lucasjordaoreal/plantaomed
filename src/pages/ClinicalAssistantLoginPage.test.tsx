// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const identity = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  getUser: vi.fn(),
  handleAuthCallback: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  onAuthChange: vi.fn(),
  recoverPassword: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@netlify/identity', () => identity)

import { IdentityAuthProvider } from '../auth/IdentityAuthContext'
import { ClinicalAssistantLoginPage } from './ClinicalAssistantLoginPage'

const authorizedUser = { id: 'synthetic-doctor', email: 'doctor@example.test', roles: ['clinical-assistant'] }

function renderLogin(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state: { from: '/assistente-clinico' } }]}>
      <IdentityAuthProvider>
        <Routes>
          <Route path="/login" element={<ClinicalAssistantLoginPage />} />
          <Route path="/recuperar-senha" element={<ClinicalAssistantLoginPage />} />
          <Route path="/assistente-clinico" element={<h1>Assistente habilitado</h1>} />
        </Routes>
      </IdentityAuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  identity.getUser.mockResolvedValue(null)
  identity.handleAuthCallback.mockResolvedValue(null)
  identity.login.mockResolvedValue(authorizedUser)
  identity.logout.mockResolvedValue(undefined)
  identity.onAuthChange.mockReturnValue(vi.fn())
  identity.recoverPassword.mockResolvedValue(authorizedUser)
  identity.requestPasswordRecovery.mockResolvedValue(undefined)
  identity.acceptInvite.mockResolvedValue(authorizedUser)
  identity.updateUser.mockResolvedValue(authorizedUser)
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  vi.clearAllMocks()
})

describe('Clinical assistant Identity access page', () => {
  it('logs in through Netlify Identity and redirects to the protected route without public signup', async () => {
    renderLogin()
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'doctor@example.test' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'synthetic-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Assistente habilitado' })).toBeInTheDocument()
    expect(identity.login).toHaveBeenCalledWith('doctor@example.test', 'synthetic-password')
    expect(screen.queryByRole('button', { name: /criar conta|cadastrar/i })).not.toBeInTheDocument()
  })

  it('does not grant access to an authenticated user without the clinical role', async () => {
    identity.login.mockResolvedValue({ id: 'synthetic-user', roles: ['authenticated'] })
    renderLogin()
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'user@example.test' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'synthetic-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Acesso não habilitado' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Assistente habilitado' })).not.toBeInTheDocument()
  })

  it('requests recovery without exposing whether the account exists', async () => {
    renderLogin()
    fireEvent.click(await screen.findByRole('button', { name: 'Esqueci minha senha' }))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'doctor@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Se houver uma conta associada')
    expect(identity.requestPasswordRecovery).toHaveBeenCalledWith('doctor@example.test')
  })

})
