import {
  Alert,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import LoadingState from '../components/LoadingState.jsx'
import SectionCard from '../components/SectionCard.jsx'
import { apiClient } from '../services/apiClient.js'

/**
 * Render the dashboard page.
 *
 * @returns {JSX.Element}
 */
function DashboardPage() {
  const [state, setState] = useState({
    data: null,
    error: '',
    loading: true,
  })

  useEffect(() => {
    apiClient
      .get('teams', '/dashboard/summary')
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((apiError) => {
        setState({
          data: null,
          error: apiError.message || 'Could not load the dashboard.',
          loading: false,
        })
      })
  }, [])

  if (state.loading) {
    return <LoadingState message="Building the team dashboard..." />
  }

  if (!state.data) {
    return <Alert severity="error">{state.error}</Alert>
  }

  const overviewCards = [
    { label: 'Teams', value: state.data.overview.teamCount },
    { label: 'Employees', value: state.data.overview.employeeCount },
    { label: 'Assignments', value: state.data.overview.memberAssignmentCount },
    { label: 'Achievements', value: state.data.overview.achievementCount },
  ]
  const teamsByRegion = state.data.teamsByRegion || state.data.teamsByLocation || []

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Operations Dashboard"
        subtitle="Monitor team composition, regions, and monthly accomplishments."
      >
        <Grid container spacing={2}>
          {overviewCards.map((card) => (
            <Grid key={card.label} size={{ xs: 12, md: 6, lg: 3 }}>
              <Stack
                spacing={0.75}
                sx={{
                  borderRadius: 4,
                  bgcolor: 'rgba(29, 122, 112, 0.08)',
                  p: 2.25,
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  {card.label}
                </Typography>
                <Typography variant="h3">{card.value}</Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title="Teams By Region"
            subtitle="The in-scope dashboard still tracks which regions teams sit in."
          >
            <List disablePadding>
              {teamsByRegion.map((bucket) => (
                <ListItem divider disableGutters key={bucket.region}>
                  <ListItemText
                    primary={bucket.region}
                    secondary={`${bucket.teamCount} team${bucket.teamCount === 1 ? '' : 's'}`}
                  />
                </ListItem>
              ))}
            </List>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title="Team Rosters"
            subtitle="Every roster shows the leader plus the current member assignments."
          >
            <Stack spacing={2}>
              {state.data.teamRosters.map((team) => (
                <Stack
                  key={team.id}
                  spacing={1.25}
                  sx={{
                    border: '1px solid rgba(21, 37, 59, 0.08)',
                    borderRadius: 4,
                    p: 2,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                  >
                    <div>
                      <Typography variant="h6">{team.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {team.region} · Leader: {team.leader?.firstName} {team.leader?.lastName}
                      </Typography>
                    </div>
                    <Chip label={`${team.totalPeople} people`} color="primary" />
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                      color="secondary"
                      label={`Leader: ${team.leader?.firstName} ${team.leader?.lastName}`}
                    />
                    {team.members.map((member) => (
                      <Chip
                        key={member.id}
                        label={`${member.employee?.firstName} ${member.employee?.lastName}`}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard
        title="Monthly Achievements"
        subtitle="The remaining business question here is which accomplishments each team delivered every month."
      >
        <Grid container spacing={2}>
          {state.data.monthlyAchievementsByTeam.map((teamAchievements) => (
            <Grid key={teamAchievements.teamId} size={{ xs: 12, lg: 4 }}>
              <Stack
                spacing={1.25}
                sx={{
                  border: '1px solid rgba(21, 37, 59, 0.08)',
                  borderRadius: 4,
                  p: 2,
                  height: '100%',
                }}
              >
                <Typography variant="h6">{teamAchievements.teamName}</Typography>
                {teamAchievements.items.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No monthly achievements recorded yet.
                  </Typography>
                ) : (
                  teamAchievements.items.map((item) => (
                    <Stack key={item.id} spacing={0.35}>
                      <Typography variant="subtitle2">
                        {item.month} · {item.title}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {item.description}
                      </Typography>
                    </Stack>
                  ))
                )}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </SectionCard>
    </Stack>
  )
}

export default DashboardPage
