import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
  LinearProgress,
} from '@mui/material';
import { Warning, CreditCard } from '@mui/icons-material';
import api from '../services/api';

interface SubscriptionStatus {
  isActive: boolean;
  planType: string;
  planName: string;
  daysRemaining: number;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  createdAt?: string;
}

const SubscriptionVerification: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const [checking, setChecking] = useState(false);

  // Paths that don't require subscription
  const exemptPaths = [
    '/login',
    '/invitation',
    '/book',
    '/subscription/plans',
    '/super-admin',
  ];

  useEffect(() => {
    // Only check subscription status if user is authenticated and not on exempt path
    const token = localStorage.getItem('token');
    const isExemptPath = exemptPaths.some(path => location.pathname.startsWith(path));
    
    if (token && !isExemptPath) {
      checkSubscriptionStatus();
    }
  }, [location.pathname]);

  const checkSubscriptionStatus = async () => {
    try {
      setChecking(true);
      const response = await api.get('/subscription/status');
      const subscriptionStatus = response.data;
      setStatus(subscriptionStatus);

      // Check if subscription is expired
      if (!subscriptionStatus.isActive && 
          (!subscriptionStatus.isTrialPeriod || subscriptionStatus.daysRemaining <= 0)) {
        setShowBlockingModal(true);
      }
    } catch (error: any) {
      // If no subscription found, try to initialize trial
      if (error.response?.status === 404) {
        try {
          const trialResponse = await api.post('/subscription/initialize-trial');
          console.log('Trial subscription created:', trialResponse.data);
          // Small delay to ensure DB transaction is committed
          await new Promise(resolve => setTimeout(resolve, 500));
          // Recheck status after creating trial
          const statusResponse = await api.get('/subscription/status');
          const subscriptionStatus = statusResponse.data;
          setStatus(subscriptionStatus);
          
          // Only show blocking modal if trial is actually expired
          if (!subscriptionStatus.isActive && 
              (!subscriptionStatus.isTrialPeriod || subscriptionStatus.daysRemaining <= 0)) {
            setShowBlockingModal(true);
          }
        } catch (trialError) {
          console.error('Error creating trial subscription:', trialError);
          setShowBlockingModal(true);
        }
      }
      // Handle 402 Payment Required
      else if (error.response?.status === 402) {
        setShowBlockingModal(true);
      }
      else {
        console.error('Error checking subscription:', error);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = () => {
    navigate('/subscription/plans');
    setShowBlockingModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    setShowBlockingModal(false);
  };

  // Don't render anything if not blocking
  if (!showBlockingModal) {
    return null;
  }

  return (
    <Dialog
      open={showBlockingModal}
      onClose={() => {}}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" />
          <Typography variant="h6">Suscripción Requerida</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {checking ? (
          <LinearProgress />
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Tu período de prueba ha expirado. Para continuar usando Turnos Pro, 
              necesitas activar tu suscripción.
            </Alert>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              Selecciona un plan que se adapte a tus necesidades:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">• Plan Básico: $15,000/mes - Todo incluido</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">• Plan Premium: $20,000/mes - Incluye WhatsApp</Typography>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Todos los planes incluyen acceso completo a las funcionalidades de Turnos Pro
              y soporte técnico.
            </Typography>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleLogout} color="inherit">
          Cerrar Sesión
        </Button>
        <Button
          onClick={handleSubscribe}
          variant="contained"
          color="primary"
          startIcon={<CreditCard />}
          autoFocus
        >
          Ver Planes y Suscribirse
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubscriptionVerification;
