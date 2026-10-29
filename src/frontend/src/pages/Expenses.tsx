import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, ChevronLeft, ChevronRight, ContentCopy, Delete, Edit, ReceiptLong, Repeat } from '@mui/icons-material';
import { addMonths, endOfMonth, format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import api, { isPlanLimitError } from '../services/api';
import TextField from '../components/common/TextField';
import PlanCheckoutRedirect from '../components/subscription/PlanCheckoutRedirect';
import {
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  ExpenseInput,
  ExpenseMonth,
  expenseCategoryLabel,
  expensesApi,
} from '../services/expensesApi';
import { useTenantMoney } from '../hooks/useTenantMoney';

interface FormState {
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number | '';
  isRecurring: boolean;
}

/** Lo que el dashboard ya calcula del mes (financial-stats), para mostrar la ganancia real. */
interface MonthStats {
  totalRevenue: number;
  totalSalaries: number;
  totalCommissions: number;
  productCost: number;
  netProfit: number;
}

const monthKey = (d: Date) => format(d, 'yyyy-MM');

const Expenses: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { formatMoney, currencySymbol } = useTenantMoney();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<ExpenseMonth | null>(null);
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [copying, setCopying] = useState(false);

  const isCurrentMonth = isSameMonth(month, new Date());

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const now = new Date();
      const [list, fin] = await Promise.all([
        expensesApi.list(monthKey(month)),
        api
          .get<MonthStats>('/dashboard/financial-stats', {
            params: {
              startDate: startOfMonth(month).toISOString(),
              endDate: (isSameMonth(month, now) ? now : endOfMonth(month)).toISOString(),
            },
          })
          .then((r) => r.data)
          .catch(() => null),
      ]);
      setData(list);
      setStats(fin);
    } catch {
      setLoadError('No pudimos cargar tus gastos. Probá de nuevo en un rato.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const expenses = useMemo(() => data?.expenses ?? [], [data]);
  const total = data?.total ?? 0;
  const teamCost = stats ? stats.totalSalaries + stats.totalCommissions : 0;

  const openCreate = () => {
    setEditing(null);
    setForm({
      date: format(isCurrentMonth ? new Date() : month, 'yyyy-MM-dd'),
      category: 'alquiler',
      description: '',
      amount: '',
      isRecurring: false,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      date: e.date,
      category: e.category,
      description: e.description ?? '',
      amount: e.amount,
      isRecurring: e.isRecurring,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.date) return setFormError('Elegí la fecha.');
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return setFormError('El monto tiene que ser mayor a 0.');
    const body: ExpenseInput = {
      date: form.date,
      category: form.category,
      description: form.description.trim() || null,
      amount,
      isRecurring: form.isRecurring,
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await expensesApi.update(editing.id, body);
      else await expensesApi.create(body);
      setDialogOpen(false);
      setToast(editing ? 'Gasto actualizado' : 'Gasto cargado');
      // Si lo cargó en otro mes, saltamos a ese mes para que lo vea.
      const target = startOfMonth(parseISO(body.date));
      if (!isSameMonth(target, month)) setMonth(target);
      else load();
    } catch (err: any) {
      if (isPlanLimitError(err)) {
        setDialogOpen(false);
        return;
      }
      setFormError(err?.response?.data?.message || 'No pudimos guardar el gasto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await expensesApi.remove(toDelete.id);
      setToast('Gasto borrado');
      load();
    } catch {
      setToast('No pudimos borrar el gasto.');
    } finally {
      setToDelete(null);
    }
  };

  const handleCopyRecurring = async () => {
    setCopying(true);
    try {
      const { copied } = await expensesApi.copyRecurring(monthKey(month));
      setToast(
        copied > 0
          ? `Se ${copied === 1 ? 'copió 1 gasto fijo' : `copiaron ${copied} gastos fijos`} de ${format(addMonths(month, -1), 'MMMM', { locale: es })}`
          : `No hay gastos fijos de ${format(addMonths(month, -1), 'MMMM', { locale: es })} para copiar`,
      );
      if (copied > 0) load();
    } catch (err: any) {
      if (!isPlanLimitError(err)) setToast('No pudimos copiar los gastos fijos.');
    } finally {
      setCopying(false);
    }
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // El plan no incluye gastos (el backend lo dice en el GET): directo al checkout (Plus).
  if (data && !data.allowed) return <PlanCheckoutRedirect gate="expenses" />;

  const monthLabel = format(month, 'MMMM yyyy', { locale: es });

  const summary = (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="text.secondary">Facturación</Typography>
            <Typography variant="h5" fontWeight={700}>{stats ? formatMoney(stats.totalRevenue) : '—'}</Typography>
            <Typography variant="caption" color="text.secondary">Turnos cobrados y ventas</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="text.secondary">Gastos cargados</Typography>
            <Typography variant="h5" fontWeight={700} color="error.main">{formatMoney(total)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {stats && teamCost > 0 ? `+ ${formatMoney(teamCost)} de sueldos y comisiones del equipo` : 'Alquiler, servicios, insumos…'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Card variant="outlined" sx={{ borderColor: stats && stats.netProfit < 0 ? 'error.main' : 'success.main' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Ganancia neta</Typography>
            <Typography variant="h5" fontWeight={700} color={stats && stats.netProfit < 0 ? 'error.main' : 'success.main'}>
              {stats ? formatMoney(stats.netProfit) : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">Facturación menos todos los gastos</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const breakdown = data && data.byCategory.length > 0 && (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>En qué se va la plata</Typography>
        <Stack spacing={1.25}>
          {data.byCategory.map((c) => (
            <Box key={c.category}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{expenseCategoryLabel(c.category)}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatMoney(c.total)} · {total > 0 ? Math.round((c.total / total) * 100) : 0}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={total > 0 ? (c.total / total) * 100 : 0} sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );

  const dateLabel = (d: string) => format(parseISO(d), "d MMM", { locale: es });

  const actions = (e: Expense) => (
    <>
      <Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(e)}><Edit fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Borrar"><IconButton size="small" onClick={() => setToDelete(e)}><Delete fontSize="small" /></IconButton></Tooltip>
    </>
  );

  const list = isMobile ? (
    <Stack spacing={1.5}>
      {expenses.map((e) => (
        <Card key={e.id} variant="outlined">
          <CardContent sx={{ pb: '12px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label={expenseCategoryLabel(e.category)} />
              <Typography fontWeight={700}>{formatMoney(e.amount)}</Typography>
            </Box>
            {e.description && <Typography variant="body2" sx={{ mt: 0.75 }}>{e.description}</Typography>}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {dateLabel(e.date)}{e.isRecurring ? ' · Fijo mensual' : ''}
              </Typography>
              <Box>{actions(e)}</Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  ) : (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Categoría</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell align="right">Monto</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {expenses.map((e) => (
            <TableRow key={e.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateLabel(e.date)}</TableCell>
              <TableCell><Chip size="small" label={expenseCategoryLabel(e.category)} /></TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {e.description || <Typography variant="body2" color="text.disabled">—</Typography>}
                  {e.isRecurring && (
                    <Tooltip title="Fijo mensual"><Repeat fontSize="small" color="action" /></Tooltip>
                  )}
                </Box>
              </TableCell>
              <TableCell align="right"><Typography fontWeight={600}>{formatMoney(e.amount)}</Typography></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{actions(e)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const selectedCategory = form ? EXPENSE_CATEGORIES.find((c) => c.value === form.category) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Gastos</Typography>
          <Typography variant="body2" color="text.secondary">
            Cargá alquiler, servicios, insumos y todo lo que pagás para saber cuánto ganás de verdad. Los sueldos y
            comisiones de tu equipo se calculan solos.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ flexShrink: 0 }}>
          Nuevo gasto
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton aria-label="Mes anterior" onClick={() => setMonth((m) => addMonths(m, -1))}><ChevronLeft /></IconButton>
          <Typography variant="h6" sx={{ textTransform: 'capitalize', minWidth: 150, textAlign: 'center' }}>{monthLabel}</Typography>
          <IconButton aria-label="Mes siguiente" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight /></IconButton>
          {loading && <CircularProgress size={18} sx={{ ml: 1 }} />}
        </Box>
        <Button size="small" startIcon={copying ? <CircularProgress size={14} /> : <ContentCopy />} onClick={handleCopyRecurring} disabled={copying}>
          Copiar fijos de {format(addMonths(month, -1), 'MMMM', { locale: es })}
        </Button>
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {summary}
      {breakdown}

      {expenses.length === 0 && !loadError ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: { xs: 4, sm: 6 }, px: 2 }}>
          <ReceiptLong color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>No cargaste gastos en {format(month, 'MMMM', { locale: es })}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3 }}>
            Empezá por los fijos (alquiler, luz, internet) y marcalos como fijos mensuales: el mes que viene los copiás con un click.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Cargar un gasto</Button>
        </Card>
      ) : (
        list
      )}

      {/* Crear / editar */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editing ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
        {form && (
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Categoría"
                  fullWidth
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                  helperText={selectedCategory?.hint ?? ' '}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Fecha"
                  type="date"
                  fullWidth
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText=" "
                />
              </Stack>
              <TextField
                label="Monto"
                type="number"
                fullWidth
                autoFocus={!editing}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                InputProps={{ startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment> }}
                inputProps={{ min: 0, step: 'any' }}
              />
              <TextField
                label="Descripción (opcional)"
                fullWidth
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                inputProps={{ maxLength: 200 }}
                placeholder="Ej: alquiler del local, factura de luz"
              />
              <FormControlLabel
                control={<Switch checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} />}
                label="Es un gasto fijo de todos los meses"
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Cargar gasto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar borrado */}
      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Borrar este gasto?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {toDelete && `${expenseCategoryLabel(toDelete.category)}${toDelete.description ? ` · ${toDelete.description}` : ''} · ${formatMoney(toDelete.amount)}`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Borrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </Box>
  );
};

export default Expenses;
