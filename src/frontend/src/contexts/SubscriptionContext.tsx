import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api, { PlanFeatures } from '../services/api';

/**
 * GET /subscription/status. Freemium: `isActive` siempre es true (puede usar el sistema); `isPaid` dice si
 * tiene un plan pago. Sin pagar, `planType` es "free" y `features` son las del plan Gratuito.
 */
interface SubscriptionStatus {
  isActive: boolean;
  isPaid: boolean;
  planType: string;
  planName: string;
  expiresAt?: string;
  monthlyAmount: number;
  createdAt: string;
  features: PlanFeatures | null;
}

type NumericLimit = { [K in keyof PlanFeatures]: PlanFeatures[K] extends number ? K : never }[keyof PlanFeatures];

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  /** true si el plan es Gratuito (o todavía no cargó el estado). */
  isFree: boolean;
  getLimit: (limit: NumericLimit) => number;
  isUnlimited: (limit: NumericLimit) => boolean;
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
      const response = await api.get('/subscription/status', { params: { includePaymentLink: false } });
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
    // Booleanas: el valor directo. Números (límites): incluido si no es 0 (-1 = ilimitado). Funciona igual
    // con el plan Gratuito: el backend manda sus features reales.
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return false;
  }, [subscription]);

  const getLimit = useCallback((limit: NumericLimit): number => {
    if (!subscription?.features) return 0;
    return subscription.features[limit];
  }, [subscription]);

  const isUnlimited = useCallback((limit: NumericLimit): boolean => {
    if (!subscription?.features) return false;
    return subscription.features[limit] === -1;
  }, [subscription]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      error,
      hasFeature,
      isFree: !subscription?.isPaid,
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
