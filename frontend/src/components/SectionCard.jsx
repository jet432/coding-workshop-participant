import PropTypes from 'prop-types'
import { Box, Paper, Stack, Typography } from '@mui/material'

/**
 * Render a page section with a consistent card treatment.
 *
 * @param {{title: string, subtitle?: string, actions?: React.ReactNode, children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
function SectionCard({ title, subtitle, actions, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid rgba(21, 37, 59, 0.08)',
        px: { xs: 2, sm: 3 },
        py: 2.5,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5">{title}</Typography>
          {subtitle && (
            <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions}
      </Stack>
      {children}
    </Paper>
  )
}

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
}

SectionCard.defaultProps = {
  subtitle: undefined,
  actions: null,
}

export default SectionCard
