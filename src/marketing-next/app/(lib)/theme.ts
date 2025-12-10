"use client";
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#0F766E' },
    secondary: { main: '#F59E0B' },
    background: { default: '#0E1117' },
  },
  typography: {
    fontFamily: '"Space Grotesk", Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  },
});

export default theme;
