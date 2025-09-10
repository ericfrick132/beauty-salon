import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Star,
  Close,
  QrCode2,
  CreditCard,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface SubscriptionStatusData {
  isActive: boolean;
  planType: string;
  planName: string;
  expiresAt?: string;
  monthlyAmount: number;
  daysRemaining: number;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  qrCodeData?: string;
  createdAt?: string;
}

interface SubscriptionStatusProps {
  compact?: boolean;
  showActions?: boolean;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  compact = false,
  showActions = true,
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubscriptionStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/subscription/status');
      setStatus(response.data);
      
      // Si hay QR code pendiente, mostrarlo
      if (response.data.qrCodeData && !response.data.isActive) {
        setQrCode(response.data.qrCodeData);
        if (!compact) {
          setShowQrModal(true);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'basic':
        return '#757575';
      case 'pro':
        return '#1976d2';
      case 'enterprise':
        return '#9c27b0';
      default:
        return '#1976d2';
    }
  };

  const getStatusColor = () => {
    if (!status) return 'default';
    
    if (status.isActive && !status.isTrialPeriod) {
      return 'success';
    } else if (status.isTrialPeriod && status.daysRemaining > 7) {
      return 'info';
    } else if (status.isTrialPeriod && status.daysRemaining <= 7) {
      return 'warning';
    } else {
      return 'error';
    }
  };

  const getStatusMessage = () => {
    if (!status) return '';
    
    if (status.isActive && !status.isTrialPeriod) {
      return `Plan ${status.planName} activo`;
    } else if (status.isTrialPeriod && status.daysRemaining > 0) {
      return `Período de prueba - ${status.daysRemaining} días restantes`;
    } else {
      return 'Suscripción requerida';
    }
  };

  const handleUpgrade = () => {
    navigate('/subscription/plans');
  };

  const handlePayNow = () => {
    if (qrCode) {
      setShowQrModal(true);
    } else {
      navigate('/subscription/plans');
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!status) {
    return null;
  }

  // Compact version for header/sidebar
  if (compact) {
    return (
      <Box sx={{ p: 1 }}>
        <Chip
          icon={status.isActive ? <CheckCircle /> : <Warning />}
          label={getStatusMessage()}
          color={getStatusColor() as any}
          size="small"
          onClick={showActions ? handleUpgrade : undefined}
          sx={{ cursor: showActions ? 'pointer' : 'default' }}
        />
      </Box>
    );
  }

  // Full card version for dashboard
  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Star sx={{ color: getPlanColor(status.planType), mr: 1 }} />
            <Typography variant="h6">
              Estado de Suscripción
            </Typography>
          </Box>

          {status.isTrialPeriod && status.daysRemaining > 0 && (
            <Alert severity={status.daysRemaining <= 7 ? 'warning' : 'info'} sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Período de prueba:</strong> Te quedan {status.daysRemaining} días para explorar todas las funcionalidades.
              </Typography>
            </Alert>
          )}

          {!status.isActive && (!status.isTrialPeriod || status.daysRemaining <= 0) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Tu período de prueba ha expirado. Suscríbete para continuar usando Turnos Pro.
              </Typography>
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Plan Actual
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ color: getPlanColor(status.planType) }}>
                {status.planName}
              </Typography>
              {status.isActive && (
                <Chip
                  label={status.isTrialPeriod ? 'PRUEBA' : 'ACTIVO'}
                  color={status.isTrialPeriod ? 'warning' : 'success'}
                  size="small"
                />
              )}
            </Box>
          </Box>

          {status.monthlyAmount > 0 && !status.isTrialPeriod && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Precio mensual
              </Typography>
              <Typography variant="h6">
                ${status.monthlyAmount.toLocaleString('es-AR')} / mes
              </Typography>
            </Box>
          )}

          {status.isTrialPeriod && status.daysRemaining > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Progreso del período de prueba
              </Typography>
              {(() => {
                const dayMs = 24 * 60 * 60 * 1000;
                const createdAt = status.createdAt ? new Date(status.createdAt) : null;
                const trialEndsAt = status.trialEndsAt ? new Date(status.trialEndsAt) : null;
                const totalTrialDays = createdAt && trialEndsAt
                  ? Math.max(1, Math.round((trialEndsAt.getTime() - createdAt.getTime()) / dayMs))
                  : 14; // fallback
                const usedDays = Math.min(
                  totalTrialDays,
                  Math.max(0, totalTrialDays - status.daysRemaining)
                );
                const progress = (usedDays / totalTrialDays) * 100;
                return (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {usedDays} de {totalTrialDays} días utilizados
                    </Typography>
                  </>
                );
              })()}
              
            </Box>
          )}

          {showActions && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              {status.isTrialPeriod || !status.isActive ? (
                <>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handlePayNow}
                    startIcon={<CreditCard />}
                    sx={{ backgroundColor: getPlanColor(status.planType) }}
                  >
                    {status.daysRemaining <= 0 ? 'Activar Suscripción' : 'Suscribirse Ahora'}
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleUpgrade}
                    sx={{ borderColor: getPlanColor(status.planType) }}
                  >
                    Ver Planes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleUpgrade}
                  sx={{ borderColor: getPlanColor(status.planType) }}
                >
                  Cambiar Plan
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* QR Payment Modal */}
      <Dialog
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> 
            <Typography variant="h6">Completa tu Suscripción</Typography>
            <IconButton onClick={() => setShowQrModal(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <QrCode2 sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Escanea el código QR con MercadoPago
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Abre la app de MercadoPago en tu celular y escanea este código para completar el pago
            </Typography>
            
            {qrCode && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <img 
                  src={qrCode} 
                  alt="QR Code para pago" 
                  style={{ maxWidth: '300px', width: '100%' }}
                />
              </Box>
            )}
            
            <Alert severity="info">
              Una vez completado el pago, tu suscripción se activará automáticamente
            </Alert>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionStatus;
