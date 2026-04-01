import PropTypes from 'prop-types'
import { Box, CircularProgress, Typography } from '@mui/material'

/**
 * Render a centered loading state.
 *
 * @param {{message?: string}} props
 * @returns {JSX.Element}
 */
function LoadingState({ message }) {
  return (
    <Box
      sx={{
        display: 'grid',
        minHeight: '40vh',
        placeItems: 'center',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress color="primary" />
        <Typography sx={{ mt: 2 }} variant="body1">
          {message}
        </Typography>
      </Box>
    </Box>
  )
}

LoadingState.propTypes = {
  message: PropTypes.string,
}

LoadingState.defaultProps = {
  message: 'Loading data...',
}

export default LoadingState
