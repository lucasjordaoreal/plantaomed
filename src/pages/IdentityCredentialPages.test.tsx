// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'

const identity = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  getUser: vi.fn(),
  handleAuthCallback: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  onAuthChange: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@netlify/identity', () => identity)

import { IdentityAuthProvider } from '../auth/IdentityAuthContext'
import { InviteAcceptancePage, PasswordResetPage } from './IdentityCredentialPages'

const userWithoutClinicalPermission = {
  id: 'synthetic-invited-user',
  email: 'invited@example.test',
  roles: ['authenticated'],
}

function renderFlow(page: 'invite' | 'recovery') {
  return render(
    <MemoryRouter initialEntries={[page === 'invite' ? '/aceitar-convite' : '/redefinir-senha']}>
      <IdentityAuthProvider>
        {page === 'invite' ? <InviteAcceptancePage /> : <PasswordResetPage />}
      </IdentityAuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  identity.acceptInvite.mockResolvedValue(userWithoutClinicalPermission)
  identity.getUser.mockResolvedValue(null)
  identity.handleAuthCallback.mockResolvedValue(null)
  identity.login.mockResolvedValue(userWithoutClinicalPermission)
  identity.logout.mockResolvedValue(undefined)
  identity.onAuthChange.mockReturnValue(vi.fn())
  identity.requestPasswordRecovery.mockResolvedValue(undefined)
  identity.updateUser.mockResolvedValue(userWithoutClinicalPermission)
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  vi.clearAllMocks()
})

describe('Netlify Identity invitation and password reset pages', () => {
  it('accepts a valid invitation, validates matching passwords, and does not grant a clinical role', async () => {
    window.history.replaceState(null, '', '/#invite_token=invite-page-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'invite', user: null, token: 'invite-page-test-20261102' }
    })
    renderFlow('invite')

    await screen.findByRole('heading', { name: 'Defina sua senha' })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Strong-password-2026' } })
    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: 'Different-password-2026' } })
    expect(screen.getByText('As senhas ainda não coincidem.')).toBeInTheDocument()
    expect(identity.acceptInvite).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: 'Strong-password-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Ativar conta' }))

    expect(await screen.findByRole('heading', { name: 'Conta ativada' })).toBeInTheDocument()
    expect(identity.acceptInvite).toHaveBeenCalledWith('invite-page-test-20261102', 'Strong-password-2026')
    expect(sessionStorage.getItem('plantaomed:identity-invite')).toBeNull()
    expect(screen.getByText(/administradas separadamente/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar para a plataforma' })).toBeInTheDocument()
  })

  it.each([
    ['expired', new Error('expired invite token')],
    ['already used', new Error('invite already used')],
    ['network failure', new Error('network timeout')],
  ])('shows a safe recovery path when accepting an invitation fails (%s)', async (_kind, error) => {
    window.history.replaceState(null, '', '/#invite_token=single-use-invite-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'invite', user: null, token: 'single-use-invite-test-20261102' }
    })
    identity.acceptInvite.mockRejectedValue(error)
    renderFlow('invite')
    await screen.findByRole('heading', { name: 'Defina sua senha' })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Synthetic-password-2026' } })
    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: 'Synthetic-password-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ativar conta' }))

    expect(await screen.findByRole('heading', { name: 'Convite indisponível' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/Solicite um novo convite/)
    expect(screen.queryByText(/single-use-invite-test|expired invite token|network timeout/)).not.toBeInTheDocument()
  })

  it('does not show the reset form when a recovery callback fails', async () => {
    window.history.replaceState(null, '', '/#recovery_token=expired-recovery-test-20261102')
    identity.handleAuthCallback.mockRejectedValue(new Error('expired recovery token'))
    renderFlow('recovery')

    expect(await screen.findByRole('heading', { name: 'Link de recuperação indisponível' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/solicite uma nova recuperação/i)
    expect(screen.queryByText(/expired-recovery-test|expired recovery token/)).not.toBeInTheDocument()
  })

  it('does not show the reset form when Identity cannot restore the recovery session after reload', async () => {
    sessionStorage.setItem('plantaomed:identity-recovery', JSON.stringify({
      state: 'active',
      createdAt: Date.now(),
    }))
    identity.getUser.mockResolvedValue(null)
    renderFlow('recovery')

    expect(await screen.findByRole('heading', { name: 'Link de recuperação indisponível' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('plantaomed:identity-recovery')).toBeNull()
  })

  it('updates the password through the SDK only after a recovery session is established', async () => {
    window.history.replaceState(null, '', '/#recovery_token=valid-recovery-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'recovery', user: userWithoutClinicalPermission }
    })
    renderFlow('recovery')
    await screen.findByRole('heading', { name: 'Redefina sua senha' })

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'New-password-2026' } })
    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: 'New-password-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByRole('heading', { name: 'Senha redefinida' })).toBeInTheDocument()
    expect(identity.updateUser).toHaveBeenCalledWith({ password: 'New-password-2026' })
    expect(sessionStorage.getItem('plantaomed:identity-recovery')).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('keeps the recovery form available and reports a safe message if updateUser fails', async () => {
    window.history.replaceState(null, '', '/#recovery_token=update-failure-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'recovery', user: userWithoutClinicalPermission }
    })
    identity.updateUser.mockRejectedValue(new Error('private SDK details'))
    renderFlow('recovery')
    await screen.findByRole('heading', { name: 'Redefina sua senha' })
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'New-password-2026' } })
    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: 'New-password-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Solicite uma nova recuperação/)
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.queryByText(/private SDK details|update-failure-test/)).not.toBeInTheDocument()
  })

  it('restores a recovery form after reloading the same tab without storing its token', async () => {
    window.history.replaceState(null, '', '/#recovery_token=session-recovery-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'recovery', user: userWithoutClinicalPermission }
    })
    const firstRender = renderFlow('recovery')
    await screen.findByRole('heading', { name: 'Redefina sua senha' })
    expect(sessionStorage.getItem('plantaomed:identity-recovery')).toContain('"state":"active"')
    expect(sessionStorage.getItem('plantaomed:identity-recovery')).not.toContain('session-recovery-test')
    firstRender.unmount()

    identity.handleAuthCallback.mockClear()
    identity.getUser.mockResolvedValue(userWithoutClinicalPermission)
    renderFlow('recovery')
    expect(await screen.findByRole('heading', { name: 'Redefina sua senha' })).toBeInTheDocument()
    expect(identity.handleAuthCallback).not.toHaveBeenCalled()
  })

  it('clears passwords after success and supports keyboard form submission', async () => {
    window.history.replaceState(null, '', '/#invite_token=keyboard-invite-test-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'invite', user: null, token: 'keyboard-invite-test-20261102' }
    })
    renderFlow('invite')
    await screen.findByRole('heading', { name: 'Defina sua senha' })
    const password = screen.getByLabelText('Senha')
    const confirmation = screen.getByLabelText('Confirme a senha')
    fireEvent.change(password, { target: { value: 'Keyboard-password-2026' } })
    fireEvent.change(confirmation, { target: { value: 'Keyboard-password-2026' } })
    await act(async () => {
      fireEvent.submit(password.closest('form')!)
    })
    await waitFor(() => expect(identity.acceptInvite).toHaveBeenCalledOnce())
    expect(await screen.findByRole('heading', { name: 'Conta ativada' })).toBeInTheDocument()
  })
})
