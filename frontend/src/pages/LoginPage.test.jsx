import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import AuthContext from '../context/authContextObject.jsx'
import LoginPage from './LoginPage.jsx'

describe('LoginPage', () => {
  it('renders the seeded demo accounts and can populate the primary credentials', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: null,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Platform lead demo')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: /use credentials/i }))
    expect(screen.getByLabelText(/email/i)).toHaveValue('lara.chen@acme.test')
    expect(screen.getByLabelText(/password/i)).toHaveValue('Welcome123!')
    expect(screen.getByRole('button', { name: /enter workspace/i })).toBeInTheDocument()
  })
})
