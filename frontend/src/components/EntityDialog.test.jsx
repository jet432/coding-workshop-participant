import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import EntityDialog from './EntityDialog.jsx'

const baseProps = {
  open: true,
  title: 'Test dialog',
  values: {},
  fieldErrors: {},
  error: '',
  onChange: vi.fn(),
  onClose: vi.fn(),
  onSubmit: vi.fn(),
}

describe('EntityDialog', () => {
  it('does not render helper text for select fields without help text', () => {
    const { container } = render(
      <EntityDialog
        {...baseProps}
        fields={[{ name: 'region', label: 'Region', type: 'select', options: [{ value: 'NAM', label: 'NAM' }] }]}
        values={{ region: '' }}
      />,
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(container.querySelector('.MuiFormHelperText-root')).toBeNull()
  })

  it('still renders helper text for select fields when one is provided', () => {
    render(
      <EntityDialog
        {...baseProps}
        fields={[
          {
            name: 'members',
            label: 'Members',
            type: 'multiselect',
            helperText: 'Pick up to 5 people.',
            options: [{ value: 'emp-001', label: 'Lara Chen' }],
          },
        ]}
        values={{ members: [] }}
      />,
    )

    expect(screen.getByText('Pick up to 5 people.')).toBeInTheDocument()
  })

  it('does not reserve an empty helper row for plain text fields', () => {
    const { container } = render(
      <EntityDialog
        {...baseProps}
        fields={[{ name: 'title', label: 'Title' }]}
        values={{ title: '' }}
      />,
    )

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(container.querySelector('.MuiFormHelperText-root')).toBeNull()
  })
})
