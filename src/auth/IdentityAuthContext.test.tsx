// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import type { AuthCallback } from '@netlify/identity'

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

import { IdentityAuthProvider } from './IdentityAuthContext'
import { hasClinicalAssistantAccess, useIdentityAuth } from './useIdentityAuth'

const authorizedUser = {
  id: 'synthetic-user',
  email: 'doctor@example.test',
  roles: ['clinical-assistant'],
}

function AuthProbe() {
  const auth = useIdentityAuth()
  return (
    <div>
      <output data-testid="status">{auth.status}</output>
      <output data-testid="email">{auth.user?.email ?? 'anonymous'}</output>
      <output data-testid="invite">{auth.inviteToken ? 'pending' : 'none'}</output>
      <output data-testid="recovery">{auth.recoverySessionActive ? 'active' : 'none'}</output>
      <output data-testid="callback-type">{auth.callbackType ?? 'none'}</output>
      <output data-testid="callback-error-type">{auth.callbackErrorType ?? 'none'}</output>
      <button type="button" onClick={() => void auth.login('doctor@example.test', 'synthetic-password')}>Login</button>
      <button type="button" onClick={() => void auth.logout()}>Logout</button>
    </div>
  )
}

function renderAuth() {
  return render(
    <MemoryRouter>
      <IdentityAuthProvider><AuthProbe /></IdentityAuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  identity.acceptInvite.mockResolvedValue(authorizedUser)
  identity.getUser.mockResolvedValue(null)
  identity.handleAuthCallback.mockResolvedValue(null)
  identity.login.mockResolvedValue(authorizedUser)
  identity.logout.mockResolvedValue(undefined)
  identity.onAuthChange.mockReturnValue(vi.fn())
  identity.recoverPassword.mockResolvedValue(authorizedUser)
  identity.requestPasswordRecovery.mockResolvedValue(undefined)
  identity.updateUser.mockResolvedValue(authorizedUser)
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  vi.clearAllMocks()
})

