import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';

interface PlanFeatures {
  maxBookingsPerMonth: number;
  maxServices: number;
  maxStaff: number;
  maxCustomers: number;
  allowOnlinePayments: boolean;
  allowCustomBranding: boolean;
  allowSmsNotifications: boolean;
  allowEmailMarketing: boolean;
  allowReports: boolean;
  allowMultiLocation: boolean;
  allowWhatsApp: boolean;
  whatsAppMonthlyLimit: number;
  whatsAppExtraMessageCost: number;
}

interface SubscriptionStatus {
  isActive: boolean;
  planType: string;
  planName: string;
  expiresAt?: string;
  monthlyAmount: number;
  daysRemaining: number;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  createdAt: string;
  features: PlanFeatures | null;
}

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  getLimit: (limit: 'maxBookingsPerMonth' | 'maxServices' | 'maxStaff' | 'maxCustomers') => number;
  isUnlimited: (limit: 'maxBookingsPerMonth' | 'maxServices' | 'maxStaff' | 'maxCustomers' | 'whatsAppMonthlyLimit') => boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/subscription/status');
      setSubscription(response.data);
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      // No setear error si es 404 (sin suscripcion)
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || 'Error al cargar suscripcion');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [fetchSubscription]);

  const hasFeature = useCallback((feature: keyof PlanFeatures): boolean => {
    if (!subscription?.features) return false;
    const value = subscription.features[feature];
    // Para features booleanas, devuelve el valor directo
    if (typeof value === 'boolean') return value;
    // Para limites numericos, devuelve true si es diferente de 0
    return value !== 0;
  }, [subscription]);

  const getLimit = useCallback((limit: 'maxBookingsPerMonth' | 'maxServices' | 'maxStaff' | 'maxCustomers'): number => {
    if (!subscription?.features) return 0;
    return subscription.features[limit];
  }, [subscription]);

  const isUnlimited = useCallback((limit: 'maxBookingsPerMonth' | 'maxServices' | 'maxStaff' | 'maxCustomers' | 'whatsAppMonthlyLimit'): boolean => {
    if (!subscription?.features) return false;
    return subscription.features[limit] === -1;
  }, [subscription]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      error,
      hasFeature,
      getLimit,
      isUnlimited,
      refresh: fetchSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export type { PlanFeatures, SubscriptionStatus };
