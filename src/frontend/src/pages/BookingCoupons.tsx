import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Block, Edit, LocalOffer, WhatsApp } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TextField from '../components/common/TextField';
import FeaturePaywall from '../components/subscription/FeaturePaywall';
import { isPlanLimitError } from '../services/api';
import {
  BookingCoupon,
  BookingCouponInput,
  bookingCouponsApi,
  CouponDiscountType,
  normalizeCouponCode,
} from '../services/bookingExtrasApi';
import { useTenantMoney } from '../hooks/useTenantMoney';
import { useTenantWording } from '../utils/wording';

interface FormState {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number | '';
  maxUses: number | '';
  /** yyyy-MM-dd (fecha local); vence al final de ese día. */
  expiresOn: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: 15,
  maxUses: '',
  expiresOn: '',
  isActive: true,
};

const toLocalDateInput = (iso: string | null) => (iso ? format(new Date(iso), 'yyyy-MM-dd') : '');

/** Fin del día elegido en la hora del navegador, en UTC (el backend compara contra UtcNow). */
const endOfDayIso = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
};

type CouponState = 'active' | 'inactive' | 'expired' | 'exhausted';

const couponState = (c: BookingCoupon): CouponState => {
  if (!c.isActive) return 'inactive';
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'expired';
  if (c.maxUses != null && c.usedCount >= c.maxUses) return 'exhausted';
  return 'active';
};

const STATE_CHIP: Record<CouponState, { label: string; color: 'success' | 'default' | 'warning' }> = {
  active: { label: 'Activo', color: 'success' },
  inactive: { label: 'Desactivado', color: 'default' },
  expired: { label: 'Vencido', color: 'warning' },
  exhausted: { label: 'Agotado', color: 'warning' },
};

const SAMPLE_COUPONS: BookingCoupon[] = [
  { id: 's1', code: 'VUELVE15', description: 'Clientes que no vienen hace 2 meses', discountType: 'percent', discountValue: 15, maxUses: null, usedCount: 12, expiresAt: null, isActive: true, createdAt: '', updatedAt: '' },
  { id: 's2', code: 'PRIMERAVEZ', description: 'Para nuevos clientes de Instagram', discountType: 'fixed', discountValue: 2000, maxUses: 50, usedCount: 18, expiresAt: null, isActive: true, createdAt: '', updatedAt: '' },
  { id: 's3', code: 'MARTES20', description: 'Llenar los martes a la tarde', discountType: 'percent', discountValue: 20, maxUses: 10, usedCount: 3, expiresAt: null, isActive: true, createdAt: '', updatedAt: '' },
];

