import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './useAuth.jsx'

const apiClientGet = vi.fn()
const configureApiClient = vi.fn()

vi.mock('../services/apiClient.js', () => ({
  apiClient: {
    get: (...args) => apiClientGet(...args),
  },
  configureApiClient: (...args) => configureApiClient(...args),
}))

function AuthProbe() {
  const { isLoading, user } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user-email">{user?.email || ''}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    apiClientGet.mockReset()
    configureApiClient.mockReset()
  })

  it('restores a saved session using the stored access token on page refresh', async () => {
    localStorage.setItem(
      'workshop-team-manager-session',
      JSON.stringify({
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
        user: {
          id: 'user-001',
          email: 'lara.chen@acme.test',
          displayName: 'Lara Chen',
        },
      }),
    )

    apiClientGet.mockResolvedValue({
      user: {
        id: 'user-001',
        email: 'lara.chen@acme.test',
        displayName: 'Lara Chen',
      },
    })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(apiClientGet).toHaveBeenCalledWith('auth', '/me', {
        headers: {
          Authorization: 'Bearer stored-access-token',
        },
      }),
    )

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user-email')).toHaveTextContent('lara.chen@acme.test')
  })
})
