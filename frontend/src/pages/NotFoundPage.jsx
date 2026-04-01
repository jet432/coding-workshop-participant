import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

/**
 * Render the 404 route.
 *
 * @returns {JSX.Element}
 */
function NotFoundPage() {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{ minHeight: '100vh', px: 2 }}
    >
      <Paper
        elevation={0}
        sx={{
          border: '1px solid rgba(21, 37, 59, 0.08)',
          maxWidth: 480,
          p: 4,
          textAlign: 'center',
        }}
      >
        <Typography color="secondary.main" variant="overline">
          404
        </Typography>
        <Typography sx={{ mt: 1 }} variant="h3">
          This route is not part of the workspace.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }} variant="body1">
          Head back to the dashboard to keep moving through the workshop app.
        </Typography>
        <Button component={RouterLink} sx={{ mt: 3 }} to="/" variant="contained">
          Go to dashboard
        </Button>
      </Paper>
    </Stack>
  )
}

export default NotFoundPage
