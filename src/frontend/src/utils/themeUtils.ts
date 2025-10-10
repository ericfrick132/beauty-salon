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
    headerStyle: 'subtle',
    shadowIntensity: 'soft',
    borderStyle: 'subtle',
  },
  beautysalon: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'subtle',
    shadowIntensity: 'soft',
    borderStyle: 'subtle',
  },
  aesthetics: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'subtle',
    shadowIntensity: 'soft',
    borderStyle: 'subtle',
  },
  nailsalon: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'subtle',
    shadowIntensity: 'soft',
    borderStyle: 'subtle',
  },
  // Default configuration
  default: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'subtle',
    shadowIntensity: 'soft',
    borderStyle: 'subtle',
  },
};

export const getThemeConfig = (vertical?: string): ThemeConfig => {
  return verticalThemes[vertical || 'default'] || verticalThemes.default;
};

// Helper functions for generating styles
export const getCardShadow = (config: ThemeConfig, color: string): string => {
  switch (config.shadowIntensity) {
    case 'none':
      return 'none';
    case 'soft':
      return `0 2px 8px rgba(0,0,0,0.05)`;
    case 'medium':
      return `0 3px 12px ${color}20`;
    case 'strong':
      return `0 4px 20px ${color}30`;
    default:
      return `0 2px 10px ${color}15`;
  }
};

export const getBorderStyle = (config: ThemeConfig, primaryColor: string, accentColor: string): string => {
  switch (config.borderStyle) {
    case 'none':
      return 'none';
    case 'subtle':
      return `1px solid ${primaryColor}20`;
    case 'normal':
      return `2px solid ${primaryColor}30`;
    case 'accent':
      return `1px solid ${accentColor}40`;
    default:
      return `1px solid ${primaryColor}25`;
  }
};

export const getHeaderGradient = (
  _config: ThemeConfig,
  _primaryColor: string,
  _accentColor: string
): string => {
  // Neutral subtle gradient to ensure readability across verticals
  return 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)';
};

export const getTextColor = (_config: ThemeConfig, _primaryColor: string): string => {
  // Always use high-contrast neutral text
  return '#0F172A';
};

export const getStatusColor = (status: string, config: ThemeConfig): string => {
  const colors = {
    confirmed: config.secondaryColors?.accent2 || '#28A745',
    pending: config.secondaryColors?.deep || '#FFC107',
    cancelled: '#DC3545',
  };
  return colors[status as keyof typeof colors] || '#6C757D';
};

export const getHeaderTextColor = (_config: ThemeConfig): string => {
  // Dark neutral for subtle headers
  return '#0F172A';
};

export const getCardBackground = (_config: ThemeConfig, _secondaryColor: string): string => {
  return '#FFFFFF';
};
