import { ArrowForwardRounded, LockOpenRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/useAuth.jsx'

const DEMO_USERS = [
  { email: 'lara.chen@acme.test', password: 'Welcome123!', label: 'Platform lead demo' },
  { email: 'mateo.silva@acme.test', password: 'Welcome123!', label: 'Operations demo' },
  { email: 'nia.brooks@acme.test', password: 'Welcome123!', label: 'Analytics demo' },
]

const PRIMARY_DEMO_USER = DEMO_USERS[0]

/**
 * Render the login page.
 *
 * @returns {JSX.Element}
 */
function LoginPage() {
  const { user, login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    return <Navigate replace to="/" />
  }

  /**
   * Submit the login form.
   *
   * @returns {Promise<void>}
   */
  async function handleSubmit() {
    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await login(form)
    } catch (apiError) {
      setError(apiError.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 5,
      }}
    >
      <Container maxWidth="lg">
        <Grid alignItems="stretch" container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                border: '1px solid rgba(21, 37, 59, 0.08)',
                overflow: 'hidden',
                p: { xs: 3, md: 5 },
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(135deg, rgba(29,122,112,0.16), transparent 55%), linear-gradient(315deg, rgba(215,139,44,0.18), transparent 48%)',
                }}
              />
              <Stack spacing={2.5} sx={{ position: 'relative' }}>
                <Typography color="secondary.main" variant="overline">
                  Workshop Management System
                </Typography>
                <Typography variant="h3">Monitor Workforce Productivity & Engagement</Typography>
                <Typography color="text.secondary" variant="body1">
                  Manage your distributed workforce and improve organizational productivity.
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LockOpenRounded color="primary" />
                  <Typography variant="body2">
                    Demo accounts are seeded automatically for local and deployed environments.
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid rgba(21, 37, 59, 0.08)',
                p: { xs: 3, md: 4 },
              }}
            >
              <Stack spacing={2}>
                <Typography variant="h4">Sign in</Typography>
                <Typography color="text.secondary" variant="body2">
                  Use the seeded demo credential below or enter it manually.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
                <Button endIcon={<ArrowForwardRounded />} onClick={handleSubmit} size="large" variant="contained">
                  {busy ? 'Signing in...' : 'Enter workspace'}
                </Button>
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(21, 37, 59, 0.08)',
                    borderRadius: 4,
                    p: 1.5,
                    maxWidth: 280,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Box>
                      <Typography variant="subtitle2">{PRIMARY_DEMO_USER.label}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {PRIMARY_DEMO_USER.email}
                      </Typography>
                    </Box>
                    <Button
                      onClick={() =>
                        setForm({
                          email: PRIMARY_DEMO_USER.email,
                          password: PRIMARY_DEMO_USER.password,
                        })
                      }
                      size="small"
                    >
                      Use credentials
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default LoginPage
