import React, { useEffect, useState, useCallback } from 'react';
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
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Warning,
  CreditCard,
  QrCode2,
  ContentCopy,
  OpenInNew,
  Refresh,
  CheckCircle
} from '@mui/icons-material';
import api from '../services/api';

interface SubscriptionStatus {
  isActive: boolean;
  planType: string;
  planName: string;
  daysRemaining: number;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  createdAt?: string;
  qrCodeData?: string;
  paymentUrl?: string;
  monthlyAmount?: number;
}

const SubscriptionVerification: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Paths that don't require subscription
  const exemptPaths = [
    '/login',
    '/invitation',
    '/book',
    '/subscription/plans',
    '/super-admin',
  ];

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      setChecking(true);
      const response = await api.get('/subscription/status');
      const subscriptionStatus = response.data;
      setStatus(subscriptionStatus);

      // Check if subscription is expired
      if (!subscriptionStatus.isActive &&
          (!subscriptionStatus.isTrialPeriod || subscriptionStatus.daysRemaining <= 0)) {
        setShowBlockingModal(true);

        // If QR data is included in status, use it
        if (subscriptionStatus.qrCodeData) {
          setQrCode(subscriptionStatus.qrCodeData);
        }
        if (subscriptionStatus.paymentUrl) {
          setPaymentUrl(subscriptionStatus.paymentUrl);
        }

        // If no QR, try to generate one
        if (!subscriptionStatus.qrCodeData) {
          await generatePaymentQR(subscriptionStatus.planType || 'pro');
        }
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
            await generatePaymentQR(subscriptionStatus.planType || 'pro');
          }
        } catch (trialError) {
          console.error('Error creating trial subscription:', trialError);
          setShowBlockingModal(true);
        }
      }
      // Handle 402 Payment Required
      else if (error.response?.status === 402) {
        setShowBlockingModal(true);
        await generatePaymentQR('pro');
      }
      else {
        console.error('Error checking subscription:', error);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  const generatePaymentQR = async (planCode: string) => {
    try {
      setLoadingQR(true);
      const response = await api.get(`/subscription/payment-qr/${planCode}`);
      if (response.data?.qrCode) {
        setQrCode(response.data.qrCode);
      }
      if (response.data?.paymentUrl) {
        setPaymentUrl(response.data.paymentUrl);
      }
    } catch (error) {
      console.error('Error generating payment QR:', error);
    } finally {
      setLoadingQR(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      setCheckingPayment(true);
      const response = await api.get('/subscription/status');
      const subscriptionStatus = response.data;

      if (subscriptionStatus.isActive) {
        setShowBlockingModal(false);
        window.location.reload();
      } else {
        // Show message that payment is still pending
        setCopySuccess(true);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCopyLink = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      setCopySuccess(true);
    }
  };

  const handleOpenPaymentLink = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    }
  };

  useEffect(() => {
    // Only check subscription status if user is authenticated and not on exempt path
    const token = localStorage.getItem('authToken');
    const isExemptPath = exemptPaths.some(path => location.pathname.startsWith(path));

    if (token && !isExemptPath) {
      checkSubscriptionStatus();
    }
  }, [location.pathname, checkSubscriptionStatus]);

  // Escuchar eventos globales 402 emitidos por el interceptor
  useEffect(() => {
    const onSubscriptionRequired = () => {
      const isExemptPath = exemptPaths.some(path => location.pathname.startsWith(path));
      if (!isExemptPath) {
        setShowBlockingModal(true);
        generatePaymentQR('pro');
      }
    };
    window.addEventListener('subscription-required', onSubscriptionRequired as EventListener);
    return () => {
      window.removeEventListener('subscription-required', onSubscriptionRequired as EventListener);
    };
  }, [location.pathname]);

  const handleSubscribe = () => {
    navigate('/subscription/plans');
    setShowBlockingModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('user');
    navigate('/login');
    setShowBlockingModal(false);
  };

  // Don't render anything if not blocking
  if (!showBlockingModal) {
    return null;
  }

  return (
    <>
      <Dialog
        open={showBlockingModal}
        onClose={() => {}}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          }
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
            py: 2,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <Warning sx={{ color: 'white', fontSize: 32 }} />
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
            Suscripción Vencida
          </Typography>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          {checking ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body1" fontWeight={500}>
                  Tu período de prueba ha finalizado
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Para continuar usando Turnos Pro y acceder a todas las funcionalidades,
                  necesitas activar tu suscripción.
                </Typography>
              </Alert>

              {/* QR Code Section */}
              <Box
                sx={{
                  textAlign: 'center',
                  py: 3,
                  px: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 3,
                  mb: 3
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <QrCode2 color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Pagar con MercadoPago
                  </Typography>
                </Box>

                {loadingQR ? (
                  <Box sx={{ py: 4 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Generando código QR...
                    </Typography>
                  </Box>
                ) : qrCode ? (
                  <>
                    <Box
                      sx={{
                        backgroundColor: 'white',
                        borderRadius: 2,
                        p: 2,
                        display: 'inline-block',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <img
                        src={qrCode}
                        alt="QR de pago MercadoPago"
                        style={{
                          width: 200,
                          height: 200,
                          display: 'block'
                        }}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                      Escanea el código QR con la app de MercadoPago
                    </Typography>

                    {status?.monthlyAmount && (
                      <Chip
                        label={`$${status.monthlyAmount.toLocaleString('es-AR')} / mes`}
                        color="primary"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </>
                ) : (
                  <Box sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se pudo generar el código QR
                    </Typography>
                    <Button
                      startIcon={<Refresh />}
                      onClick={() => generatePaymentQR(status?.planType || 'pro')}
                      sx={{ mt: 1 }}
                    >
                      Reintentar
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Alternative payment options */}
              {paymentUrl && (
                <>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      O pagar desde el navegador
                    </Typography>
                  </Divider>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<OpenInNew />}
                      onClick={handleOpenPaymentLink}
                    >
                      Abrir link de pago
                    </Button>
                    <IconButton
                      onClick={handleCopyLink}
                      title="Copiar link"
                      sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                </>
              )}

              {/* Check payment status */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="text"
                  startIcon={checkingPayment ? <CircularProgress size={16} /> : <CheckCircle />}
                  onClick={checkPaymentStatus}
                  disabled={checkingPayment}
                  color="success"
                >
                  {checkingPayment ? 'Verificando...' : 'Ya realicé el pago'}
                </Button>
              </Box>
            </>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleLogout} color="inherit" size="small">
            Cerrar Sesión
          </Button>
          <Button
            onClick={handleSubscribe}
            variant="outlined"
            size="small"
            startIcon={<CreditCard />}
          >
            Ver otros planes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="Link copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default SubscriptionVerification;
