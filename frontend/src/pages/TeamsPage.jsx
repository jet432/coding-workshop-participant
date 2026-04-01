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
  name: '',
  description: '',
  region: '',
  leaderEmployeeId: '',
  memberEmployeeIds: [],
}

const REGION_OPTIONS = [
  { value: 'NAM', label: 'NAM' },
  { value: 'LATAM', label: 'LATAM' },
  { value: 'APAC', label: 'APAC' },
  { value: 'EU', label: 'EU' },
]

/**
 * Validate team form values.
 *
 * @param {Record<string, any>} values
 * @returns {Record<string, string>}
 */
function validateTeam(values) {
  const errors = {}
  const validRegions = new Set(REGION_OPTIONS.map((option) => option.value))

  if (!values.name.trim()) errors.name = 'Team name is required.'
  if (!values.region) {
    errors.region = 'Region is required.'
  } else if (!validRegions.has(values.region)) {
    errors.region = 'Use one of: NAM, LATAM, APAC, EU.'
  }
  if (!values.leaderEmployeeId) errors.leaderEmployeeId = 'Select a team leader.'
  if ((values.memberEmployeeIds || []).includes(values.leaderEmployeeId)) {
    errors.memberEmployeeIds = 'The leader cannot also be listed as a regular member.'
  }
  if ((values.memberEmployeeIds || []).length > 5) {
    errors.memberEmployeeIds = 'A team can have at most 5 non-leader employees.'
  }

  return errors
}

/**
 * Render the teams page.
 *
 * @returns {JSX.Element}
 */
function TeamsPage() {
  const [teams, setTeams] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [editingTeam, setEditingTeam] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pendingDelete, setPendingDelete] = useState(null)

  /**
   * Load team and employee records.
   *
   * @returns {Promise<void>}
   */
  const loadData = useEffectEvent(async () => {
    setLoading(true)

    try {
      const [teamResponse, employeeResponse] = await Promise.all([
        apiClient.get(
          'teams',
          toQueryString({
            q: deferredSearch,
            region: regionFilter,
          }),
        ),
        apiClient.get('employees'),
      ])

      setTeams(teamResponse.items || [])
      setEmployees(employeeResponse.items || [])
      setError('')
    } catch (apiError) {
      setError(apiError.message || 'Could not load team data.')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    loadData()
    // `loadData` is a useEffectEvent callback and should not be a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch, regionFilter])

  const employeeOptions = employees.map((employee) => ({
    value: employee.id,
    label: `${employee.firstName} ${employee.lastName}`,
  }))
  const currentMemberIds = new Set(form.memberEmployeeIds || [])
  const memberOptions = employees
    .filter((employee) => {
      if (employee.id === form.leaderEmployeeId) {
        return false
      }

      const leaderTeamIds = employee.leaderTeamIds || []
      const canStayOnCurrentTeam =
        Boolean(editingTeam) && leaderTeamIds.every((teamId) => teamId === editingTeam.id)

      if (leaderTeamIds.length === 0 || canStayOnCurrentTeam) {
        return true
      }

      // Keep previously saved selections visible so invalid legacy data can be removed cleanly.
      return currentMemberIds.has(employee.id)
    })
    .map((employee) => {
      const leaderTeamIds = employee.leaderTeamIds || []
      const hasCrossTeamLeadership =
        leaderTeamIds.length > 0 &&
        (!editingTeam || leaderTeamIds.some((teamId) => teamId !== editingTeam.id))

      return {
        value: employee.id,
        label: `${employee.firstName} ${employee.lastName}${
          hasCrossTeamLeadership ? ' (currently leads another team)' : ''
        }`,
      }
    })

  /**
   * Open the create dialog.
   *
   * @returns {void}
   */
  function openCreateDialog() {
    setEditingTeam(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Open the edit dialog.
   *
   * @param {any} team
   * @returns {void}
   */
  function openEditDialog(team) {
    setEditingTeam(team)
    setForm({
      name: team.name || '',
      description: team.description || '',
      region: team.region || '',
      leaderEmployeeId: team.leaderEmployeeId || '',
      memberEmployeeIds: team.members.map((member) => member.employeeId),
    })
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Save the current team form.
   *
   * @returns {Promise<void>}
   */
  async function submitTeam() {
    const nextFieldErrors = validateTeam(form)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setDialogError('')

    try {
      if (editingTeam) {
        await apiClient.put('teams', `/${editingTeam.id}`, form)
      } else {
        await apiClient.post('teams', '', form)
      }

      setDialogOpen(false)
      await loadData()
    } catch (apiError) {
      setDialogError(apiError.message || 'Could not save the team.')
    }
  }

  /**
   * Delete a team.
   *
   * @returns {Promise<void>}
   */
  async function deleteTeam() {
    if (!pendingDelete) {
      return
    }

    try {
      await apiClient.delete('teams', `/${pendingDelete.id}`)
      setPendingDelete(null)
      await loadData()
    } catch (apiError) {
      setError(apiError.message || 'Could not delete the team.')
      setPendingDelete(null)
    }
  }

  const fields = [
    { name: 'name', label: 'Team name' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'region', label: 'Region', type: 'select', options: REGION_OPTIONS },
    {
      name: 'leaderEmployeeId',
      label: 'Leader',
      type: 'select',
      options: employeeOptions,
    },
    {
      name: 'memberEmployeeIds',
      label: 'Members',
      type: 'multiselect',
      helperText: 'Pick up to 5 non-leader employees. Team leaders on other teams are excluded.',
      options: memberOptions,
    },
  ]

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Teams"
        subtitle="Keep leader assignment and member swaps in one place."
        actions={
          <Button onClick={openCreateDialog} startIcon={<AddRounded />} variant="contained">
            New team
          </Button>
        }
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            label="Search teams"
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
          <LoadingState message="Loading team rosters..." />
        ) : teams.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No teams match the current filters.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell>Leader</TableCell>
                  <TableCell>Members</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((team) => (
                  <TableRow hover key={team.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{team.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {team.region}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {team.leader?.firstName} {team.leader?.lastName}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip label={`${team.memberCount} members`} size="small" />
                        {team.members.slice(0, 3).map((member) => (
                          <Chip
                            key={member.id}
                            label={`${member.employee?.firstName} ${member.employee?.lastName}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {team.members.length > 3 && (
                          <Chip label={`+${team.members.length - 3} more`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button onClick={() => openEditDialog(team)} startIcon={<EditRounded />}>
                          Edit
                        </Button>
                        <Button
                          color="error"
                          onClick={() => setPendingDelete(team)}
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
        onSubmit={submitTeam}
        open={dialogOpen}
        submitLabel={editingTeam ? 'Save team' : 'Create team'}
        title={editingTeam ? 'Edit team' : 'Create team'}
        values={form}
      />

      <ConfirmDialog
        description={
          pendingDelete
            ? `Delete ${pendingDelete.name}? This permanently removes team memberships, achievements, and team metadata.`
            : ''
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={deleteTeam}
        open={Boolean(pendingDelete)}
        title="Delete team"
      />
    </Stack>
  )
}

export default TeamsPage
