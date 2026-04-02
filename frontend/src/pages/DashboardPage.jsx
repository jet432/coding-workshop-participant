import {
  Alert,
  Box,
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
import apacIcon from '../assets/regions/APAC.png'
import assignIcon from '../assets/dashboard/assign.png'
import employeeIcon from '../assets/dashboard/employee.png'
import euIcon from '../assets/regions/EU.png'
import latamIcon from '../assets/regions/LATAM.png'
import namIcon from '../assets/regions/NAM.png'
import teamIcon from '../assets/dashboard/team.png'
import trophyIcon from '../assets/dashboard/trophy.png'

const REGION_ICONS = {
  APAC: apacIcon,
  EU: euIcon,
  LATAM: latamIcon,
  NAM: namIcon,
}

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
    { label: 'Teams', value: state.data.overview.teamCount, icon: teamIcon },
    { label: 'Employees', value: state.data.overview.employeeCount, icon: employeeIcon },
    { label: 'Assignments', value: state.data.overview.memberAssignmentCount, icon: assignIcon },
    { label: 'Achievements', value: state.data.overview.achievementCount, icon: trophyIcon },
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
                  position: 'relative',
                  borderRadius: 4,
                  bgcolor: 'rgba(29, 122, 112, 0.08)',
                  minHeight: 120,
                  overflow: 'hidden',
                  p: 2.25,
                  pr: 8,
                }}
              >
                <Box
                  component="img"
                  src={card.icon}
                  alt={`${card.label} icon`}
                  sx={{
                    position: 'absolute',
                    top: 18,
                    right: 18,
                    width: 34,
                    height: 34,
                    objectFit: 'contain',
                    opacity: 0.82,
                  }}
                />
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
              {teamsByRegion.map((bucket) => {
                const regionIcon = REGION_ICONS[bucket.region]

                return (
                  <ListItem divider disableGutters key={bucket.region} sx={{ py: 1.25 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {regionIcon && (
                        <Box
                          component="img"
                          src={regionIcon}
                          alt={`${bucket.region} region icon`}
                          sx={{
                            width: 28,
                            height: 28,
                            objectFit: 'contain',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <ListItemText
                        primary={bucket.region}
                        secondary={`${bucket.teamCount} team${bucket.teamCount === 1 ? '' : 's'}`}
                      />
                    </Stack>
                  </ListItem>
                )
              })}
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
