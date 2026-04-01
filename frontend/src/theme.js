import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1d7a70',
      dark: '#12584f',
      light: '#4ca498',
      contrastText: '#f7f8f5',
    },
    secondary: {
      main: '#d78b2c',
      dark: '#9f641d',
      light: '#efb15c',
      contrastText: '#102132',
    },
    background: {
      default: '#edf2f5',
      paper: 'rgba(255, 255, 255, 0.78)',
    },
    text: {
      primary: '#15253b',
      secondary: '#475b74',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Source Sans 3", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(14px)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
  },
})

export default theme
