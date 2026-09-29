import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Paper, Select, Stack, Step, StepContent,
  Snackbar, StepLabel, Stepper, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import {
  invoicingService, invoicingError,
  type Emitter, type FiscalSummary, type SaleRow, type InvoicingStatus, type MonotributoSummary,
  type SaleInvoiceStatus, type TaxConditionCode, type VatSummary,
} from '../services/invoicingService';

/**
 * Facturación electrónica (ARCA): cobros de turnos y ventas con su comprobante (todas tildadas: se destilda
 * lo que no va y se factura el resto), tope del monotributo o IVA del mes, y conexión con ARCA.
 */

const money = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Toast = { showSuccess: (m: string) => void; showError: (m: string) => void };
const ToastContext = createContext<Toast>({ showSuccess: () => {}, showError: () => {} });
const useToast = () => useContext(ToastContext);
const monthLabel = (ym: string, opts: Intl.DateTimeFormatOptions = { month: 'short' }) =>
  new Date(`${ym}-15T12:00:00`).toLocaleDateString('es-AR', opts);

const STATUS: Record<SaleInvoiceStatus, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
  none: { label: 'Sin facturar', color: 'default' },
  queued: { label: 'En cola', color: 'info' },
  processing: { label: 'Emitiendo…', color: 'info' },
  authorized: { label: 'Facturada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'error' },
  error: { label: 'Error', color: 'error' },
  credited: { label: 'Anulada', color: 'default' },
};

const invoiceable = (r: SaleRow) => r.invoiceStatus === 'none' || r.invoiceStatus === 'rejected' || r.invoiceStatus === 'error';

type TabKey = 'sales' | 'summary' | 'settings';

function useConfirm() {
  const [state, setState] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = (text: string) => new Promise<boolean>((resolve) => setState({ text, resolve }));
  const dialog = (
    <Dialog open={!!state} onClose={() => { state?.resolve(false); setState(null); }}>
      <DialogContent><DialogContentText>{state?.text}</DialogContentText></DialogContent>
      <DialogActions>
        <Button onClick={() => { state?.resolve(false); setState(null); }}>Cancelar</Button>
        <Button variant="contained" onClick={() => { state?.resolve(true); setState(null); }}>Confirmar</Button>
      </DialogActions>
    </Dialog>
  );
  return { confirm, dialog };
}

const InvoicingPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<InvoicingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<TabKey | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const s = await invoicingService.status();
      setStatus(s);
      setInitialTab((t) => t ?? (s.emitter?.readyToInvoice ? 'sales' : 'settings'));
    } catch (e) {
      setError(invoicingError(e, 'No se pudo cargar la facturación'));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ready = !!status?.emitter?.readyToInvoice;
  const configured = !!status?.emitter;
  const tab: TabKey = (params.get('tab') as TabKey | null) ?? initialTab ?? 'sales';

  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const toast = useMemo<Toast>(() => ({
    showSuccess: (message) => setSnack({ message, severity: 'success' }),
    showError: (message) => setSnack({ message, severity: 'error' }),
  }), []);

  return (
    <ToastContext.Provider value={toast}>
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h4" fontWeight={700}>Facturación</Typography>
        {status?.emitter && (
          <Chip color={ready ? 'success' : 'warning'} variant="outlined"
            label={ready ? `ARCA conectado · PV ${status.emitter.pointOfSale}` : 'Falta conectar ARCA'} />
        )}
      </Stack>

      {error ? <Alert severity="error">{error}</Alert>
        : !status ? <Box py={6} textAlign="center"><CircularProgress /></Box>
        : !status.platformEnabled ? <Alert severity="info">La facturación electrónica todavía no está habilitada. Escribinos y la activamos para tu negocio.</Alert>
        : (
          <>
            <Tabs value={tab} onChange={(_, v: TabKey) => setParams(v === 'sales' ? {} : { tab: v })} sx={{ mb: 3 }}>
              <Tab value="sales" label="Ventas" />
              <Tab value="summary" label={status.emitter?.taxCondition === 'responsable_inscripto' ? 'IVA del mes' : 'Tope del monotributo'} disabled={!configured} />
              <Tab value="settings" label={ready ? 'Configuración' : 'Conectar ARCA'} />
            </Tabs>
            {tab === 'sales' && <SalesTab ready={ready} autoInvoice={status.autoInvoice} />}
            {tab === 'summary' && configured && <SummaryTab />}
            {tab === 'settings' && <SettingsTab status={status} onChanged={load} />}
          </>
        )}
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(null)}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
    </ToastContext.Provider>
  );
};

