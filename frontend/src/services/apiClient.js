const SERVICE_ENDPOINTS = {
  auth: 'auth',
  employees: 'individuals',
  teams: 'teams',
  achievements: 'achievements',
  metadata: 'metadata',
}

let sessionProvider = () => ({ accessToken: null, refreshToken: null })
let tokenUpdater = () => {}
let unauthorizedHandler = () => {}

/**
 * Register the authentication hooks used by the API client.
 *
 * @param {object} hooks
 * @param {Function} hooks.getSession
 * @param {Function} hooks.onTokens
 * @param {Function} hooks.onUnauthorized
 * @returns {void}
 */
export function configureApiClient({ getSession, onTokens, onUnauthorized }) {
  sessionProvider = getSession
  tokenUpdater = onTokens
  unauthorizedHandler = onUnauthorized
}

/**
 * Join a base URL with a path fragment.
 *
 * @param {string} baseUrl
 * @param {string} path
 * @returns {string}
 */
function joinUrl(baseUrl, path = '') {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  if (!path) {
    return normalizedBase
  }
  return `${normalizedBase}/${path.replace(/^\//, '')}`
}

/**
 * Parse the endpoint mapping injected by Terraform.
 *
 * @returns {Record<string, string>}
 */
function parseEndpointMap() {
  const rawValue = import.meta.env.VITE_API_ENDPOINTS

  if (!rawValue) {
    return {}
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return {}
  }
}

/**
 * Resolve the URL for a logical service name.
 *
 * @param {keyof SERVICE_ENDPOINTS} service
 * @param {string} path
 * @returns {string}
 */
function resolveServiceUrl(service, path = '') {
  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const endpointKey = SERVICE_ENDPOINTS[service]
  const endpointMap = parseEndpointMap()
  const endpointValue = endpointMap[endpointKey]

  if (!endpointValue) {
    return joinUrl(`${apiBaseUrl}/api/${endpointKey}`, path)
  }

  if (endpointValue.startsWith('http://') || endpointValue.startsWith('https://')) {
    if (apiBaseUrl.includes('localhost:3001') || apiBaseUrl.includes('127.0.0.1:3001')) {
      return joinUrl(`${apiBaseUrl}/api/${endpointKey}`, path)
    }
    return joinUrl(endpointValue, path)
  }

  if (endpointValue.startsWith('/')) {
    return joinUrl(`${apiBaseUrl}${endpointValue}`, path)
  }

  return joinUrl(`${apiBaseUrl}/api/${endpointKey}`, path)
}

/**
 * Convert query params into a query string.
 *
 * @param {Record<string, string | undefined | null>} params
 * @returns {string}
 */
export function toQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })

  const serialized = searchParams.toString()
  return serialized ? `?${serialized}` : ''
}

/**
 * Normalize an API error payload into a consistent frontend error shape.
 *
 * @param {Response} response
 * @param {any} payload
 * @returns {{status: number, code: string, message: string, details: any}}
 */
function normalizeError(response, payload) {
  if (payload?.error) {
    return {
      status: response.status,
      code: payload.error.code || 'request_failed',
      message: payload.error.message || 'Request failed.',
      details: payload.error.details ?? null,
    }
  }

  return {
    status: response.status,
    code: 'request_failed',
    message: 'Request failed.',
    details: payload ?? null,
  }
}

/**
 * Parse a fetch response body when present.
 *
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseResponseBody(response) {
  if (response.status === 204) {
    return null
  }

  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

/**
 * Refresh the current token set.
 *
 * @param {string} refreshToken
 * @returns {Promise<object>}
 */
async function refreshTokens(refreshToken) {
  const response = await fetch(resolveServiceUrl('auth', '/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw normalizeError(response, payload)
  }

  return payload
}

/**
 * Execute an authenticated API request.
 *
 * @param {keyof SERVICE_ENDPOINTS} service
 * @param {string} path
 * @param {RequestInit & {auth?: boolean}} options
 * @param {boolean} allowRefresh
 * @returns {Promise<any>}
 */
async function request(service, path = '', options = {}, allowRefresh = true) {
  const session = sessionProvider()
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.auth !== false && session.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  let response

  try {
    response = await fetch(resolveServiceUrl(service, path), {
      ...options,
      headers,
    })
  } catch (error) {
    throw {
      status: 0,
      code: 'network_error',
      message: error.message || 'Network request failed.',
      details: null,
    }
  }

  if (
    response.status === 401 &&
    allowRefresh &&
    options.auth !== false &&
    session.refreshToken &&
    service !== 'auth'
  ) {
    try {
      const refreshed = await refreshTokens(session.refreshToken)

      tokenUpdater({
        accessToken: refreshed.tokens.accessToken,
        refreshToken: refreshed.tokens.refreshToken,
      })

      return request(service, path, options, false)
    } catch (error) {
      unauthorizedHandler()
      throw error
    }
  }

  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw normalizeError(response, payload)
  }

  return payload
}

/**
 * Shared API client helpers.
 */
export const apiClient = {
  get(service, path = '') {
    return request(service, path, { method: 'GET' })
  },
  post(service, path = '', body = {}, options = {}) {
    return request(service, path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    })
  },
  put(service, path = '', body = {}) {
    return request(service, path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },
  delete(service, path = '') {
    return request(service, path, {
      method: 'DELETE',
    })
  },
}
