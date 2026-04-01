import { AddRounded, DeleteRounded, EditRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
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
  firstName: '',
  lastName: '',
  email: '',
  title: '',
  region: '',
}

const REGION_OPTIONS = [
  { value: 'NAM', label: 'NAM' },
  { value: 'LATAM', label: 'LATAM' },
  { value: 'APAC', label: 'APAC' },
  { value: 'EU', label: 'EU' },
]

/**
 * Validate employee form values.
 *
 * @param {Record<string, string>} values
 * @returns {Record<string, string>}
 */
function validateEmployee(values) {
  const errors = {}
  const validRegions = new Set(REGION_OPTIONS.map((option) => option.value))

  if (!values.firstName.trim()) errors.firstName = 'First name is required.'
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
    errors.email = 'Use a valid email address.'
  }
  if (!values.region) {
    errors.region = 'Region is required.'
  } else if (!validRegions.has(values.region)) {
    errors.region = 'Use one of: NAM, LATAM, APAC, EU.'
  }

  return errors
}

/**
 * Render the employees page.
 *
 * @returns {JSX.Element}
 */
function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  /**
   * Load the employee list.
   *
   * @returns {Promise<void>}
   */
  const loadEmployees = useEffectEvent(async () => {
    setLoading(true)

    try {
      const response = await apiClient.get(
        'employees',
        toQueryString({
          q: deferredSearch,
          region: regionFilter,
        }),
      )

      setEmployees(response.items || [])
      setError('')
    } catch (apiError) {
      setError(apiError.message || 'Could not load employees.')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    loadEmployees()
    // `loadEmployees` is a useEffectEvent callback and should not be a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch, regionFilter])

  /**
   * Open the create dialog.
   *
   * @returns {void}
   */
  function openCreateDialog() {
    setEditingEmployee(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Open the edit dialog.
   *
   * @param {any} employee
   * @returns {void}
   */
  function openEditDialog(employee) {
    setEditingEmployee(employee)
    setForm({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      title: employee.title || '',
      region: employee.region || '',
    })
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Persist the current employee form.
   *
   * @returns {Promise<void>}
   */
  async function submitEmployee() {
    const nextFieldErrors = validateEmployee(form)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setDialogError('')

    try {
      if (editingEmployee) {
        await apiClient.put('employees', `/${editingEmployee.id}`, form)
      } else {
        await apiClient.post('employees', '', form)
      }

      setDialogOpen(false)
      await loadEmployees()
    } catch (apiError) {
      setDialogError(apiError.message || 'Could not save the employee.')
    }
  }

  /**
   * Delete the selected employee.
   *
   * @returns {Promise<void>}
   */
  async function deleteEmployee() {
    if (!pendingDelete) {
      return
    }

    try {
      await apiClient.delete('employees', `/${pendingDelete.id}`)
      setPendingDelete(null)
      await loadEmployees()
    } catch (apiError) {
      setError(apiError.message || 'Could not delete the employee.')
      setPendingDelete(null)
    }
  }

  const fields = [
    { name: 'firstName', label: 'First name' },
    { name: 'lastName', label: 'Last name' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'title', label: 'Title' },
    { name: 'region', label: 'Region', type: 'select', options: REGION_OPTIONS },
  ]

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Employees"
        subtitle="Manage the people records that feed every team roster."
        actions={
          <Button onClick={openCreateDialog} startIcon={<AddRounded />} variant="contained">
            New employee
          </Button>
        }
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            label="Search employees"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <TextField
            fullWidth
            label="Filter by region"
            select
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
          >
            <MenuItem value="">All regions</MenuItem>
            {REGION_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <LoadingState message="Loading employee records..." />
        ) : employees.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No employees match the current filters.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell>Assignments</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {employee.firstName} {employee.lastName}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {employee.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{employee.title || 'Unassigned'}</TableCell>
                    <TableCell>{employee.region || 'Unknown'}</TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip label={`${employee.teamIds.length} team links`} size="small" />
                        {employee.leaderTeamIds.length > 0 && (
                          <Chip
                            color="secondary"
                            label={`Leader on ${employee.leaderTeamIds.length}`}
                            size="small"
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button onClick={() => openEditDialog(employee)} startIcon={<EditRounded />}>
                          Edit
                        </Button>
                        <Button
                          color="error"
                          onClick={() => setPendingDelete(employee)}
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
        busy={false}
        error={dialogError}
        fieldErrors={fieldErrors}
        fields={fields}
        onChange={(fieldName, value) => setForm((current) => ({ ...current, [fieldName]: value }))}
        onClose={() => setDialogOpen(false)}
        onSubmit={submitEmployee}
        open={dialogOpen}
        submitLabel={editingEmployee ? 'Save changes' : 'Create employee'}
        title={editingEmployee ? 'Edit employee' : 'Create employee'}
        values={form}
      />

      <ConfirmDialog
        description={
          pendingDelete
            ? `Delete ${pendingDelete.firstName} ${pendingDelete.lastName}? Team-leader records must be reassigned before this will succeed.`
            : ''
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={deleteEmployee}
        open={Boolean(pendingDelete)}
        title="Delete employee"
      />
    </Stack>
  )
}

export default EmployeesPage
