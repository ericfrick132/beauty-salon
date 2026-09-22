import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Radio,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  AccountBalance,
  AutoAwesome,
  CheckCircle,
  HourglassEmpty,
  Refresh as RefreshIcon,
  Savings,
  WhatsApp,
  Link as LinkIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  featureAddonsApi,
  transferDetectionApi,
  FeatureAddonStatus,
  TransferDetectionStatus,
  PendingIncomingPayment,
  TransferBookingCandidate,
  IncomingPaymentHistoryItem,
  PayerCustomerMapping,
} from '../services/api';

const ADDON_CODE = 'transfer_detection';

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmtBooking = (c: TransferBookingCandidate) => {
  const d = new Date(c.startTime);
  return `${c.serviceName} · ${d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
};

const MATCH_LABELS: Record<string, string> = {
  ninguno: 'Sin identificar',
  monto: 'Coincide el monto',
  ambiguo: 'Varios turnos posibles',
  'posible-duplicado': 'Posible duplicado',
  'mapeo-monto-distinto': 'Cuenta conocida, monto distinto',
  'dni-monto-distinto': 'DNI coincide, monto distinto',
  'nombre-monto-distinto': 'Nombre coincide, monto distinto',
  dni: 'DNI',
  mapeo: 'Cuenta conocida',
  nombre: 'Nombre',
  comprobante: 'Comprobante por WhatsApp',
  manual: 'Asignado a mano',
  'ya-cargado': 'Ya estaba cargado',
  'checkout-propio': 'Cobro del sistema',
};
const matchLabel = (m: string | null) => (m ? MATCH_LABELS[m] ?? m : 'Sin identificar');

const BenefitItem: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0, 158, 227, 0.12)', color: '#009ee3', flexShrink: 0 }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{text}</Typography>
    </Box>
  </Box>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; color: string }> = ({ icon, label, value, sub, color }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}22`, color, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="h6" fontWeight={700}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{label}{sub ? ` · ${sub}` : ''}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const TransferDetection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment');

  const [loading, setLoading] = useState(true);
  const [addon, setAddon] = useState<FeatureAddonStatus | null>(null);
  const [status, setStatus] = useState<TransferDetectionStatus | null>(null);
  const [pending, setPending] = useState<PendingIncomingPayment[]>([]);
  const [history, setHistory] = useState<IncomingPaymentHistoryItem[]>([]);
  const [mappings, setMappings] = useState<PayerCustomerMapping[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [target, setTarget] = useState<PendingIncomingPayment | null>(null);
  const [candidates, setCandidates] = useState<TransferBookingCandidate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const addons = await featureAddonsApi.list();
      const a = addons.find((x) => x.code === ADDON_CODE) || null;
      setAddon(a);
      const s = await transferDetectionApi.status();
      setStatus(s);
      if (s.addonActive) {
        const [p, h, m] = await Promise.all([
          transferDetectionApi.pending(),
          transferDetectionApi.history(30),
          transferDetectionApi.mappings(),
        ]);
        setPending(p); setHistory(h); setMappings(m);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || 'No se pudo cargar la detección de transferencias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (paymentResult === 'success') setToast('¡Pago recibido! El add-on se activa en unos segundos, apenas Mercado Pago nos avisa.');
    else if (paymentResult === 'pending') setToast('Tu pago quedó pendiente en Mercado Pago. Cuando se acredite, el add-on se activa solo.');
    else if (paymentResult === 'failure') setToast('El pago no se completó. Podés intentarlo de nuevo cuando quieras.');
  }, [paymentResult]);

  const handleBuy = async () => {
    setPurchasing(true);
    try {
      const res = await featureAddonsApi.purchase(ADDON_CODE);
      if (res?.paymentLink) window.location.href = res.paymentLink;
      else setError('No se pudo generar el link de pago.');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo generar el link de pago.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await transferDetectionApi.run(3);
      setToast(res.message);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo ejecutar la detección.');
    } finally {
      setRunning(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      const res = await transferDetectionApi.setEnabled(enabled);
      setToast(res.message);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo cambiar el estado.');
    }
  };

  const openResolve = async (item: PendingIncomingPayment) => {
    setTarget(item);
    setSelected(item.suggestedBooking?.bookingId ?? null);
    setRemember(true);
    try {
      const list = await transferDetectionApi.candidates(item.id);
      setCandidates(list);
      if (!item.suggestedBooking) {
        const exact = list.filter((c) => c.amountMatches);
        if (exact.length === 1) setSelected(exact[0].bookingId);
      }
    } catch {
      setCandidates([]);
    }
  };

  const handleResolve = async () => {
    if (!target || !selected) return;
    setSaving(true);
    try {
      const res = await transferDetectionApi.resolve(target.id, selected, remember);
      setToast(res.message);
      setTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  const handleIgnore = async (item: PendingIncomingPayment) => {
    try {
      const res = await transferDetectionApi.ignore(item.id);
      setToast(res.message);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo descartar el cobro.');
    }
  };

  const pendingTotal = useMemo(() => pending.reduce((s, p) => s + p.amount, 0), [pending]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const active = !!status?.addonActive;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Transferencias de Mercado Pago</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tus clientes te transfieren la seña a tu Mercado Pago como siempre. Nosotros leemos los cobros que entran, los cruzamos
        con los turnos pendientes y marcamos la seña como paga, sin comisión por cobro. Si el cliente manda la captura al
        WhatsApp del negocio, le contestamos y le confirmamos por el mismo chat cuando la vemos acreditada.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast(null)} message={toast} />

      {status && !status.mercadoPagoConnected && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate('/mercadopago-settings')}>Conectar Mercado Pago</Button>}>
          {status.blockedReason}
        </Alert>
      )}

      {!active ? (
        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Dejá de revisar comprobantes</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <BenefitItem icon={<AccountBalance />} title="Lee tu Mercado Pago" text="Transferencias al CVU o alias, QR y links de pago. Sin comisión por cobro: usás tu cuenta de siempre." />
                  <BenefitItem icon={<AutoAwesome />} title="Acredita la seña sola" text="Cruza cada cobro con el turno pendiente por DNI, nombre o cuenta conocida y lo marca como pago." />
                  <BenefitItem icon={<WhatsApp />} title="Confirma por WhatsApp" text="Si el cliente manda el comprobante al WhatsApp del negocio, le responde y le confirma cuando lo ve acreditado." />
                  <BenefitItem icon={<CheckCircle />} title="Lo dudoso, a un click" text="Lo que no identifica queda en una lista para asignarlo a mano, y aprende de quién es cada cuenta para la próxima." />
                </Box>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="h4" fontWeight={800}>
                      {addon ? money(addon.monthlyPrice) : '—'} <Typography component="span" color="text.secondary">/ mes</Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Se paga por mes adelantado con Mercado Pago. Sin permanencia.</Typography>
                    {addon?.hasPendingPurchase && <Alert severity="info" sx={{ mt: 2 }}>Tenés un pago pendiente de acreditar en Mercado Pago.</Alert>}
                    <Button variant="contained" fullWidth sx={{ mt: 2 }} disabled={purchasing || !addon || !status?.mercadoPagoConnected} onClick={handleBuy}>
                      {purchasing ? 'Generando link…' : 'Activar con Mercado Pago'}
                    </Button>
                    {!status?.mercadoPagoConnected && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Primero conectá tu cuenta de Mercado Pago: sin eso no podemos leer tus transferencias.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Chip color="success" size="small" label={`Activo hasta ${addon?.paidUntil ? new Date(addon.paidUntil).toLocaleDateString('es-AR') : '—'}`} />
                <Chip size="small" color={status?.mercadoPagoConnected ? 'success' : 'warning'} label={status?.mercadoPagoConnected ? 'Mercado Pago conectado' : 'Mercado Pago sin conectar'} />
                <Chip size="small" color={status?.whatsAppConnected ? 'success' : 'default'} label={status?.whatsAppConnected ? 'Confirma por WhatsApp' : 'WhatsApp sin conectar'} />
                {status?.lastRunAt && <Typography variant="caption" color="text.secondary">Última revisión {fmtDateTime(status.lastRunAt)}</Typography>}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel control={<Switch checked={!!status?.enabled} onChange={(e) => handleToggle(e.target.checked)} />} label={status?.enabled ? 'Detección prendida' : 'Detección apagada'} />
                <Button variant="outlined" startIcon={<RefreshIcon />} disabled={running || !status?.mercadoPagoConnected} onClick={handleRun}>
                  {running ? 'Revisando…' : 'Revisar ahora'}
                </Button>
                <Button variant="text" onClick={handleBuy} disabled={purchasing}>Renovar</Button>
              </Box>
            </CardContent>
          </Card>

          {status && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} md={3}><StatCard icon={<AccountBalance />} label="Cobros detectados (30 d)" value={String(status.detectedLast30)} color="#009ee3" /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={<CheckCircle />} label="Aplicados solos" value={String(status.applied)} sub={money(status.appliedAmount)} color="#2e7d32" /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={<HourglassEmpty />} label="Sin validar" value={String(status.pending)} sub={money(status.pendingAmount)} color="#ed6c02" /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={<Savings />} label="Tiempo ahorrado" value={`${status.minutesSaved} min`} sub="3 min por comprobante (estimado)" color="#7b1fa2" /></Grid>
            </Grid>
          )}

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>Pagos sin validar</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Plata que entró a tu Mercado Pago y no pudimos asociar sola a un turno. Asignala o descartala.{pending.length > 0 ? ` Total: ${money(pendingTotal)}.` : ''}
              </Typography>
              {pending.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>Todo al día: no hay cobros sin identificar.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell><TableCell>Monto</TableCell><TableCell>Pagador</TableCell><TableCell>Motivo</TableCell><TableCell>Sugerencia</TableCell><TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pending.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDateTime(p.dateApproved)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{money(p.amount)}</TableCell>
                          <TableCell>
                            {p.payerName || <em>Sin nombre</em>}
                            <Typography variant="caption" display="block" color="text.secondary">{p.payerDni ? `DNI ${p.payerDni}` : ''}{p.payerDni && p.payerEmail ? ' · ' : ''}{p.payerEmail ?? ''}</Typography>
                            {p.description && <Typography variant="caption" display="block" color="text.secondary"><em>“{p.description}”</em></Typography>}
                          </TableCell>
                          <TableCell><Chip size="small" variant="outlined" label={matchLabel(p.matchType)} /></TableCell>
                          <TableCell>
                            {p.suggestedBooking ? (
                              <>
                                {fmtBooking(p.suggestedBooking)}
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {p.suggestedBooking.customerName ?? 'Sin nombre'} · saldo {money(p.suggestedBooking.outstanding)}{p.suggestedBooking.depositOutstanding ? ` · seña ${money(p.suggestedBooking.depositOutstanding)}` : ''}
                                </Typography>
                              </>
                            ) : '—'}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Button size="small" variant="contained" startIcon={<LinkIcon />} onClick={() => openResolve(p)} sx={{ mr: 1 }}>Asignar</Button>
                            <Button size="small" color="error" onClick={() => handleIgnore(p)}>Descartar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>Lo que hizo el sistema solo (30 días)</Typography>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Todavía no hay movimientos.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Monto</TableCell><TableCell>Pagador</TableCell><TableCell>Resultado</TableCell><TableCell>Turno</TableCell></TableRow></TableHead>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDateTime(h.dateApproved)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{money(h.amount)}</TableCell>
                          <TableCell>{h.payerName || '—'}</TableCell>
                          <TableCell><Chip size="small" color={h.status === 2 ? 'success' : 'default'} variant="outlined" label={`${h.status === 2 ? 'Aplicado' : 'Descartado'} · ${matchLabel(h.matchType)}`} /></TableCell>
                          <TableCell>{h.bookingLabel ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {mappings.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>Cuentas asociadas a clientes</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Los próximos pagos de estas cuentas de Mercado Pago van solos a ese cliente.</Typography>
                {mappings.map((m) => (
                  <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">{m.payerLabel || m.payerKey} <Typography component="span" color="text.secondary">→</Typography> {m.customerName}</Typography>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={async () => { await transferDetectionApi.deleteMapping(m.id); await load(); }}>Quitar</Button>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!target} onClose={() => !saving && setTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>¿De qué turno es este cobro?</DialogTitle>
        <DialogContent dividers>
          {target && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {money(target.amount)} · {fmtDateTime(target.dateApproved)} · {target.payerName || 'sin nombre'}{target.payerDni ? ` · DNI ${target.payerDni}` : ''}
            </Typography>
          )}
          {candidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No hay turnos con saldo pendiente cerca de esa fecha. Si no era una seña, descartá el cobro.</Typography>
          ) : (
            candidates.map((c) => (
              <Box key={c.bookingId} onClick={() => setSelected(c.bookingId)} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1, borderRadius: 1, cursor: 'pointer', border: '1px solid', borderColor: selected === c.bookingId ? 'primary.main' : 'divider', mb: 1 }}>
                <Radio checked={selected === c.bookingId} size="small" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {fmtBooking(c)} {c.amountMatches && <Chip size="small" color="success" label="monto coincide" sx={{ ml: 1 }} />}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.customerName ?? 'Sin nombre'}{c.customerPhone ? ` · ${c.customerPhone}` : ''} · total {money(c.totalPrice)} · pagado {money(c.amountPaid)} · saldo {money(c.outstanding)}{c.depositOutstanding ? ` · seña pendiente ${money(c.depositOutstanding)}` : ''}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <FormControlLabel control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />} label="Recordar esta cuenta para el cliente" />
          <Box>
            <Button onClick={() => setTarget(null)} disabled={saving}>Cancelar</Button>
            <Button variant="contained" onClick={handleResolve} disabled={saving || !selected}>{saving ? 'Registrando…' : 'Registrar pago'}</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransferDetection;