const BookingCoupons: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { formatMoney, currencySymbol } = useTenantMoney();
  const w = useTenantWording();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [coupons, setCoupons] = useState<BookingCoupon[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookingCoupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<BookingCoupon | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await bookingCouponsApi.list();
      setAllowed(data.allowed);
      setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
    } catch {
      setLoadError('No pudimos cargar tus cupones. Probá de nuevo en un rato.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const discountLabel = (c: Pick<BookingCoupon, 'discountType' | 'discountValue'>) =>
    c.discountType === 'percent' ? `${c.discountValue}%` : formatMoney(c.discountValue);

  const usesLabel = (c: BookingCoupon) => (c.maxUses != null ? `${c.usedCount}/${c.maxUses}` : `${c.usedCount} · sin tope`);

  const expiryLabel = (c: BookingCoupon) =>
    c.expiresAt ? format(new Date(c.expiresAt), "d MMM yyyy", { locale: es }) : 'No vence';

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (c: BookingCoupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description ?? '',
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxUses: c.maxUses ?? '',
      expiresOn: toLocalDateInput(c.expiresAt),
      isActive: c.isActive,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const validateForm = (): string | null => {
    const code = normalizeCouponCode(form.code);
    if (code.length < 3 || code.length > 40) return 'El código tiene que tener entre 3 y 40 caracteres.';
    const value = Number(form.discountValue);
    if (!value || value <= 0) return 'El descuento tiene que ser mayor a 0.';
    if (form.discountType === 'percent' && value > 100) return 'El porcentaje no puede pasar de 100.';
    if (form.maxUses !== '' && Number(form.maxUses) < 1) return 'El tope de usos tiene que ser al menos 1.';
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    const body: BookingCouponInput = {
      code: normalizeCouponCode(form.code),
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxUses: form.maxUses === '' ? null : Math.floor(Number(form.maxUses)),
      expiresAt: form.expiresOn ? endOfDayIso(form.expiresOn) : null,
      isActive: form.isActive,
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await bookingCouponsApi.update(editing.id, body);
      else await bookingCouponsApi.create(body);
      setDialogOpen(false);
      setToast(editing ? 'Cupón actualizado' : `Cupón ${body.code} creado. Ya lo pueden usar al reservar.`);
      load();
    } catch (err: any) {
      if (isPlanLimitError(err)) {
        setDialogOpen(false);
        return;
      }
      setFormError(err?.response?.data?.message || 'No pudimos guardar el cupón.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!toDeactivate) return;
    try {
      await bookingCouponsApi.deactivate(toDeactivate.id);
      setToast(`Cupón ${toDeactivate.code} desactivado`);
      load();
    } catch {
      setToast('No pudimos desactivar el cupón.');
    } finally {
      setToDeactivate(null);
    }
  };

  const shareText = (c: BookingCoupon) =>
    w.t(
      `Usá el código ${c.code} al reservar tu turno y tenés ${discountLabel(c)} de descuento.`,
      `Usa el código ${c.code} al reservar tu cita y tienes ${discountLabel(c)} de descuento.`,
    );

  const renderList = (list: BookingCoupon[], readOnly = false) => {
    if (isMobile) {
      return (
        <Stack spacing={1.5}>
          {list.map((c) => {
            const st = STATE_CHIP[couponState(c)];
            return (
              <Card key={c.id} variant="outlined">
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem' }}>{c.code}</Typography>
                    <Chip size="small" label={st.label} color={st.color} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="primary">-{discountLabel(c)}</Typography>
                  {c.description && <Typography variant="body2" color="text.secondary">{c.description}</Typography>}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Usos: {usesLabel(c)} · Vence: {expiryLabel(c)}
                  </Typography>
                  {!readOnly && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
                      <IconButton size="small" aria-label="Compartir por WhatsApp" component="a" target="_blank" rel="noopener noreferrer"
                        href={`https://wa.me/?text=${encodeURIComponent(shareText(c))}`}>
                        <WhatsApp fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Editar" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton>
                      {c.isActive && (
                        <IconButton size="small" aria-label="Desactivar" onClick={() => setToDeactivate(c)}><Block fontSize="small" /></IconButton>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      );
    }
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descuento</TableCell>
              <TableCell>Usos</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((c) => {
              const st = STATE_CHIP[couponState(c)];
              return (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</Typography>
                    {c.description && <Typography variant="caption" color="text.secondary">{c.description}</Typography>}
                  </TableCell>
                  <TableCell><Typography fontWeight={600}>{discountLabel(c)}</Typography></TableCell>
                  <TableCell>{usesLabel(c)}</TableCell>
                  <TableCell>{expiryLabel(c)}</TableCell>
                  <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {!readOnly && (
                      <>
                        <Tooltip title="Compartir por WhatsApp">
                          <IconButton size="small" component="a" target="_blank" rel="noopener noreferrer"
                            href={`https://wa.me/?text=${encodeURIComponent(shareText(c))}`}>
                            <WhatsApp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton></Tooltip>
                        {c.isActive && (
                          <Tooltip title="Desactivar"><IconButton size="small" onClick={() => setToDeactivate(c)}><Block fontSize="small" /></IconButton></Tooltip>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const header = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>Cupones de descuento</Typography>
        <Typography variant="body2" color="text.secondary">
          Códigos que tus clientes cargan al reservar online. El descuento se aplica solo al precio y a la seña.
        </Typography>
      </Box>
      {allowed && coupons.length > 0 && (
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ flexShrink: 0 }}>
          Nuevo cupón
        </Button>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {header}
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {!allowed ? (
        <FeaturePaywall
          title="Llená huecos de la agenda con cupones"
          description="Creá un código como VUELVE15 y compartilo por WhatsApp o Instagram: tus clientes lo cargan al reservar y el descuento se aplica solo, también a la seña."
          bullets={[
            'Porcentaje o monto fijo, con tope de usos y fecha de vencimiento',
            'Se valida al reservar: nadie usa un código vencido o agotado',
            'Ves cuántas veces se usó cada cupón',
          ]}
          includes={(f) => !!f.allowCoupons}
        >
          {renderList(coupons.length > 0 ? coupons : SAMPLE_COUPONS, true)}
        </FeaturePaywall>
      ) : coupons.length === 0 && !loadError ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: { xs: 4, sm: 6 }, px: 2 }}>
          <LocalOffer color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>Todavía no tenés cupones</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3 }}>
            Creá un código como VUELVE15 y compartilo por WhatsApp o Instagram: tus clientes lo cargan al reservar y el
            descuento se aplica solo, también a la seña.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Crear mi primer cupón</Button>
        </Card>
      ) : (
        renderList(coupons)
      )}

      {/* Crear / editar */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editing ? `Editar ${editing.code}` : 'Nuevo cupón'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Código"
              fullWidth
              autoFocus={!editing}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: normalizeCouponCode(e.target.value) })}
              inputProps={{ maxLength: 40, style: { fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' } }}
              helperText="Se guarda en mayúsculas y sin espacios. Ej: VUELVE15"
            />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Tipo de descuento</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                color="primary"
                value={form.discountType}
                onChange={(_, v: CouponDiscountType | null) => v && setForm({ ...form, discountType: v })}
              >
                <ToggleButton value="percent">Porcentaje</ToggleButton>
                <ToggleButton value="fixed">Monto fijo</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <TextField
              label="Descuento"
              type="number"
              fullWidth
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value === '' ? '' : Number(e.target.value) })}
              InputProps={
                form.discountType === 'percent'
                  ? { endAdornment: <InputAdornment position="end">%</InputAdornment> }
                  : { startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment> }
              }
              inputProps={{ min: 0, max: form.discountType === 'percent' ? 100 : undefined, step: 'any' }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Tope de usos (opcional)"
                type="number"
                fullWidth
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value === '' ? '' : Number(e.target.value) })}
                inputProps={{ min: 1, step: 1 }}
                helperText="Vacío = sin tope"
              />
              <TextField
                label="Vence (opcional)"
                type="date"
                fullWidth
                value={form.expiresOn}
                onChange={(e) => setForm({ ...form, expiresOn: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText={form.expiresOn ? 'Vale hasta el final de ese día' : 'Vacío = no vence'}
              />
            </Stack>
            <TextField
              label="Descripción (opcional, solo la ves vos)"
              fullWidth
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              inputProps={{ maxLength: 200 }}
              placeholder="Ej: campaña de Instagram de octubre"
            />
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
              label={form.isActive ? 'Activo: se puede usar al reservar' : 'Desactivado: no se puede usar'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cupón'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar desactivación */}
      <Dialog open={!!toDeactivate} onClose={() => setToDeactivate(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Desactivar {toDeactivate?.code}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tus clientes no lo van a poder usar más al reservar. Las reservas que ya lo usaron conservan su descuento.
            Lo podés volver a activar editándolo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDeactivate(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDeactivate}>Desactivar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </Box>
  );
};

export default BookingCoupons;
