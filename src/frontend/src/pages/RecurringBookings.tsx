import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, ArrowBack, EventRepeat, Repeat, DeleteOutline, Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTenant } from '../contexts/TenantContext';
import { isPlanLimitError } from '../services/api';
import { BookingSeriesItem, BookingSeriesList, bookingSeriesApi, frequencyLabel } from '../services/planFeaturesApi';
import PlanCheckoutRedirect from '../components/subscription/PlanCheckoutRedirect';
import { openPlanUpsell, PLAN_PRO, usedPercent } from '../utils/plans';
import { checkoutPath } from '../utils/planGates';

const fmtNext = (iso?: string | null) => (iso ? format(new Date(iso), "EEE d/MM 'a las' HH:mm", { locale: es }) : '—');

const SeriesTable: React.FC<{ series: BookingSeriesItem[]; onCancel?: (s: BookingSeriesItem) => void; professionalLabel: string }> = ({ series, onCancel, professionalLabel }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  if (mobile) {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {series.map((s) => (
          <Card key={s.id} variant="outlined">
            <CardContent sx={{ pb: '12px !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography fontWeight={700}>{s.customerName || 'Cliente'}</Typography>
                <Chip size="small" icon={<Repeat sx={{ fontSize: 16 }} />} label={frequencyLabel(s.intervalWeeks)} />
              </Box>
              <Typography variant="body2" color="text.secondary">{s.serviceName} · {s.employeeName}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>Próximo: <b>{fmtNext(s.nextStartTime)}</b></Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Quedan {s.upcomingCount} de {s.occurrences} turnos</Typography>
                {onCancel && <Button size="small" color="error" onClick={() => onCancel(s)}>Cancelar</Button>}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }
  return (
    <TableContainer component={Card} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Cliente</TableCell>
            <TableCell>Servicio</TableCell>
            <TableCell>{professionalLabel}</TableCell>
            <TableCell>Frecuencia</TableCell>
            <TableCell>Próximo turno</TableCell>
            <TableCell align="center">Quedan</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {series.map((s) => (
            <TableRow key={s.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{s.customerName || 'Cliente'}</TableCell>
              <TableCell>{s.serviceName}</TableCell>
              <TableCell>{s.employeeName}</TableCell>
              <TableCell><Chip size="small" icon={<Repeat sx={{ fontSize: 16 }} />} label={frequencyLabel(s.intervalWeeks)} /></TableCell>
              <TableCell sx={{ textTransform: 'capitalize' }}>{fmtNext(s.nextStartTime)}</TableCell>
              <TableCell align="center">{s.upcomingCount} de {s.occurrences}</TableCell>
              <TableCell align="right">
                {onCancel && (
                  <Tooltip title="Cancelar los próximos turnos">
                    <IconButton size="small" color="error" onClick={() => onCancel(s)}><DeleteOutline fontSize="small" /></IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/** Turnos fijos (reservas recurrentes): Advance hasta 10 activos, Pro ilimitados. */
const RecurringBookings: React.FC = () => {
  const navigate = useNavigate();
  const { getTerm } = useTenant();
  const { subscription, loading: subLoading } = useSubscription();
  const featureMax = subscription?.features ? subscription.features.maxRecurringBookings : null;
  const included = featureMax !== 0;

  const [data, setData] = useState<BookingSeriesList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<BookingSeriesItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await bookingSeriesApi.list());
      setError(null);
    } catch (e: any) {
      if (!isPlanLimitError(e)) setError(e?.response?.data?.message || 'No se pudieron cargar los turnos fijos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!subLoading && included) load();
  }, [subLoading, included, load]);

  const max = data?.max ?? featureMax ?? -1;
  const active = data?.series.length ?? 0;
  const atLimit = max > 0 && active >= max;

  const create = () => {
    if (atLimit) {
      openPlanUpsell('recurring_bookings', subscription?.planType || '', subscription?.planName || '', max, active);
      return;
    }
    navigate('/new-booking?repeat=1');
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      const res = await bookingSeriesApi.cancel(toCancel.id);
      setSnack(res.cancelledBookings === 1 ? 'Se canceló 1 turno' : `Se cancelaron ${res.cancelledBookings} turnos`);
      setToCancel(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cancelar el turno fijo.');
    } finally {
      setCancelling(false);
    }
  };

  const header = (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <IconButton onClick={() => navigate('/calendar')}><ArrowBack /></IconButton>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography variant="h4" component="h1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Turnos fijos <Chip label="Nuevo" size="small" sx={{ fontWeight: 700, bgcolor: '#25d366', color: '#fff' }} />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Los clientes que vienen siempre el mismo día y horario, agendados de una sola vez.
        </Typography>
      </Box>
      {included && (
        <Button variant="contained" startIcon={atLimit ? <Lock /> : <Add />} onClick={create} sx={atLimit ? { opacity: 0.6 } : undefined}>
          Nuevo turno fijo
        </Button>
      )}
    </Box>
  );

  // Sin turnos fijos en el plan: directo al checkout (Advance).
  if (!subLoading && !included) return <PlanCheckoutRedirect gate="recurring_bookings" />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {header}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {max > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ py: '12px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2">
                Usás <b>{active} de {max}</b> turnos fijos de tu plan {subscription?.planName}
              </Typography>
              {atLimit && (
                <Button size="small" onClick={() => navigate(checkoutPath('recurring_bookings', PLAN_PRO))}>
                  Ilimitados con Pro
                </Button>
              )}
            </Box>
            <LinearProgress
              variant="determinate"
              value={usedPercent(active, max)}
              color={atLimit ? 'error' : 'primary'}
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
            />
          </CardContent>
        </Card>
      )}

      {loading || subLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : active === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 6, px: 2 }}>
          <EventRepeat color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>Todavía no tenés turnos fijos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 440, mx: 'auto' }}>
            Al crear una reserva elegí "Repetir: cada semana" y se agendan todos los turnos de una.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={create}>Crear el primero</Button>
        </Card>
      ) : (
        <SeriesTable series={data!.series} onCancel={setToCancel} professionalLabel={getTerm('professional')} />
      )}

      <Dialog open={!!toCancel} onClose={() => !cancelling && setToCancel(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Cancelar este turno fijo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Se cancelan los {toCancel?.upcomingCount ?? 0} próximos turnos de {toCancel?.customerName || 'este cliente'} ({toCancel?.serviceName}, {frequencyLabel(toCancel?.intervalWeeks ?? 1)}). Los turnos que ya pasaron quedan como están.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToCancel(null)} disabled={cancelling}>Volver</Button>
          <Button color="error" variant="contained" onClick={confirmCancel} disabled={cancelling}>
            {cancelling ? <CircularProgress size={20} /> : 'Cancelar todos los próximos'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Container>
  );
};

export default RecurringBookings;
