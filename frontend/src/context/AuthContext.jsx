import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'

import { apiClient, configureApiClient } from '../services/apiClient.js'
import AuthContext from './authContextObject.jsx'
const SESSION_STORAGE_KEY = 'workshop-team-manager-session'

/**
 * Persist the current auth session.
 *
 * @param {object | null} session
 * @returns {void}
 */
function persistSession(session) {
  if (!session?.accessToken || !session?.refreshToken) {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user ?? null,
    }),
  )
}

/**
 * Provide auth state and auth actions to the app.
 *
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
  })

  useEffect(() => {
    configureApiClient({
      getSession: () => ({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      }),
      onTokens: (tokens) => {
        setSession((currentSession) => {
          const nextSession = {
            ...currentSession,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          }

          persistSession(nextSession)
          return nextSession
        })
      },
      onUnauthorized: () => {
        persistSession(null)
        setSession({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
        })
      },
    })
  }, [session.accessToken, session.refreshToken])

  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY)

    if (!storedSession) {
      setSession((currentSession) => ({
        ...currentSession,
        isLoading: false,
      }))
      return
    }

    const parsedSession = JSON.parse(storedSession)

    setSession({
      user: parsedSession.user,
      accessToken: parsedSession.accessToken,
      refreshToken: parsedSession.refreshToken,
      isLoading: true,
    })

    apiClient
      .get('auth', '/me')
      .then((response) => {
        const nextSession = {
          user: response.user,
          accessToken: parsedSession.accessToken,
          refreshToken: parsedSession.refreshToken,
          isLoading: false,
        }

        persistSession(nextSession)
        setSession(nextSession)
      })
      .catch(() => {
        persistSession(null)
        setSession({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
        })
      })
  }, [])

  /**
   * Log a user in and persist the token pair.
   *
   * @param {{email: string, password: string}} credentials
   * @returns {Promise<void>}
   */
  async function login(credentials) {
    const response = await apiClient.post('auth', '/login', credentials, { auth: false })
    const nextSession = {
      user: response.user,
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      isLoading: false,
    }

    persistSession(nextSession)
    setSession(nextSession)
  }

  /**
   * Clear the active session.
   *
   * @returns {void}
   */
  function logout() {
    persistSession(null)
    setSession({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        isLoading: session.isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
