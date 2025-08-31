import React, { createContext, useContext, ReactNode } from 'react';
import { TenantConfig } from '../types';

interface TenantContextType {
  config: TenantConfig | null;
  isFeatureEnabled: (feature: string) => boolean;
  getTerm: (key: string) => string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{
  config: TenantConfig | null;
  children: ReactNode;
}> = ({ config, children }) => {
  
  const isFeatureEnabled = (feature: string): boolean => {
    if (!config) return false;
    return config.features[feature as keyof typeof config.features] || false;
  };

  const getTerm = (key: string): string => {
    if (!config) return key;
    return config.terminology[key as keyof typeof config.terminology] || key;
  };

  return (
    <TenantContext.Provider value={{ config, isFeatureEnabled, getTerm }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};