// ── Ventas ─────────────────────────────────────────────────────────────────

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function periodFor(preset: Preset, custom: { from: string; to: string }) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const d = (offset: number) => { const x = new Date(today); x.setDate(x.getDate() + offset); return toLocalDateStr(x); };
  switch (preset) {
    case 'today': return { from: d(0), to: d(0) };
    case 'yesterday': return { from: d(-1), to: d(-1) };
    case 'week': return { from: d(-((today.getDay() + 6) % 7)), to: d(0) };
    case 'month': return { from: toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), to: d(0) };
    default: return custom;
  }
}

const SalesTab: React.FC<{ ready: boolean; autoInvoice: boolean }> = ({ ready, autoInvoice }) => {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [preset, setPreset] = useState<Preset>('today');
  const [custom, setCustom] = useState(() => periodFor('week', { from: '', to: '' }));
  const period = useMemo(() => periodFor(preset, custom), [preset, custom]);
  const [rows, setRows] = useState<SaleRow[] | null>(null);
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (silent = false) => {
    try { setRows(await invoicingService.sales(period.from, period.to)); }
    catch (e) { if (!silent) toast.showError(invoicingError(e, 'No se pudieron cargar las ventas')); }
  }, [period.from, period.to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setUnchecked(new Set()); setRows(null); load(); }, [load]);

  const inFlight = rows?.some((r) => r.invoiceStatus === 'queued' || r.invoiceStatus === 'processing') ?? false;
  useEffect(() => {
    if (!inFlight) return;
    timer.current = setTimeout(async () => { try { await invoicingService.sync(); } catch { /* sync automático */ } load(true); }, 4000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [inFlight, rows, load]);

  const pending = rows?.filter(invoiceable) ?? [];
  const selected = pending.filter((r) => !unchecked.has(r.key));
  const selectedTotal = selected.reduce((s, r) => s + r.amount, 0);
  const allChecked = pending.length > 0 && selected.length === pending.length;
  const sum = (f: (r: SaleRow) => boolean) => (rows ?? []).filter(f).reduce((s, r) => s + r.amount, 0);

  const toggle = (key: string) => setUnchecked((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const invoiceSelected = async () => {
    if (!(await confirm(`¿Facturar ${selected.length} venta${selected.length === 1 ? '' : 's'} por ${money(selectedTotal)} a Consumidor Final?`))) return;
    setBusy(true);
    try {
      const r = await invoicingService.invoice(selected.map((s) => s.key));
      if (r.failed > 0) toast.showError(`${r.queued} en camino, ${r.failed} con error: ${r.errors[0] ?? ''}`);
      else toast.showSuccess(`${r.queued} comprobante${r.queued === 1 ? '' : 's'} en camino a ARCA`);
      setUnchecked(new Set());
      load(true);
    } catch (e) { toast.showError(invoicingError(e, 'No se pudo facturar')); }
    finally { setBusy(false); }
  };

  const openPdf = async (r: SaleRow) => {
    if (!r.electronicInvoiceId) return;
    try {
      const url = URL.createObjectURL(await invoicingService.pdf(r.electronicInvoiceId));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { toast.showError(invoicingError(e, 'No se pudo abrir el PDF')); }
  };

  const creditNote = async (r: SaleRow) => {
    if (!r.electronicInvoiceId) return;
    if (!(await confirm(`¿Anular ${r.voucherName} ${r.fullNumber} con una nota de crédito por ${money(r.amount)}?`))) return;
    try {
      await invoicingService.creditNote(r.electronicInvoiceId, 'Anulación de la venta');
      toast.showSuccess('Nota de crédito en camino a ARCA');
      load(true);
    } catch (e) { toast.showError(invoicingError(e, 'No se pudo anular')); }
  };

  const exportCsv = () => {
    const lines = [['Fecha', 'Detalle', 'Cliente', 'Medio', 'Monto', 'Estado', 'Comprobante'],
      ...(rows ?? []).map((r) => [r.when, r.description, r.customerName ?? '', r.method, String(r.amount).replace('.', ','),
        STATUS[r.invoiceStatus].label, r.fullNumber ? `${r.voucherName} ${r.fullNumber}` : ''])];
    const csv = lines.map((l) => l.map((c) => (/[";\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `ventas-${period.from}-a-${period.to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Hoy' }, { key: 'yesterday', label: 'Ayer' }, { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mes' }, { key: 'custom', label: 'Elegir días' },
  ];

  return (
    <Stack spacing={2}>
      {dialog}
      {autoInvoice && <Alert severity="success">La facturación automática está prendida: cada turno cobrado y venta nueva se factura sola. Acá facturás las anteriores o reintentás las que fallaron.</Alert>}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {presets.map((p) => (
              <Button key={p.key} size="small" variant={preset === p.key ? 'contained' : 'outlined'} onClick={() => setPreset(p.key)}>{p.label}</Button>
            ))}
            {preset === 'custom' && (
              <>
                <TextField type="date" size="small" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
                <TextField type="date" size="small" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
              </>
            )}
          </Stack>
          <Button variant="outlined" onClick={exportCsv} disabled={!rows?.length}>Exportar a Excel</Button>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {[
          { label: 'Ventas del período', value: String(rows?.length ?? 0), sub: money(sum(() => true)) },
          { label: 'Facturado', value: money(sum((r) => r.invoiceStatus === 'authorized')), color: 'success.main' },
          { label: 'Sin facturar', value: money(sum(invoiceable)), color: 'warning.main' },
          { label: 'Seleccionadas', value: String(selected.length), sub: money(selectedTotal), color: 'primary.main' },
        ].map((k) => (
          <Grid item xs={6} md={3} key={k.label}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">{k.label}</Typography>
              <Typography variant="h6" fontWeight={700} color={k.color}>{k.value}</Typography>
              {k.sub && <Typography variant="caption" color="text.secondary">{k.sub}</Typography>}
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allChecked} indeterminate={selected.length > 0 && !allChecked} disabled={pending.length === 0}
                    onChange={() => setUnchecked(allChecked ? new Set(pending.map((r) => r.key)) : new Set())} />
                </TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Cliente</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Medio</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Factura</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {!rows ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay cobros en este período.</TableCell></TableRow>
              ) : rows.map((r) => {
                const can = invoiceable(r);
                const checked = can && !unchecked.has(r.key);
                return (
                  <TableRow key={r.key} hover={can} onClick={() => can && toggle(r.key)} sx={{ cursor: can ? 'pointer' : 'default', opacity: can && !checked ? 0.6 : 1 }}>
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={checked} disabled={!can} onChange={() => toggle(r.key)} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.when}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{r.customerName ?? '—'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>{r.method}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{money(r.amount)}</TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS[r.invoiceStatus].color} label={STATUS[r.invoiceStatus].label} title={r.error ?? undefined} />
                      {r.fullNumber && <Typography variant="caption" display="block" color="text.secondary">{r.voucherName} {r.fullNumber}</Typography>}
                      {r.error && can && <Typography variant="caption" display="block" color="error.main">{r.error}</Typography>}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      {r.invoiceStatus === 'authorized' && (
                        <>
                          <Button size="small" onClick={() => openPdf(r)}>PDF</Button>
                          <Button size="small" color="inherit" onClick={() => creditNote(r)}>Anular</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {pending.length > 0 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}
            sx={{ p: 2, borderTop: 1, borderColor: 'divider', position: 'sticky', bottom: 0, bgcolor: 'background.paper' }}>
            <Typography variant="body2"><b>{selected.length}</b> de {pending.length} sin facturar seleccionadas · <b>{money(selectedTotal)}</b> · a Consumidor Final</Typography>
            <Button variant="contained" onClick={invoiceSelected} disabled={!ready || busy || selected.length === 0}>
              {busy ? 'Enviando…' : `Facturar ${selected.length} seleccionada${selected.length === 1 ? '' : 's'}`}
            </Button>
          </Stack>
        )}
      </Paper>
      {!ready && pending.length > 0 && <Alert severity="warning">Para facturar, primero terminá de conectar ARCA en la pestaña Conectar ARCA.</Alert>}
    </Stack>
  );
};

// ── Resumen fiscal ─────────────────────────────────────────────────────────

const SummaryTab: React.FC = () => {
  const [data, setData] = useState<FiscalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setError(null); setData(await invoicingService.summary()); } catch (e) { setError(invoicingError(e, 'No se pudo cargar el resumen')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box py={6} textAlign="center"><CircularProgress /></Box>;
  if (data.monotributo) return <Monotributo s={data.monotributo} onSaved={load} />;
  if (data.vat) return <Vat s={data.vat} onSaved={load} />;
  return <Alert severity="info">Los emisores exentos no tienen tope de monotributo ni IVA a pagar.</Alert>;
};

const LEVEL_COLOR = { ok: '#84cc16', warning: '#f59e0b', danger: '#f97316', exceeded: '#ef4444' } as const;
const LEVEL_SEVERITY = { ok: 'success', warning: 'warning', danger: 'warning', exceeded: 'error' } as const;

const Donut: React.FC<{ percent: number; color: string; children: React.ReactNode }> = ({ percent, color, children }) => {
  const theme = useTheme();
  const r = 70; const c = 2 * Math.PI * r; const used = Math.min(100, Math.max(0, percent));
  return (
    <Box sx={{ position: 'relative', width: 190, height: 190, flexShrink: 0 }}>
      <svg viewBox="0 0 180 180" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke={theme.palette.divider} strokeWidth="22" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="22" strokeDasharray={`${(used / 100) * c} ${c}`} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {children}
      </Box>
    </Box>
  );
};

const Monotributo: React.FC<{ s: MonotributoSummary; onSaved: () => void }> = ({ s, onSaved }) => {
  const toast = useToast();
  const [month, setMonth] = useState(s.months[s.months.length - 1]?.month ?? '');
  const [external, setExternal] = useState('');
  const max = Math.max(1, ...s.months.map((m) => m.total));
  const save = async () => {
    try {
      await invoicingService.savePeriod(month, { externalBilled: Number(external.replace(/\./g, '').replace(',', '.')) || 0 });
      setExternal(''); onSaved();
    } catch (e) { toast.showError(invoicingError(e, 'No se pudo guardar')); }
  };
  const stat = (label: string, value: string, sub?: string, color?: string) => (
    <Grid item xs={6} md={3}><Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography fontWeight={700} color={color}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper></Grid>
  );
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
          <Donut percent={s.usedPercent ?? 0} color={LEVEL_COLOR[s.level]}>
            {s.annualCap ? (<><Typography variant="h4" fontWeight={800} sx={{ color: LEVEL_COLOR[s.level] }}>{(s.usedPercent ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%</Typography>
              <Typography variant="caption" color="text.secondary">del tope anual</Typography></>)
              : <Typography variant="caption" color="text.secondary" px={4}>Cargá la categoría en Conectar ARCA</Typography>}
          </Donut>
          <Box flex={1} width="100%">
            <Typography variant="h6" fontWeight={700}>Monotributo {s.category ? `— categoría ${s.category}` : ''}
              {s.annualCap && <Typography component="span" variant="body2" color="text.secondary"> · tope {money(s.annualCap)} en 12 meses</Typography>}</Typography>
            <Grid container spacing={1.5} my={1}>
              {stat('Facturado (12 meses)', money(s.billedLast12Months))}
              {stat('Te queda', s.remaining != null ? money(Math.max(0, s.remaining)) : '—', undefined, s.remaining != null && s.remaining < 0 ? 'error.main' : 'success.main')}
              {stat('Promedio mensual', money(s.monthlyAverage))}
              {stat('Al ritmo actual', money(s.projectedAnnual), s.categoryForProjection ? `categoría ${s.categoryForProjection}` : 'supera la K')}
            </Grid>
            <Alert severity={LEVEL_SEVERITY[s.level]}>{s.advice}</Alert>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Próxima recategorización: {monthLabel(s.nextRecategorization.slice(0, 7), { month: 'long', year: 'numeric' })}.
              {s.tableValidFrom && ` Topes de ARCA vigentes desde ${new Date(`${s.tableValidFrom}T12:00:00`).toLocaleDateString('es-AR')}.`}
            </Typography>
          </Box>
        </Stack>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography fontWeight={700} mb={2}>Últimos 12 meses</Typography>
        <Stack direction="row" alignItems="flex-end" spacing={0.75} sx={{ height: 170 }}>
          {s.months.map((m) => (
            <Stack key={m.month} flex={1} alignItems="center" justifyContent="flex-end" sx={{ height: '100%' }} title={`${m.month}: ${money(m.total)}`}>
              <Box sx={{ width: '100%', height: `${(m.total / max) * 100}%`, minHeight: m.total ? 3 : 0, display: 'flex', flexDirection: 'column', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'info.main', height: `${m.total ? (m.external / m.total) * 100 : 0}%` }} />
                <Box sx={{ bgcolor: 'success.main', flex: 1 }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{monthLabel(m.month)}</Typography>
            </Stack>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">Verde: facturado desde TurnosPro · Azul: facturado por fuera</Typography>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography fontWeight={700}>¿Facturaste también por fuera?</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>Si hiciste facturas desde otro sistema o desde la web de ARCA, cargalas por mes para que el tope sea exacto.</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Mes</InputLabel>
            <Select label="Mes" value={month} onChange={(e) => setMonth(e.target.value)}>
              {[...s.months].reverse().map((m) => <MenuItem key={m.month} value={m.month}>{monthLabel(m.month, { month: 'long', year: 'numeric' })}{m.external ? ` (${money(m.external)})` : ''}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Facturado por fuera" value={external} onChange={(e) => setExternal(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
          <Button variant="outlined" onClick={save}>Guardar</Button>
        </Stack>
      </Paper>
    </Stack>
  );
};

const Vat: React.FC<{ s: VatSummary; onSaved: () => void }> = ({ s, onSaved }) => {
  const toast = useToast();
  const [credit, setCredit] = useState<Record<string, string>>({});
  const save = async (m: string) => {
    try {
      await invoicingService.savePeriod(m, { vatCredit: Number((credit[m] ?? '').replace(/\./g, '').replace(',', '.')) || 0 });
      setCredit((c) => ({ ...c, [m]: '' })); onSaved();
    } catch (e) { toast.showError(invoicingError(e, 'No se pudo guardar')); }
  };
  const card = (title: string, m: VatSummary['current']) => (
    <Grid item xs={12} md={6}><Paper sx={{ p: 3 }}>
      <Typography fontWeight={700} sx={{ textTransform: 'capitalize' }}>{title} · {monthLabel(m.month, { month: 'long', year: 'numeric' })}</Typography>
      <Typography variant="caption" color="text.secondary">Facturado {money(m.invoicedTotal)}</Typography>
      <Stack spacing={1} mt={2}>
        <Stack direction="row" justifyContent="space-between"><span>Débito fiscal (IVA de tus facturas)</span><b>{money(m.debitoFiscal)}</b></Stack>
        <Stack direction="row" justifyContent="space-between"><span>Crédito fiscal (IVA de tus compras)</span><b>− {money(m.creditoFiscal)}</b></Stack>
        <Stack direction="row" justifyContent="space-between" sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <span>{m.neto >= 0 ? 'IVA a pagar' : 'Saldo a favor'}</span>
          <Typography variant="h6" fontWeight={800} color={m.neto > 0 ? 'warning.main' : 'success.main'}>{money(Math.abs(m.neto))}</Typography>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} mt={2}>
        <TextField size="small" fullWidth label="Crédito fiscal del mes" value={credit[m.month] ?? ''} onChange={(e) => setCredit((c) => ({ ...c, [m.month]: e.target.value }))} />
        <Button variant="outlined" onClick={() => save(m.month)}>Guardar</Button>
      </Stack>
    </Paper></Grid>
  );
  return (
    <Stack spacing={2}>
      <Alert severity={s.previous.neto > 0 ? 'warning' : 'success'}>{s.advice}</Alert>
      <Grid container spacing={2}>{card('Mes pasado', s.previous)}{card('Mes en curso', s.current)}</Grid>
      <Typography variant="caption" color="text.secondary">Es orientativo: el monto final lo confirma tu contador en la declaración jurada.</Typography>
    </Stack>
  );
};

// ── Conexión con ARCA ──────────────────────────────────────────────────────

const TAX_LABELS: Record<TaxConditionCode, string> = { monotributo: 'Monotributo', responsable_inscripto: 'Responsable Inscripto', exento: 'Exento' };
const formatCuit = (c: string) => (c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c);

const SettingsTab: React.FC<{ status: InvoicingStatus; onChanged: () => void }> = ({ status, onChanged }) => {
  const toast = useToast();
  const [current, setCurrent] = useState<Emitter | null>(status.emitter ?? null);
  const [editing, setEditing] = useState(!status.emitter);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({
    cuit: current?.cuit ?? status.cuit ?? '',
    taxCondition: (current?.taxCondition ?? '') as TaxConditionCode | '',
    monotributoCategory: current?.monotributoCategory ?? '',
    businessName: current?.businessName && !current.businessName.startsWith('CUIT ') ? current.businessName : '',
    address: current?.address ?? '',
    grossIncomeNumber: current?.grossIncomeNumber ?? '',
    activityStartDate: current?.activityStartDate ?? '',
  });

  const save = async () => {
    setSaving(true);
    try {
      const e = await invoicingService.saveSettings({
        cuit: form.cuit.replace(/\D/g, ''),
        taxCondition: form.taxCondition || undefined,
        monotributoCategory: form.taxCondition !== 'responsable_inscripto' && form.taxCondition !== 'exento' ? form.monotributoCategory || undefined : undefined,
        businessName: form.businessName || undefined, address: form.address || undefined,
        grossIncomeNumber: form.grossIncomeNumber || undefined, activityStartDate: form.activityStartDate || undefined,
      });
      setCurrent(e); setEditing(false); toast.showSuccess('Datos fiscales guardados'); onChanged();
    } catch (err) { toast.showError(invoicingError(err, 'No se pudieron guardar los datos')); }
    finally { setSaving(false); }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      const e = await invoicingService.verify();
      setCurrent(e);
      if (e.readyToInvoice) toast.showSuccess('¡Listo! ARCA confirmó la conexión');
      onChanged();
    } catch (err) { toast.showError(invoicingError(err, 'No se pudo verificar')); }
    finally { setVerifying(false); }
  };

  const choosePos = async (pos: number) => {
    try { setCurrent(await invoicingService.setPointOfSale(pos)); onChanged(); }
    catch (err) { toast.showError(invoicingError(err)); }
  };

  const toggleAuto = async () => {
    try { await invoicingService.setAuto(!status.autoInvoice); onChanged(); }
    catch (err) { toast.showError(invoicingError(err)); }
  };

  const shareUrl = current?.guideUrl.replace('embed=1&', '').replace('?embed=1', '?') ?? '';
  const activeStep = !current || editing ? 0 : current.readyToInvoice ? 3 : current.status === 'choose_point_of_sale' ? 2 : 1;

  return (
    <Stack spacing={2}>
      {current?.environment === 'testing' && <Alert severity="info">Modo prueba (homologación de ARCA): los comprobantes no tienen validez fiscal.</Alert>}
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          <Step completed={!!current && !editing}>
            <StepLabel>Tus datos fiscales</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" mb={2}>Con el CUIT alcanza: razón social, condición, categoría y domicilio los traemos de ARCA.</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField fullWidth required label="CUIT" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} placeholder="20-12345678-9" /></Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth><InputLabel>Condición frente al IVA</InputLabel>
                    <Select label="Condición frente al IVA" value={form.taxCondition} onChange={(e) => setForm({ ...form, taxCondition: e.target.value as TaxConditionCode | '' })}>
                      <MenuItem value="">Tomar de ARCA</MenuItem>
                      <MenuItem value="monotributo">Monotributo</MenuItem>
                      <MenuItem value="responsable_inscripto">Responsable Inscripto</MenuItem>
                      <MenuItem value="exento">Exento</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {form.taxCondition !== 'responsable_inscripto' && form.taxCondition !== 'exento' && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth><InputLabel>Categoría del monotributo</InputLabel>
                      <Select label="Categoría del monotributo" value={form.monotributoCategory} onChange={(e) => setForm({ ...form, monotributoCategory: e.target.value })}>
                        <MenuItem value="">Tomar de ARCA</MenuItem>
                        {'ABCDEFGHIJK'.split('').map((c) => <MenuItem key={c} value={c}>Categoría {c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12} md={6}><TextField fullWidth label="Razón social" placeholder="Tomar de ARCA" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Domicilio comercial (va en la factura)" placeholder="Tomar de ARCA" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Ingresos Brutos (opcional)" value={form.grossIncomeNumber} onChange={(e) => setForm({ ...form, grossIncomeNumber: e.target.value })} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth type="date" label="Inicio de actividades (opcional)" InputLabelProps={{ shrink: true }} value={form.activityStartDate} onChange={(e) => setForm({ ...form, activityStartDate: e.target.value })} /></Grid>
              </Grid>
              <Stack direction="row" spacing={1} mt={2}>
                <Button variant="contained" onClick={save} disabled={saving || !form.cuit}>{saving ? 'Consultando ARCA…' : 'Guardar y seguir'}</Button>
                {current && <Button onClick={() => setEditing(false)}>Cancelar</Button>}
              </Stack>
            </StepContent>
          </Step>
          <Step completed={activeStep > 1}>
            <StepLabel optional={current && !editing ? <Typography variant="caption">{current.businessName} · CUIT {formatCuit(current.cuit)} · {TAX_LABELS[current.taxCondition]}{current.monotributoCategory ? ` ${current.monotributoCategory}` : ''} · <Button size="small" onClick={() => setEditing(true)}>Editar</Button></Typography> : undefined}>
              Autorizarnos en ARCA (una sola vez)
            </StepLabel>
            <StepContent>
              {current && (
                <Stack spacing={2}>
                  <Typography variant="body2">En ARCA, con tu clave fiscal nivel 3, autorizás a <b>{current.platformName}</b> (CUIT {formatCuit(current.platformCuit)}) a facturar por vos y creás un punto de venta <b>“{current.pointOfSaleSystemName}”</b>. Seguí los pasos con las capturas.</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank">Abrir ARCA ↗</Button>
                    <Button variant="outlined" href={shareUrl} target="_blank">Ver la guía en otra pestaña</Button>
                    <Button variant="outlined" onClick={() => navigator.clipboard.writeText(shareUrl).then(() => toast.showSuccess('Link copiado: mandáselo a tu contador'))}>Copiar link para mi contador</Button>
                  </Stack>
                  <Box sx={{ borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: '#fff' }}>
                    <iframe src={current.guideUrl} title="Guía paso a paso de ARCA" style={{ width: '100%', height: 720, border: 0 }} loading="lazy" />
                  </Box>
                  <Box>
                    {current.checkedAt && <Alert severity={current.readyToInvoice ? 'success' : 'warning'} sx={{ mb: 1 }}>{current.message}</Alert>}
                    <Button variant="contained" onClick={verify} disabled={verifying}>{verifying ? 'Consultando a ARCA…' : 'Ya lo hice, verificar'}</Button>
                  </Box>
                </Stack>
              )}
            </StepContent>
          </Step>
          <Step completed={activeStep > 2}>
            <StepLabel>Elegir punto de venta</StepLabel>
            <StepContent>
              <Stack direction="row" spacing={1}>
                {current?.pointsOfSale.map((p) => <Button key={p} variant="outlined" onClick={() => choosePos(p)}>Punto de venta {p}</Button>)}
              </Stack>
            </StepContent>
          </Step>
          <Step completed={false}>
            <StepLabel>Facturar</StepLabel>
            <StepContent>
              <Alert severity="success" sx={{ mb: 2 }}>Conectado. Facturás con el punto de venta {current?.pointOfSale} ({current?.voucherName}).</Alert>
              <FormControlLabel control={<Switch checked={status.autoInvoice} onChange={toggleAuto} />}
                label="Facturar automáticamente cada turno cobrado y venta de productos (a Consumidor Final, con el DNI del cliente)" />
              <Box mt={1}><Button size="small" onClick={verify}>Volver a verificar</Button></Box>
            </StepContent>
          </Step>
        </Stepper>
      </Paper>
    </Stack>
  );
};

export default InvoicingPage;
