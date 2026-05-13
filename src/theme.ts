import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7bf2e3',
    },
    secondary: {
      main: '#f2b75e',
    },
    error: {
      main: '#ff6f61',
    },
    warning: {
      main: '#ffc857',
    },
    success: {
      main: '#59e390',
    },
    background: {
      default: '#0a1621',
      paper: 'rgba(10, 27, 40, 0.76)',
    },
    text: {
      primary: '#eef7ff',
      secondary: 'rgba(238, 247, 255, 0.74)',
    },
  },
  shape: {
    borderRadius: 22,
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
      fontFamily: '"Space Grotesk", sans-serif',
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(22px)',
          border: '1px solid rgba(255,255,255,0.08)',
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          boxShadow: '0 22px 80px rgba(0, 0, 0, 0.24)',
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
});
