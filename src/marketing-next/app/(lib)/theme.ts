"use client";
import { createTheme } from '@mui/material/styles';

// "Editorial Agenda" palette — warm paper + saturated ink, no SaaS gradient.
export const palette = {
  paper: '#F4EFE6',        // body bg, warm cream
  paperSoft: '#FAF7F0',    // card surface
  paperDeep: '#EAE2D2',    // alt section bg
  ink: '#171410',          // text + hard borders
  inkSoft: '#5C5347',      // secondary text, warm slate
  inkMute: '#8C8275',
  forest: '#1E5E3F',       // primary action (confirmed/paid green)
  forestDeep: '#143F2B',
  coral: '#E8593C',        // hot accent — emphasis, urgency
  coralDeep: '#C7411F',
  amber: '#F4C038',        // sunshine — highlights, badges
  rose: '#E8B8A8',         // soft warmth, beauty signal
  cream: '#F4EFE6',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.forest, dark: palette.forestDeep, contrastText: palette.paper },
    secondary: { main: palette.coral, dark: palette.coralDeep, contrastText: palette.paper },
    background: { default: palette.paper, paper: palette.paperSoft },
    text: { primary: palette.ink, secondary: palette.inkSoft },
    divider: 'rgba(23,20,16,0.18)',
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'var(--font-grotesk), system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    h1: {
      fontFamily: 'var(--font-fraunces), Georgia, serif',
      fontWeight: 500,
      letterSpacing: '-0.035em',
      lineHeight: 0.96,
    },
    h2: {
      fontFamily: 'var(--font-fraunces), Georgia, serif',
      fontWeight: 500,
      letterSpacing: '-0.03em',
      lineHeight: 1,
    },
    h3: {
      fontFamily: 'var(--font-fraunces), Georgia, serif',
      fontWeight: 500,
      letterSpacing: '-0.025em',
      lineHeight: 1.05,
    },
    h4: {
      fontFamily: 'var(--font-fraunces), Georgia, serif',
      fontWeight: 500,
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
    },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.005em' },
    body1: { lineHeight: 1.65 },
    body2: { lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.005em' },
    overline: {
      fontFamily: 'var(--font-mono), ui-monospace, monospace',
      fontSize: '0.72rem',
      letterSpacing: '0.18em',
      fontWeight: 500,
      lineHeight: 1.4,
    },
  },
  shadows: [
    'none',
    '0 1px 0 rgba(23,20,16,0.12)',
    '0 2px 0 rgba(23,20,16,0.18)',
    '4px 4px 0 rgba(23,20,16,1)',
    '6px 6px 0 rgba(23,20,16,1)',
    '8px 8px 0 rgba(23,20,16,1)',
    '0 18px 40px rgba(23,20,16,0.18)',
    '0 24px 48px rgba(23,20,16,0.22)',
    '0 30px 60px rgba(23,20,16,0.25)',
    'none','none','none','none','none','none','none','none','none','none','none','none','none','none','none','none',
  ] as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.paper,
          color: palette.ink,
          fontFamily: 'var(--font-grotesk), system-ui, sans-serif',
          // Subtle paper grain — purely decorative, no perf hit.
          backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.09  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.05 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          backgroundRepeat: 'repeat',
        },
        '::selection': {
          background: palette.amber,
          color: palette.ink,
        },
        // Reusable section number rule used across sections.
        '.tp-rule': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.72rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: palette.ink,
        },
        '.tp-rule::before': {
          content: '""',
          display: 'inline-block',
          width: '36px',
          height: '1.5px',
          background: palette.ink,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '10px 22px',
          transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
        },
        contained: {
          border: `1.5px solid ${palette.ink}`,
          boxShadow: `3px 3px 0 ${palette.ink}`,
          '&:hover': {
            transform: 'translate(-1px,-1px)',
            boxShadow: `5px 5px 0 ${palette.ink}`,
          },
          '&:active': {
            transform: 'translate(2px,2px)',
            boxShadow: `1px 1px 0 ${palette.ink}`,
          },
        },
        containedPrimary: {
          background: palette.forest,
          color: palette.paperSoft,
          '&:hover': { background: palette.forestDeep },
        },
        containedSecondary: {
          background: palette.coral,
          color: palette.paperSoft,
          '&:hover': { background: palette.coralDeep },
        },
        outlined: {
          border: `1.5px solid ${palette.ink}`,
          color: palette.ink,
          '&:hover': { background: palette.paperDeep, borderColor: palette.ink },
        },
        text: {
          color: palette.ink,
          '&:hover': { background: 'transparent', color: palette.coral },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: palette.paperSoft,
          backgroundImage: 'none',
          border: `1.5px solid ${palette.ink}`,
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          border: `1.5px solid ${palette.ink}`,
          borderRadius: 999,
          fontFamily: 'var(--font-mono), monospace',
          fontWeight: 500,
          fontSize: '0.7rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          background: palette.paperSoft,
          color: palette.ink,
          height: 28,
        },
        outlined: { borderColor: palette.ink },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: palette.paper,
          color: palette.ink,
          borderBottom: `1.5px solid ${palette.ink}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          borderRadius: '0 !important',
          '&::before': { display: 'none' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          background: palette.paperSoft,
          '& fieldset': { borderColor: palette.ink, borderWidth: 1.5 },
          '&:hover fieldset': { borderColor: `${palette.ink} !important` },
          '&.Mui-focused fieldset': { borderColor: `${palette.forest} !important`, borderWidth: 2 },
        },
      },
    },
  },
});

export default theme;
