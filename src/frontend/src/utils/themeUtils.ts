// Theme utilities for managing vertical-specific styles
export interface ThemeConfig {
  isLightBackground: boolean;
  usesSoftColors: boolean;
  headerStyle: 'solid' | 'gradient' | 'subtle';
  shadowIntensity: 'none' | 'soft' | 'medium' | 'strong';
  borderStyle: 'none' | 'subtle' | 'normal' | 'accent';
  // Colores secundarios y acentos adicionales
  secondaryColors?: {
    deep?: string;
    light?: string;
    accent2?: string;
  };
}

// Theme configurations for each vertical
export const verticalThemes: Record<string, ThemeConfig> = {
  barbershop: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'solid',
    shadowIntensity: 'soft',
    borderStyle: 'normal',
  },
  beautysalon: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'solid',
    shadowIntensity: 'soft',
    borderStyle: 'normal',
  },
  aesthetics: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'solid',
    shadowIntensity: 'soft',
    borderStyle: 'normal',
  },
  nailsalon: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'solid',
    shadowIntensity: 'soft',
    borderStyle: 'normal',
  },
  // Default configuration
  default: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'solid',
    shadowIntensity: 'soft',
    borderStyle: 'normal',
  },
};

export const getThemeConfig = (vertical?: string): ThemeConfig => {
  return verticalThemes[vertical || 'default'] || verticalThemes.default;
};

// Helper functions for generating styles
export const getCardShadow = (_config: ThemeConfig, _color: string): string => {
  return 'none'; // AppBar uses no shadow, relies on solid bg
};

export const getBorderStyle = (_config: ThemeConfig, _primaryColor: string, _accentColor: string): string => {
  return 'none'; // AppBar is solid dark, no border needed
};

export const getHeaderGradient = (
  _config: ThemeConfig,
  _primaryColor: string,
  _accentColor: string
): string => {
  return 'none';
};

export const getTextColor = (_config: ThemeConfig, _primaryColor: string): string => {
  return '#FFFFFF'; // White text on dark navbar
};

export const getStatusColor = (status: string, config: ThemeConfig): string => {
  const colors = {
    confirmed: config.secondaryColors?.accent2 || '#16A34A',
    pending: config.secondaryColors?.deep || '#D97706',
    cancelled: '#DC2626',
  };
  return colors[status as keyof typeof colors] || '#6B7280';
};

export const getHeaderTextColor = (_config: ThemeConfig): string => {
  return '#FFFFFF'; // White on dark navbar
};

export const getCardBackground = (_config: ThemeConfig, _secondaryColor: string): string => {
  return '#FFFFFF';
};
