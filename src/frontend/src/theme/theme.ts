import { createTheme } from '@mui/material/styles';
import { TenantConfig } from '../types';

// Function to create dynamic theme based on tenant config
export const createTurnosProTheme = (config?: TenantConfig) => {
  const theme = config?.theme;
  
  // Use theme configuration if available, otherwise use defaults
  // Accessible, neutral defaults
  const primaryColor = theme?.primaryColor || '#2563EB'; // blue-600
  const secondaryColor = theme?.secondaryColor || '#0EA5E9'; // sky-500
  const accentColor = theme?.accentColor || '#10B981'; // emerald-500
  const backgroundColor = theme?.backgroundColor || '#F8FAFC'; // slate-50
  const surfaceColor = theme?.surfaceColor || '#FFFFFF';
  const errorColor = theme?.errorColor || '#f44336';
  const warningColor = theme?.warningColor || '#ff9800';
  const infoColor = theme?.infoColor || '#2196f3';
  const successColor = theme?.successColor || '#4caf50';
  const textPrimaryColor = theme?.textPrimaryColor || '#0F172A'; // slate-900
  const textSecondaryColor = theme?.textSecondaryColor || '#475569'; // slate-600
  const borderColor = theme?.borderColor || '#E5E7EB'; // gray-200
  const fontFamily = theme?.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';
  const borderRadius = theme?.borderRadius || 8;
  const useShadows = theme?.useShadows ?? true;
  
  // Determine if this should be light or dark theme based on vertical
  const isLightTheme = true; // light theme for clarity and contrast
  
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
      htmlFontSize: 16,
      allVariants: {
        color: textPrimaryColor,
      },
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.25,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
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
