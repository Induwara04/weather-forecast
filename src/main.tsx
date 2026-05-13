import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import App from './App';
import { appTheme } from './theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          ':root': {
            colorScheme: 'dark',
            '--app-amber': '#f2b75e',
            '--app-teal': '#7bf2e3',
            '--app-ink': '#08151f',
          },
          body: {
            minHeight: '100vh',
            background:
              'radial-gradient(circle at top left, rgba(123,242,227,0.2), transparent 28%), radial-gradient(circle at top right, rgba(242,183,94,0.16), transparent 22%), linear-gradient(180deg, #07131d 0%, #0d2030 48%, #10273b 100%)',
          },
          '#root': {
            minHeight: '100vh',
          },
        }}
      />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