describe('Netlify Identity session handling', () => {
  it('restores an existing session without gating other app routes', async () => {
    identity.getUser.mockResolvedValue(authorizedUser)
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('doctor@example.test'))
    expect(screen.getByTestId('status')).toHaveTextContent('ready')
    expect(identity.handleAuthCallback).not.toHaveBeenCalled()
    expect(identity.getUser).toHaveBeenCalledOnce()
  })

  it('uses the official SDK for login and logout', async () => {
    renderAuth()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('doctor@example.test'))
    expect(identity.login).toHaveBeenCalledWith('doctor@example.test', 'synthetic-password')

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('anonymous'))
    expect(identity.logout).toHaveBeenCalledOnce()
  })

  it('captures Identity recovery callbacks and updates sessions from auth events', async () => {
    window.history.replaceState(null, '', '/#recovery_token=synthetic-recovery-callback-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'recovery', user: authorizedUser }
    })
    let authChange: AuthCallback | undefined
    identity.onAuthChange.mockImplementation((callback) => {
      authChange = callback
      return vi.fn()
    })
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('recovery')).toHaveTextContent('active'))
    if (!authChange) throw new Error('Netlify Identity did not register the session callback.')
    act(() => authChange?.('token_refresh', authorizedUser))
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('doctor@example.test'))
  })

  it.each([
    ['oauth', 'access_token=synthetic-oauth-callback-20261102'],
    ['confirmation', 'confirmation_token=synthetic-confirmation-callback-20261102'],
    ['email_change', 'email_change_token=synthetic-email-change-callback-20261102'],
  ] as const)('processes the %s callback globally', async (type, fragment) => {
    window.history.replaceState(null, '', `/#${fragment}`)
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type, user: authorizedUser }
    })
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('callback-type')).toHaveTextContent(type))
    expect(screen.getByTestId('email')).toHaveTextContent('doctor@example.test')
    expect(window.location.hash).toBe('')
    expect(identity.handleAuthCallback).toHaveBeenCalledOnce()
  })

  it('clears and safely reports provider errors in an OAuth callback fragment', async () => {
    window.history.replaceState(null, '', '/#error=access_denied&error_description=private-provider-detail')
    identity.handleAuthCallback.mockResolvedValue(null)
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('callback-error-type')).toHaveTextContent('oauth'))
    expect(window.location.hash).toBe('')
    expect(screen.queryByText(/private-provider-detail|access_denied/)).not.toBeInTheDocument()
  })

  it('captures invitation tokens only in session storage and restores the invitation after reload', async () => {
    window.history.replaceState(null, '', '/#invite_token=synthetic-invite-callback-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'invite', user: null, token: 'synthetic-invite-callback-20261102' }
    })
    const first = renderAuth()
    await waitFor(() => expect(screen.getByTestId('invite')).toHaveTextContent('pending'))
    expect(sessionStorage.getItem('plantaomed:identity-invite')).toContain('synthetic-invite-callback-20261102')
    expect(localStorage.length).toBe(0)
    first.unmount()

    identity.handleAuthCallback.mockClear()
    renderAuth()
    await waitFor(() => expect(screen.getByTestId('invite')).toHaveTextContent('pending'))
    expect(identity.handleAuthCallback).not.toHaveBeenCalled()
  })

  it('accepts a valid invitation through the official SDK and clears its transient token', async () => {
    window.history.replaceState(null, '', '/#invite_token=synthetic-invite-accept-20261102')
    identity.handleAuthCallback.mockImplementation(async () => {
      window.history.replaceState(null, '', '/')
      return { type: 'invite', user: null, token: 'synthetic-invite-accept-20261102' }
    })
    function InviteActions() {
      const auth = useIdentityAuth()
      return <button type="button" onClick={() => void auth.acceptInvitation('Synthetic-password-2026')}>Accept</button>
    }
    render(
      <MemoryRouter>
        <IdentityAuthProvider><><AuthProbe /><InviteActions /></></IdentityAuthProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('invite')).toHaveTextContent('pending'))
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(screen.getByTestId('invite')).toHaveTextContent('none'))
    expect(identity.acceptInvite).toHaveBeenCalledWith('synthetic-invite-accept-20261102', 'Synthetic-password-2026')
    expect(sessionStorage.getItem('plantaomed:identity-invite')).toBeNull()
  })

  it('runs a callback only once under StrictMode remounts', async () => {
    window.history.replaceState(null, '', '/#invite_token=strict-mode-invite-20261102')
    let resolveCallback: ((value: { type: 'invite'; user: null; token: string }) => void) | undefined
    identity.handleAuthCallback.mockImplementation(() => new Promise((resolve) => {
      resolveCallback = resolve
    }))
    const { StrictMode } = await import('react')
    render(
      <StrictMode>
        <MemoryRouter>
          <IdentityAuthProvider><AuthProbe /></IdentityAuthProvider>
        </MemoryRouter>
      </StrictMode>,
    )
    await waitFor(() => expect(identity.handleAuthCallback).toHaveBeenCalledOnce())
    if (!resolveCallback) throw new Error('Identity callback was not started.')
    window.history.replaceState(null, '', '/')
    await act(async () => resolveCallback?.({
      type: 'invite',
      user: null,
      token: 'strict-mode-invite-20261102',
    }))
    await waitFor(() => expect(screen.getByTestId('invite')).toHaveTextContent('pending'))
  })

  it('does not expose failed callback tokens and reports invalid or used links safely', async () => {
    window.history.replaceState(null, '', '/#invite_token=synthetic-invalid-invite-20261102')
    identity.handleAuthCallback.mockRejectedValue(new Error('private token detail'))
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(window.location.hash).toBe('')
    expect(screen.queryByText(/private token detail|synthetic-invalid-invite/)).not.toBeInTheDocument()
  })

  it('requires the server-managed clinical role and fails closed on identity initialization errors', async () => {
    expect(hasClinicalAssistantAccess(authorizedUser)).toBe(true)
    expect(hasClinicalAssistantAccess({ id: 'other', roles: ['authenticated'] })).toBe(false)
    identity.getUser.mockRejectedValue(new Error('private identity response'))
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'))
    expect(screen.getByTestId('email')).toHaveTextContent('anonymous')
    expect(identity.handleAuthCallback).not.toHaveBeenCalled()
  })
})
