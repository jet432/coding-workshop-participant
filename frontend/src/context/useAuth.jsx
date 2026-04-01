import { useContext } from 'react'

import AuthContext from './authContextObject.jsx'

/**
 * Consume the auth context.
 *
 * @returns {{user: any, isLoading: boolean, login: Function, logout: Function}}
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
