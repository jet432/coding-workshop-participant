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
  teamId: '',
  month: '',
  title: '',
  description: '',
  impact: '',
}

/**
 * Validate an achievement form.
 *
 * @param {Record<string, string>} values
 * @returns {Record<string, string>}
 */
function validateAchievement(values) {
  const errors = {}

  if (!values.teamId) errors.teamId = 'Select a team.'
  if (!values.month) {
    errors.month = 'Month is required.'
  } else if (!/^\d{4}-\d{2}$/.test(values.month)) {
    errors.month = 'Use YYYY-MM format.'
  }
  if (!values.title.trim()) errors.title = 'Title is required.'
  if (!values.description.trim()) errors.description = 'Description is required.'

  return errors
}

/**
 * Render the achievements page.
 *
 * @returns {JSX.Element}
 */
function AchievementsPage() {
  const [achievements, setAchievements] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [editingAchievement, setEditingAchievement] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pendingDelete, setPendingDelete] = useState(null)

  /**
   * Load achievements and team options.
   *
   * @returns {Promise<void>}
   */
  const loadData = useEffectEvent(async () => {
    setLoading(true)

    try {
      const [achievementResponse, teamResponse] = await Promise.all([
        apiClient.get(
          'achievements',
          toQueryString({
            q: deferredSearch,
            teamId: teamFilter,
            month: monthFilter,
          }),
        ),
        apiClient.get('teams'),
      ])

      setAchievements(achievementResponse.items || [])
      setTeams(teamResponse.items || [])
      setError('')
    } catch (apiError) {
      setError(apiError.message || 'Could not load achievements.')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    loadData()
    // `loadData` is a useEffectEvent callback and should not be a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch, monthFilter, teamFilter])

  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }))
  const teamNameById = Object.fromEntries(teams.map((team) => [team.id, team.name]))

  /**
   * Open the create dialog.
   *
   * @returns {void}
   */
  function openCreateDialog() {
    setEditingAchievement(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Open the edit dialog.
   *
   * @param {any} achievement
   * @returns {void}
   */
  function openEditDialog(achievement) {
    setEditingAchievement(achievement)
    setForm({
      teamId: achievement.teamId || '',
      month: achievement.month || '',
      title: achievement.title || '',
      description: achievement.description || '',
      impact: achievement.impact || '',
    })
    setFieldErrors({})
    setDialogError('')
    setDialogOpen(true)
  }

  /**
   * Save the achievement form.
   *
   * @returns {Promise<void>}
   */
  async function submitAchievement() {
    const nextFieldErrors = validateAchievement(form)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setDialogError('')

    try {
      if (editingAchievement) {
        await apiClient.put('achievements', `/${editingAchievement.id}`, form)
      } else {
        await apiClient.post('achievements', '', form)
      }

      setDialogOpen(false)
      await loadData()
    } catch (apiError) {
      setDialogError(apiError.message || 'Could not save the achievement.')
    }
  }

  /**
   * Delete the selected achievement.
   *
   * @returns {Promise<void>}
   */
  async function deleteAchievement() {
    if (!pendingDelete) {
      return
    }

    try {
      await apiClient.delete('achievements', `/${pendingDelete.id}`)
      setPendingDelete(null)
      await loadData()
    } catch (apiError) {
      setError(apiError.message || 'Could not delete the achievement.')
      setPendingDelete(null)
    }
  }

  const fields = [
    { name: 'teamId', label: 'Team', type: 'select', options: teamOptions },
    { name: 'month', label: 'Month (YYYY-MM)' },
    { name: 'title', label: 'Title' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'impact', label: 'Impact' },
  ]

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Achievements"
        subtitle="Track the monthly accomplishments attached to each team."
        actions={
          <Button onClick={openCreateDialog} startIcon={<AddRounded />} variant="contained">
            New achievement
          </Button>
        }
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            label="Search achievements"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <TextField
            fullWidth
            label="Month filter"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          />
          <TextField
            fullWidth
            label="Team id filter"
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
          />
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <LoadingState message="Loading achievement records..." />
        ) : achievements.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No achievements match the current filters.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Impact</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {achievements.map((achievement) => (
                  <TableRow hover key={achievement.id}>
                    <TableCell>{achievement.month}</TableCell>
                    <TableCell>{teamNameById[achievement.teamId] || achievement.teamId}</TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{achievement.title}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {achievement.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{achievement.impact || 'Not provided'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button onClick={() => openEditDialog(achievement)} startIcon={<EditRounded />}>
                          Edit
                        </Button>
                        <Button
                          color="error"
                          onClick={() => setPendingDelete(achievement)}
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
        onSubmit={submitAchievement}
        open={dialogOpen}
        submitLabel={editingAchievement ? 'Save achievement' : 'Create achievement'}
        title={editingAchievement ? 'Edit achievement' : 'Create achievement'}
        values={form}
      />

      <ConfirmDialog
        description={pendingDelete ? `Delete "${pendingDelete.title}"? This is a permanent hard delete.` : ''}
        onClose={() => setPendingDelete(null)}
        onConfirm={deleteAchievement}
        open={Boolean(pendingDelete)}
        title="Delete achievement"
      />
    </Stack>
  )
}

export default AchievementsPage
