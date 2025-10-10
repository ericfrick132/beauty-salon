import { createTheme } from '@mui/material/styles';
import { TenantConfig } from '../types';

// Function to create dynamic theme based on tenant config
export const createTurnosProTheme = (config?: TenantConfig) => {
  const theme = config?.theme;
  
  // Use theme configuration if available, otherwise use defaults
  const primaryColor = theme?.primaryColor || '#1976d2';
  const secondaryColor = theme?.secondaryColor || '#ffffff';
  const accentColor = theme?.accentColor || '#ffc107';
  const backgroundColor = theme?.backgroundColor || '#ffffff';
  const surfaceColor = theme?.surfaceColor || '#f5f5f5';
  const errorColor = theme?.errorColor || '#f44336';
  const warningColor = theme?.warningColor || '#ff9800';
  const infoColor = theme?.infoColor || '#2196f3';
  const successColor = theme?.successColor || '#4caf50';
  const textPrimaryColor = theme?.textPrimaryColor || '#000000';
  const textSecondaryColor = theme?.textSecondaryColor || '#666666';
  const borderColor = theme?.borderColor || '#e0e0e0';
  const fontFamily = theme?.fontFamily || 'Roboto, Helvetica, Arial, sans-serif';
  const borderRadius = theme?.borderRadius || 8;
  const useShadows = theme?.useShadows ?? true;
  
  // Determine if this should be light or dark theme based on vertical
  const isLightTheme = true; // Always use light theme for clean aesthetic
  
  return createTheme({
    palette: {
      mode: isLightTheme ? 'light' : 'dark',
      primary: {
        main: primaryColor,
        contrastText: '#ffffff', // Always white text on primary color
      },
      secondary: {
        main: secondaryColor,
        contrastText: isLightTheme ? '#000000' : '#ffffff',
      },
      background: {
        default: backgroundColor,
        paper: surfaceColor,
      },
      text: {
        primary: textPrimaryColor,
        secondary: textSecondaryColor,
      },
      error: {
        main: errorColor,
      },
      warning: {
        main: warningColor,
      },
      success: {
        main: successColor,
      },
      info: {
        main: infoColor,
      },
    },
    typography: {
      fontFamily: fontFamily,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: borderRadius,
  },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: borderRadius,
            padding: '8px 16px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: useShadows ? `0 4px 12px ${primaryColor}30` : 'none',
            },
          },
          contained: {
            backgroundColor: primaryColor,
            color: '#ffffff', // Always white text on primary buttons
            '&:hover': {
              backgroundColor: accentColor,
            },
          },
          outlined: {
            borderColor: primaryColor,
            color: primaryColor,
            '&:hover': {
              borderColor: accentColor,
              backgroundColor: `${primaryColor}10`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: surfaceColor,
            borderRadius: borderRadius,
            border: `1px solid ${borderColor}`,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: useShadows ? `0 8px 24px ${primaryColor}20` : 'none',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadius,
              backgroundColor: surfaceColor,
              '& fieldset': {
                borderColor: borderColor,
              },
              '&:hover fieldset': {
                borderColor: primaryColor,
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryColor,
              },
            },
            '& .MuiInputLabel-root': {
              color: isLightTheme ? `${primaryColor}80` : '#CCCCCC',
              '&.Mui-focused': {
                color: primaryColor,
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: surfaceColor,
            borderBottom: `1px solid ${borderColor}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: surfaceColor,
            borderRight: `1px solid ${borderColor}`,
          },
        },
      },
    },
  });
};

// Default theme (backwards compatibility)
export const TurnosProTheme = createTurnosProTheme();
