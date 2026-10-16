import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  Drawer,
  IconButton,
  Link,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close,
  Email,
  EventAvailable,
  LocalOffer,
  Repeat,
  WhatsApp,
  PersonSearch,
  Edit,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTenantMoney } from '../../hooks/useTenantMoney';
import { isPlanLimitError } from '../../services/api';
import { CustomerHistory, customerHistoryApi } from '../../services/planFeaturesApi';
import FeaturePaywall from '../subscription/FeaturePaywall';

export interface CustomerSummary {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface Props {
  customer: CustomerSummary | null;
  onClose: () => void;
  onEdit?: (c: CustomerSummary) => void;
  hidePhone?: boolean;
}

const STATUS: Record<string, { label: string; color: 'success' | 'primary' | 'error' | 'warning' | 'default' }> = {
  confirmed: { label: 'Confirmado', color: 'success' },
  completed: { label: 'Atendido', color: 'primary' },
  cancelled: { label: 'Cancelado', color: 'error' },
  pending: { label: 'Pendiente', color: 'warning' },
  no_show: { label: 'Ausente', color: 'default' },
  noshow: { label: 'Ausente', color: 'default' },
};

const waLink = (phone?: string | null) => {
  const digits = (phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
};

const fmtDate = (iso?: string | null, pattern = "d MMM yyyy") => (iso ? format(new Date(iso), pattern, { locale: es }) : '—');

const SAMPLE: CustomerHistory = {
  customer: { id: 'x', firstName: 'Lucía', lastName: 'Fernández', email: 'lucia@mail.com', phone: '+54 9 11 5555 1234', notes: 'Prefiere los turnos de la tarde.' },
  stats: {
    totalBookings: 14, attended: 12, cancelled: 1, noShows: 1, totalSpent: 168000,
    firstVisit: new Date(Date.now() - 200 * 86400000).toISOString(), lastVisit: new Date(Date.now() - 9 * 86400000).toISOString(),
    nextBooking: new Date(Date.now() + 5 * 86400000).toISOString(), avgDaysBetweenVisits: 16, favoriteService: 'Corte y color', favoriteEmployee: 'Sofi',
  },
  bookings: [0, 1, 2].map((i) => ({
    id: `b${i}`, startTime: new Date(Date.now() - (i * 16 + 9) * 86400000).toISOString(), endTime: new Date().toISOString(),
    status: 'completed', price: 14000, serviceId: '', serviceName: i === 1 ? 'Brushing' : 'Corte y color', employeeId: '', employeeName: 'Sofi',
    couponCode: i === 0 ? 'VUELVE15' : null, discountAmount: i === 0 ? 2100 : null, customFields: i === 0 ? [{ fieldId: 'f', label: 'Obra social', value: 'OSDE' }] : [],
  })),
};

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{value}</Typography>
    {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
  </Paper>
);

const Ficha: React.FC<{ data: CustomerHistory; hidePhone?: boolean; professionalLabel: string; onEdit?: () => void }> = ({ data, hidePhone, professionalLabel, onEdit }) => {
  const { formatMoney } = useTenantMoney();
  const { customer: c, stats: s, bookings } = data;
  const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Cliente';
  const wa = waLink(c.phone);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} noWrap>{name}</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
            {!hidePhone && c.phone && (
              wa ? (
                <Link href={wa} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WhatsApp fontSize="small" sx={{ color: '#25d366' }} /> {c.phone}
                </Link>
              ) : <Typography variant="body2">{c.phone}</Typography>
            )}
            {c.email && (
              <Link href={`mailto:${c.email}`} underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Email fontSize="small" /> {c.email}
              </Link>
            )}
          </Box>
        </Box>
        {onEdit && <Button size="small" startIcon={<Edit />} onClick={onEdit}>Editar</Button>}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1, mt: 2 }}>
        <Stat label="Turnos" value={s.totalBookings} hint={s.firstVisit ? `Desde ${fmtDate(s.firstVisit, 'MMM yyyy')}` : undefined} />
        <Stat label="Asistencias" value={s.attended} />
        <Stat label="Cancelados / ausentes" value={`${s.cancelled} / ${s.noShows}`} />
        <Stat label="Total gastado" value={formatMoney(s.totalSpent)} />
        <Stat label="Viene cada" value={s.avgDaysBetweenVisits != null ? `${Math.round(s.avgDaysBetweenVisits)} días` : '—'} hint={s.lastVisit ? `Última: ${fmtDate(s.lastVisit, 'd MMM')}` : undefined} />
        <Stat label="Próximo turno" value={s.nextBooking ? fmtDate(s.nextBooking, 'EEE d/MM') : '—'} hint={s.nextBooking ? fmtDate(s.nextBooking, 'HH:mm') : undefined} />
      </Box>

      {(s.favoriteService || s.favoriteEmployee) && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          {s.favoriteService && <Chip size="small" label={`Servicio preferido: ${s.favoriteService}`} />}
          {s.favoriteEmployee && <Chip size="small" label={`${professionalLabel} preferido: ${s.favoriteEmployee}`} />}
        </Box>
      )}

      {c.notes && (
        <Alert severity="info" icon={false} sx={{ mt: 2 }}>
          <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>Notas</Typography>
          {c.notes}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Historial de turnos</Typography>
      {bookings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Todavía no tiene turnos.</Typography>
      ) : (
        <Box sx={{ position: 'relative', pl: 2.5 }}>
          <Box sx={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, bgcolor: 'divider' }} />
          {bookings.map((b) => {
            const st = STATUS[b.status] ?? { label: b.status, color: 'default' as const };
            return (
              <Box key={b.id} sx={{ position: 'relative', mb: 2 }}>
                <Box sx={{ position: 'absolute', left: -20, top: 6, width: 12, height: 12, borderRadius: '50%', bgcolor: st.color === 'default' ? 'grey.500' : `${st.color}.main`, border: '2px solid', borderColor: 'background.paper' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                  <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                    {fmtDate(b.startTime, "EEE d MMM yyyy · HH:mm")}
                  </Typography>
                  <Chip size="small" label={st.label} color={st.color} />
                </Box>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {b.serviceName} · {b.employeeName}
                  {b.seriesId && <Repeat sx={{ fontSize: 16 }} color="action" titleAccess="Turno fijo" />}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 0.25 }}>
                  {b.price != null && <Typography variant="caption" color="text.secondary">{formatMoney(b.price)}</Typography>}
                  {b.couponCode && (
                    <Chip size="small" variant="outlined" icon={<LocalOffer sx={{ fontSize: 14 }} />}
                      label={`${b.couponCode}${b.discountAmount ? ` -${formatMoney(b.discountAmount)}` : ''}`} />
                  )}
                </Box>
                {b.customFields?.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    {b.customFields.map((f) => (
                      <Typography key={f.fieldId} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {f.label}: <b>{f.value}</b>
                      </Typography>
                    ))}
                  </Box>
                )}
                {b.notes && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>{b.notes}</Typography>}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

/**
 * Ficha del cliente (plan Pro): drawer a la derecha en desktop, pantalla completa en el celular. Sin el plan se
 * muestra una ficha de ejemplo borrosa con el paywall; el endpoint solo se pide si el plan lo incluye, así no
 * salta el diálogo global de límite con solo abrir un cliente.
 */
const CustomerHistoryDrawer: React.FC<Props> = ({ customer, onClose, onEdit, hidePhone }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { getTerm } = useTenant();
  const { subscription } = useSubscription();
  const allowed = subscription?.features ? subscription.features.allowCustomerHistory : false;

  const [data, setData] = useState<CustomerHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    setLocked(false);
    if (!customer || !allowed) return;
    let cancelled = false;
    setLoading(true);
    customerHistoryApi
      .get(customer.id)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => {
        if (cancelled) return;
        if (isPlanLimitError(e)) setLocked(true);
        else setError(e?.response?.data?.message || 'No se pudo cargar la ficha.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customer, allowed]);

  const open = !!customer;
  const showPaywall = !allowed || locked;
  const professionalLabel = getTerm('professional');

  // Sin plan: los datos básicos del cliente (los tiene igual) + la ficha de ejemplo para vender el historial.
  const sample: CustomerHistory = customer
    ? { ...SAMPLE, customer: { ...SAMPLE.customer, firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone, notes: customer.notes } }
    : SAMPLE;

  const body = (
    <Box sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PersonSearch fontSize="small" /> Ficha de {getTerm('customer').toLowerCase()}
        </Typography>
        <IconButton aria-label="Cerrar" onClick={onClose}><Close /></IconButton>
      </Box>
      {showPaywall ? (
        <FeaturePaywall
          dense
          includes={(f) => f.allowCustomerHistory}
          fallbackPlanCode="pro_v2"
          fallbackPlanName="Pro"
          icon={<PersonSearch />}
          title="Conocé a cada cliente de un vistazo"
          description="Cuántas veces vino, cuánto gastó, cada cuántos días vuelve y qué servicio y profesional prefiere, con todo su historial de turnos."
          bullets={['Estadísticas de cada cliente', 'Historial completo con cupones y respuestas del formulario', 'WhatsApp a un clic']}
          preview={<Ficha data={sample} hidePhone={hidePhone} professionalLabel={professionalLabel} />}
        />
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data ? (
        <Ficha data={data} hidePhone={hidePhone} professionalLabel={professionalLabel} onEdit={onEdit && customer ? () => onEdit(customer) : undefined} />
      ) : null}
      {!showPaywall && data && data.stats.nextBooking == null && (
        <Alert severity="info" icon={<EventAvailable />} sx={{ mt: 2 }}>No tiene turnos próximos.</Alert>
      )}
    </Box>
  );

  if (mobile) {
    return <Dialog fullScreen open={open} onClose={onClose}>{body}</Dialog>;
  }
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 520, maxWidth: '100%' } }}>
      {body}
    </Drawer>
  );
};

export default CustomerHistoryDrawer;
