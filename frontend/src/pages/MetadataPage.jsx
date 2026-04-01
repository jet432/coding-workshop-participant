import { AddRounded, DeleteRounded, EditRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useDeferredValue, useEffect, useEffectEvent, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EntityDialog from '../components/EntityDialog.jsx'
import LoadingState from '../components/LoadingState.jsx'
import SectionCard from '../components/SectionCard.jsx'
import { apiClient, toQueryString } from '../services/apiClient.js'

const EMPTY_FORM = {
  scope: 'team',
  entityId: '',
  key: '',
  value: '',
  month: '',
}

/**
 * Validate metadata values.
 *
 * @param {Record<string, string>} values
 * @returns {Record<string, string>}
 */
function validateMetadata(values) {
  const errors = {}

  if (!values.scope) errors.scope = 'Scope is required.'
  if (!values.entityId) errors.entityId = 'Entity id is required.'
  if (!values.key.trim()) errors.key = 'Key is required.'
  if (!values.value.trim()) errors.value = 'Value is required.'
  if (values.month && !/^\d{4}-\d{2}$/.test(values.month)) {
    errors.month = 'Use YYYY-MM format when a month is supplied.'
  }

  return errors
}

/**
 * Render the metadata page.
 *
 * @returns {JSX.Element}
 */
function MetadataPage() {
  const [metadata, setMetadata] = useState([])
  const [employees, setEmployees] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [editingMetadata, setEditingMetadata] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pendingDelete, setPendingDelete] = useState(null)

  /**
   * Load metadata and entity options.
   *
   * @returns {Promise<void>}
   */
  const loadData = useEffectEvent(async () => {
    setLoading(true)

    try {
      const [metadataResponse, employeeResponse, teamResponse] = await Promise.all([
        apiClient.get(
          'metadata',
          toQueryString({
            q: deferredSearch,
            scope: scopeFilter,
          }),
        ),
        apiClient.get('employees'),
        apiClient.get('teams'),
      ])

      setMetadata(metadataResponse.items || [])
      setEmployees(employeeResponse.items || [])
      setTeams(teamResponse.items || [])
      setError('')
    } catch (apiError) {
      setError(apiError.message || 'Could not load metadata.')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    loadData()
    // `loadData` is a useEffectEvent callback and should not be a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch, scopeFilter])

  const entityOptions =
    form.scope === 'employee'
      ? employees.map((employee) => ({
          value: employee.id,
          label: `${employee.firstName} ${employee.lastName}`,
        }))
      : teams.map((team) => ({
          value: team.id,
          label: team.name,
        }))

  /**
   * Open the create dialog.
   *
   * @returns {void}
   */
  function openCreateDialog() {
    setEditingMetadata(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Open the edit dialog.
   *
   * @param {any} metadataItem
   * @returns {void}
   */
  function openEditDialog(metadataItem) {
    setEditingMetadata(metadataItem)
    setForm({
      scope: metadataItem.scope || 'team',
      entityId: metadataItem.entityId || '',
      key: metadataItem.key || '',
      value: metadataItem.value || '',
      month: metadataItem.month || '',
    })
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Persist the current metadata form.
   *
   * @returns {Promise<void>}
   */
  async function submitMetadata() {
    const nextFieldErrors = validateMetadata(form)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setDialogError('')

    try {
      if (editingMetadata) {
        await apiClient.put('metadata', `/${editingMetadata.id}`, form)
      } else {
        await apiClient.post('metadata', '', form)
      }

      setDialogOpen(false)
      await loadData()
    } catch (apiError) {
      setDialogError(apiError.message || 'Could not save the metadata.')
    }
  }

  /**
   * Delete a metadata record.
   *
   * @returns {Promise<void>}
   */
  async function deleteMetadata() {
    if (!pendingDelete) {
      return
    }

    try {
      await apiClient.delete('metadata', `/${pendingDelete.id}`)
      setPendingDelete(null)
      await loadData()
    } catch (apiError) {
      setError(apiError.message || 'Could not delete the metadata.')
      setPendingDelete(null)
    }
  }

  const fields = [
    {
      name: 'scope',
      label: 'Scope',
      type: 'select',
      options: [
        { value: 'team', label: 'Team' },
        { value: 'employee', label: 'Employee' },
      ],
    },
    {
      name: 'entityId',
      label: form.scope === 'employee' ? 'Employee' : 'Team',
      type: 'select',
      options: entityOptions,
    },
    { name: 'key', label: 'Key' },
    { name: 'value', label: 'Value' },
    { name: 'month', label: 'Month (optional YYYY-MM)' },
  ]

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Metadata"
        subtitle="Track employee and team-specific extra attributes without changing the core schema."
        actions={
          <Button onClick={openCreateDialog} startIcon={<AddRounded />} variant="contained">
            New metadata
          </Button>
        }
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            label="Search metadata"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <TextField
            fullWidth
            label="Scope filter"
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value)}
          />
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <LoadingState message="Loading metadata records..." />
        ) : metadata.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No metadata matches the current filters.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Scope</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Key</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metadata.map((metadataItem) => (
                  <TableRow hover key={metadataItem.id}>
                    <TableCell>{metadataItem.scope}</TableCell>
                    <TableCell>{metadataItem.entityId}</TableCell>
                    <TableCell>{metadataItem.key}</TableCell>
                    <TableCell>{metadataItem.value}</TableCell>
                    <TableCell>{metadataItem.month || 'Always-on'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button onClick={() => openEditDialog(metadataItem)} startIcon={<EditRounded />}>
                          Edit
                        </Button>
                        <Button
                          color="error"
                          onClick={() => setPendingDelete(metadataItem)}
                          startIcon={<DeleteRounded />}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      <EntityDialog
        error={dialogError}
        fieldErrors={fieldErrors}
        fields={fields}
        onChange={(fieldName, value) => setForm((current) => ({ ...current, [fieldName]: value }))}
        onClose={() => setDialogOpen(false)}
        onSubmit={submitMetadata}
        open={dialogOpen}
        submitLabel={editingMetadata ? 'Save metadata' : 'Create metadata'}
        title={editingMetadata ? 'Edit metadata' : 'Create metadata'}
        values={form}
      />

      <ConfirmDialog
        description={pendingDelete ? `Delete metadata key "${pendingDelete.key}"? This is permanent.` : ''}
        onClose={() => setPendingDelete(null)}
        onConfirm={deleteMetadata}
        open={Boolean(pendingDelete)}
        title="Delete metadata"
      />
    </Stack>
  )
}

export default MetadataPage
