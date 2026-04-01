import { describe, expect, it } from 'vitest'

import { toQueryString } from './apiClient.js'

describe('toQueryString', () => {
  it('serializes only populated query params', () => {
    expect(
      toQueryString({
        q: 'platform',
        month: '2026-03',
        empty: '',
        none: null,
      }),
    ).toBe('?q=platform&month=2026-03')
  })
})
