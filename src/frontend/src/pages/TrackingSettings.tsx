import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Link,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, Insights, OpenInNew, Save, Visibility, EventAvailable, Payments } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { isPlanLimitError } from '../services/api';
import { trackingSettingsApi } from '../services/planFeaturesApi';
import FeaturePaywall from '../components/subscription/FeaturePaywall';

const PIXEL_RE = /^[0-9]{10,20}$/;
const GA_RE = /^G-[A-Z0-9]{4,16}$/;

const EVENTS = [
  { icon: <Visibility fontSize="small" color="primary" />, title: 'Alguien entra a tu página de reservas', meta: 'PageView', ga: 'page_view' },
  { icon: <EventAvailable fontSize="small" color="primary" />, title: 'Alguien reserva un turno', meta: 'Schedule', ga: 'generate_lead' },
  { icon: <Payments fontSize="small" color="primary" />, title: 'Va a pagar la seña / la paga', meta: 'InitiateCheckout · Purchase', ga: 'begin_checkout · purchase' },
];

const EventsCard: React.FC = () => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Qué eventos se mandan</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Desde tu página de reservas, sin que toques código. Usalos para armar públicos y medir las conversiones de tus campañas.
      </Typography>
      {EVENTS.map((e) => (
        <Box key={e.title} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ mt: '2px' }}>{e.icon}</Box>
          <Box>
            <Typography variant="body2" fontWeight={600}>{e.title}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
              <Chip size="small" variant="outlined" label={`Meta: ${e.meta}`} />
              <Chip size="small" variant="outlined" label={`GA4: ${e.ga}`} />
            </Box>
          </Box>
        </Box>
      ))}
    </CardContent>
  </Card>
);

const Form: React.FC<{
  pixel: string; ga: string; setPixel?: (v: string) => void; setGa?: (v: string) => void;
  pixelError?: string | null; gaError?: string | null; disabled?: boolean;
}> = ({ pixel, ga, setPixel, setGa, pixelError, gaError, disabled }) => (
  <Card variant="outlined">
    <CardContent sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Píxel de Meta (Facebook e Instagram)</Typography>
        <TextField
          fullWidth
          sx={{ mt: 1 }}
          label="ID del Píxel"
          placeholder="123456789012345"
          value={pixel}
          disabled={disabled}
          onChange={(e) => setPixel?.(e.target.value.replace(/\s/g, ''))}
          error={!!pixelError}
          helperText={pixelError || 'Son solo números (entre 10 y 20 dígitos).'}
          inputProps={{ inputMode: 'numeric' }}
        />
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          Lo encontrás en{' '}
          <Link href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer">
            Meta Events Manager <OpenInNew sx={{ fontSize: 12, verticalAlign: 'middle' }} />
          </Link>{' '}
          → Orígenes de datos → tu píxel → el número que aparece debajo del nombre.
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Google Analytics 4</Typography>
        <TextField
          fullWidth
          sx={{ mt: 1 }}
          label="ID de medición"
          placeholder="G-XXXXXXXXXX"
          value={ga}
          disabled={disabled}
          onChange={(e) => setGa?.(e.target.value.toUpperCase().replace(/\s/g, ''))}
          error={!!gaError}
          helperText={gaError || 'Empieza con G- (ej. G-AB12CD34EF).'}
        />
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          Lo encontrás en{' '}
          <Link href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">
            Google Analytics <OpenInNew sx={{ fontSize: 12, verticalAlign: 'middle' }} />
          </Link>{' '}
          → Administrar → Flujos de datos → tu sitio web → "ID de medición".
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

/** Píxel de Meta y Google Analytics 4 en la página de reservas (plan Pro). */
const TrackingSettings: React.FC = () => {
  const navigate = useNavigate();
  const { subscription, loading: subLoading } = useSubscription();
  const planAllows = subscription?.features ? subscription.features.allowTrackingPixels : null;

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixel, setPixel] = useState('');
  const [ga, setGa] = useState('');
  const [saved, setSaved] = useState({ pixel: '', ga: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState(false);

  useEffect(() => {
    if (subLoading) return;
    if (planAllows === false) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    trackingSettingsApi
      .get()
      .then((r) => {
        setAllowed(r.allowed);
        setPixel(r.metaPixelId ?? '');
        setGa(r.googleAnalyticsId ?? '');
        setSaved({ pixel: r.metaPixelId ?? '', ga: r.googleAnalyticsId ?? '' });
      })
      .catch((e) => {
        if (isPlanLimitError(e)) setAllowed(false);
        else setError(e?.response?.data?.message || 'No se pudo cargar la configuración.');
      })
      .finally(() => setLoading(false));
  }, [subLoading, planAllows]);

  const pixelError = pixel && !PIXEL_RE.test(pixel) ? 'El ID del Píxel son solo números (entre 10 y 20 dígitos).' : null;
  const gaError = ga && !GA_RE.test(ga) ? 'El ID de Google Analytics tiene el formato G-XXXXXXXXXX.' : null;
  const dirty = pixel !== saved.pixel || ga !== saved.ga;

  const save = async () => {
    if (pixelError || gaError) return;
    setSaving(true);
    setError(null);
    try {
      const r = await trackingSettingsApi.update({ metaPixelId: pixel || null, googleAnalyticsId: ga || null });
      setSaved({ pixel: r.metaPixelId ?? '', ga: r.googleAnalyticsId ?? '' });
      setPixel(r.metaPixelId ?? '');
      setGa(r.googleAnalyticsId ?? '');
      setSnack(true);
    } catch (e: any) {
      if (!isPlanLimitError(e)) setError(e?.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton onClick={() => navigate('/settings')}><ArrowBack /></IconButton>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          Píxel y Analytics <Chip label="Nuevo" size="small" sx={{ fontWeight: 700, bgcolor: '#25d366', color: '#fff' }} />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Medí qué campañas de Meta Ads y Google te traen reservas de verdad.
        </Typography>
      </Box>
    </Box>
  );

  if (loading || subLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        {header}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </Container>
    );
  }

  if (allowed === false) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        {header}
        <FeaturePaywall
          includes={(f) => f.allowTrackingPixels}
          fallbackPlanCode="pro_v2"
          fallbackPlanName="Pro"
          icon={<Insights />}
          title="Sabé qué anuncio te trae cada turno"
          description="Pegá el ID de tu Píxel de Meta y de Google Analytics, y tu página de reservas les avisa cada visita, cada reserva y cada seña cobrada."
          bullets={[
            'Optimizá tus campañas de Instagram y Facebook por reservas, no por clics',
            'Armá públicos de quienes miraron y no reservaron',
            'Sin tocar código: se activa con solo pegar el ID',
          ]}
          preview={
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}><Form pixel="123456789012345" ga="G-AB12CD34EF" disabled /></Grid>
              <Grid item xs={12} md={5}><EventsCard /></Grid>
            </Grid>
          }
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {header}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Form pixel={pixel} ga={ga} setPixel={setPixel} setGa={setGa} pixelError={pixelError} gaError={gaError} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
              disabled={saving || !dirty || !!pixelError || !!gaError}
              onClick={save}
            >
              Guardar
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <EventsCard />
          <Alert severity="info" sx={{ mt: 2 }}>
            Para borrar un ID, dejá el campo vacío y guardá. Los cambios se ven en tu página de reservas en unos minutos.
          </Alert>
        </Grid>
      </Grid>
      <Snackbar
        open={snack}
        autoHideDuration={4000}
        onClose={() => setSnack(false)}
        message="Listo, guardamos tu configuración de seguimiento"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default TrackingSettings;
