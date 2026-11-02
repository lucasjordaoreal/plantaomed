// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import type { AuthCallback } from '@netlify/identity'

const identity = vi.hoisted(() => ({
  getUser: vi.fn(),
  handleAuthCallback: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  onAuthChange: vi.fn(),
  recoverPassword: vi.fn(),
  requestPasswordRecovery: vi.fn(),
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
      <output data-testid="recovery">{auth.recoveryToken ?? 'none'}</output>
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
  identity.getUser.mockResolvedValue(null)
  identity.handleAuthCallback.mockResolvedValue(null)
  identity.login.mockResolvedValue(authorizedUser)
  identity.logout.mockResolvedValue(undefined)
  identity.onAuthChange.mockReturnValue(vi.fn())
  identity.recoverPassword.mockResolvedValue(authorizedUser)
  identity.requestPasswordRecovery.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Netlify Identity session handling', () => {
  it('restores an existing session without gating other app routes', async () => {
    identity.getUser.mockResolvedValue(authorizedUser)
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('doctor@example.test'))
    expect(screen.getByTestId('status')).toHaveTextContent('ready')
    expect(identity.handleAuthCallback).toHaveBeenCalledOnce()
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
    identity.handleAuthCallback.mockResolvedValue({
      type: 'recovery',
      token: 'synthetic-recovery-token',
      user: null,
    })
    let authChange: AuthCallback | undefined
    identity.onAuthChange.mockImplementation((callback) => {
      authChange = callback
      return vi.fn()
    })
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('recovery')).toHaveTextContent('synthetic-recovery-token'))
    if (!authChange) throw new Error('Netlify Identity did not register the session callback.')
    act(() => authChange?.('token_refresh', authorizedUser))
    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('doctor@example.test'))
  })

  it('requires the server-managed clinical role and fails closed on identity initialization errors', async () => {
    expect(hasClinicalAssistantAccess(authorizedUser)).toBe(true)
    expect(hasClinicalAssistantAccess({ id: 'other', roles: ['authenticated'] })).toBe(false)
    identity.handleAuthCallback.mockRejectedValue(new Error('private identity response'))
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'))
    expect(screen.getByTestId('email')).toHaveTextContent('anonymous')
  })
})
