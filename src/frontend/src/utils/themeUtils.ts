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
    shadowIntensity: 'none',
    borderStyle: 'subtle',
    secondaryColors: {
      deep: '#000000',      // Negro puro
      light: '#333333',     // Gris oscuro
      accent2: '#666666',   // Gris medio
    },
  },
  beautysalon: {
    isLightBackground: true,
    usesSoftColors: true,
    headerStyle: 'subtle',
    shadowIntensity: 'soft',
    borderStyle: 'subtle',
    secondaryColors: {
      deep: '#E6E6FA',      // Lavanda suave
      light: '#F5DEB3',     // Beige cálido
      accent2: '#98AFB8',   // Azul polvoso
    },
  },
  aesthetics: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'gradient',
    shadowIntensity: 'soft',
    borderStyle: 'normal',
    secondaryColors: {
      deep: '#001F3F',      // Azul marino profundo
      light: '#F5F5DC',     // Beige arena
      accent2: '#40E0D0',   // Turquesa claro
    },
  },
  nailsalon: {
    isLightBackground: true,
    usesSoftColors: false,
    headerStyle: 'gradient',
    shadowIntensity: 'medium',
    borderStyle: 'accent',
    secondaryColors: {
      deep: '#9370DB',      // Lavanda intenso
      light: '#FFD700',     // Dorado brillante
      accent2: '#40E0D0',   // Turquesa eléctrico
    },
  },
  // Default configuration
  default: {
    isLightBackground: false,
    usesSoftColors: false,
    headerStyle: 'gradient',
    shadowIntensity: 'medium',
    borderStyle: 'normal',
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
  config: ThemeConfig,
  primaryColor: string,
  accentColor: string
): string => {
  switch (config.headerStyle) {
    case 'solid':
      return accentColor;
    case 'subtle':
      return `linear-gradient(135deg, ${primaryColor}40 0%, ${accentColor}30 100%)`;
    case 'gradient':
      // Usar colores secundarios si están disponibles para gradientes más ricos
      if (config.secondaryColors?.deep) {
        return `linear-gradient(135deg, ${primaryColor} 0%, ${config.secondaryColors.deep}80 50%, ${accentColor}90 100%)`;
      }
      return `linear-gradient(135deg, ${primaryColor}90 0%, ${accentColor}80 100%)`;
    default:
      return `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`;
  }
};

export const getTextColor = (config: ThemeConfig, primaryColor: string): string => {
  if (config.usesSoftColors) {
    return '#6B5B73'; // Soft purple-gray for beauty salon
  }
  if (config.isLightBackground) {
    return '#2C3E50'; // Dark gray for light backgrounds
  }
  return primaryColor;
};

export const getStatusColor = (status: string, config: ThemeConfig): string => {
  const colors = {
    confirmed: config.secondaryColors?.accent2 || '#28A745',
    pending: config.secondaryColors?.deep || '#FFC107',
    cancelled: '#DC3545',
  };
  return colors[status as keyof typeof colors] || '#6C757D';
};

export const getHeaderTextColor = (config: ThemeConfig): string => {
  if (config.headerStyle === 'subtle') {
    return '#6B5B73'; // Dark for subtle headers
  }
  return '#FFFFFF'; // White for gradient/solid headers
};

export const getCardBackground = (config: ThemeConfig, secondaryColor: string): string => {
  if (config.isLightBackground) {
    return '#FFFFFF';
  }
  return `${secondaryColor}95`;
};