import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, ArrowDownward, ArrowUpward, Block, DynamicForm, Edit, Replay, Star } from '@mui/icons-material';
import TextField from '../components/common/TextField';
import FeaturePaywall from '../components/subscription/FeaturePaywall';
import CustomFieldInput, { CustomFieldLike } from '../components/booking/CustomFieldInput';
import { isPlanLimitError } from '../services/api';
import {
  BookingFormField,
  BookingFormFieldInput,
  bookingFormFieldsApi,
  fieldToInput,
  FORM_FIELD_TYPE_LABELS,
  FormFieldType,
} from '../services/bookingExtrasApi';
import { PLAN_PRO } from '../utils/plans';

interface FormState {
  label: string;
  fieldType: FormFieldType;
  required: boolean;
  options: string[];
  placeholder: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { label: '', fieldType: 'text', required: false, options: [], placeholder: '', isActive: true };

const SAMPLE_FIELDS: CustomFieldLike[] = [
  { id: 's1', label: '¿Tenés alguna alergia?', fieldType: 'text', required: false, placeholder: 'Ej: látex, lidocaína', options: [] },
  { id: 's2', label: '¿Cómo nos conociste?', fieldType: 'select', required: true, placeholder: null, options: ['Instagram', 'Google', 'Me lo recomendaron'] },
  { id: 's3', label: 'Es mi primera vez', fieldType: 'checkbox', required: false, placeholder: null, options: [] },
];

/** Cómo se ve "Tus datos" en la página de reservas con estos campos. */
const FormPreview: React.FC<{ fields: CustomFieldLike[] }> = ({ fields }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'grey.50' }}>
      <Typography variant="overline" color="text.secondary">Vista previa · Tus datos</Typography>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField size="small" fullWidth label="Nombre completo" disabled />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField size="small" fullWidth label="Email" disabled />
          <TextField size="small" fullWidth label="Teléfono" disabled />
        </Stack>
        {fields.map((f) => (
          <CustomFieldInput
            key={f.id}
            field={f}
            value={values[f.id] ?? ''}
            onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
          />
        ))}
        <TextField size="small" fullWidth label="Notas adicionales (opcional)" disabled multiline rows={2} />
      </Stack>
    </Paper>
  );
};

const BookingFormFields: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [maxFields, setMaxFields] = useState(0);
  const [fields, setFields] = useState<BookingFormField[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookingFormField | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [optionDraft, setOptionDraft] = useState('');
  const [previewValue, setPreviewValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<BookingFormField | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await bookingFormFieldsApi.list();
      setMaxFields(typeof data.maxFields === 'number' ? data.maxFields : 0);
      setFields([...(data.fields || [])].sort((a, b) => a.displayOrder - b.displayOrder));
    } catch {
      setLoadError('No pudimos cargar los campos del formulario. Probá de nuevo en un rato.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => fields.filter((f) => f.isActive), [fields]);
  const unlimited = maxFields < 0;
  const atCap = !unlimited && active.length >= maxFields;
  // Si bajó de plan, la página de reservas muestra solo los primeros que entran.
  const shownInBooking = unlimited ? active : active.slice(0, Math.max(0, maxFields));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOptionDraft('');
    setPreviewValue('');
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (f: BookingFormField) => {
    setEditing(f);
    setForm({
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      options: f.options || [],
      placeholder: f.placeholder ?? '',
      isActive: f.isActive,
    });
    setOptionDraft('');
    setPreviewValue('');
    setFormError(null);
    setDialogOpen(true);
  };

  const addOptions = (raw: string) => {
    // Pegar varias líneas (o separadas por coma) suma una opción por cada una.
    const parts = raw.split(/[\n,]/).map((o) => o.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setForm((prev) => ({ ...prev, options: Array.from(new Set([...prev.options, ...parts])) }));
    setOptionDraft('');
  };

  const handleSave = async () => {
    const label = form.label.trim();
    if (!label) return setFormError('Poné el nombre del campo (es lo que ve tu cliente).');
    if (label.length > 120) return setFormError('El nombre puede tener hasta 120 caracteres.');
    const pendingOptions = optionDraft.trim() ? Array.from(new Set([...form.options, ...optionDraft.split(/[\n,]/).map((o) => o.trim()).filter(Boolean)])) : form.options;
    if (form.fieldType === 'select' && pendingOptions.length < 2) return setFormError('Una lista desplegable necesita al menos 2 opciones.');

    const body: BookingFormFieldInput = {
      label,
      fieldType: form.fieldType,
      required: form.required,
      options: form.fieldType === 'select' ? pendingOptions : [],
      placeholder: form.placeholder.trim() || null,
      displayOrder: editing?.displayOrder,
      isActive: form.isActive,
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await bookingFormFieldsApi.update(editing.id, body);
      else await bookingFormFieldsApi.create(body);
      setDialogOpen(false);
      setToast(editing ? 'Campo actualizado' : 'Campo agregado: ya aparece en tu página de reservas.');
      load();
    } catch (err: any) {
      if (isPlanLimitError(err)) {
        setDialogOpen(false);
        return;
      }
      setFormError(err?.response?.data?.message || 'No pudimos guardar el campo.');
    } finally {
      setSaving(false);
    }
  };

  /** Intercambia con el vecino y renumera 0..n: solo se mandan los que cambiaron de lugar. */
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const changed = reordered
      .map((f, i) => ({ f, i }))
      .filter(({ f, i }) => f.displayOrder !== i);
    setFields(reordered.map((f, i) => ({ ...f, displayOrder: i })));
    setBusy(true);
    try {
      await Promise.all(changed.map(({ f, i }) => bookingFormFieldsApi.update(f.id, fieldToInput(f, { displayOrder: i }))));
    } catch (err: any) {
      if (!isPlanLimitError(err)) setToast('No pudimos guardar el orden.');
      load();
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async (f: BookingFormField) => {
    setBusy(true);
    try {
      await bookingFormFieldsApi.update(f.id, fieldToInput(f, { isActive: true }));
      setToast(`"${f.label}" vuelve a aparecer en tu página de reservas.`);
      load();
    } catch (err: any) {
      if (!isPlanLimitError(err)) setToast(err?.response?.data?.message || 'No pudimos reactivar el campo.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async () => {
    if (!toDeactivate) return;
    try {
      await bookingFormFieldsApi.deactivate(toDeactivate.id);
      setToast(`"${toDeactivate.label}" ya no se pide al reservar`);
      load();
    } catch {
      setToast('No pudimos desactivar el campo.');
    } finally {
      setToDeactivate(null);
    }
  };

  const proUpsell = (
    <Alert
      severity="info"
      icon={<Star />}
      action={
        <Button color="inherit" size="small" onClick={() => navigate(`/subscription/plans?highlight=${PLAN_PRO}`)}>
          Ver Pro
        </Button>
      }
    >
      Llegaste al tope de tu plan. Con Pro son ilimitados.
    </Alert>
  );

  const addButton = (
    <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ flexShrink: 0 }}>
      Agregar campo
    </Button>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const header = (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Campos del formulario</Typography>
      <Typography variant="body2" color="text.secondary">
        Preguntale a tu cliente lo que necesitás saber antes del turno (alergias, patente, talle, cómo te conoció…). Las
        respuestas quedan guardadas en la reserva.
      </Typography>
    </Box>
  );

  if (maxFields === 0) {
    return (
      <Box>
        {header}
        {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
        <FeaturePaywall
          title="Pedí los datos que necesitás al reservar"
          description="Sumá preguntas propias al formulario de tu página de reservas y llegá al turno sabiendo todo: nada de perseguir al cliente por WhatsApp."
          bullets={[
            'Texto, número, lista desplegable o casilla de sí/no',
            'Obligatorios u opcionales, en el orden que quieras',
            'La respuesta aparece en el detalle de cada reserva',
            'Advance incluye 1 campo; Pro, ilimitados',
          ]}
          includes={(f) => (f.maxCustomFields ?? 0) !== 0}
        >
          <Box sx={{ maxWidth: 560 }}>
            <FormPreview fields={SAMPLE_FIELDS} />
          </Box>
        </FeaturePaywall>
      </Box>
    );
  }

  const dialogPreview: CustomFieldLike = {
    id: 'preview',
    label: form.label,
    fieldType: form.fieldType,
    required: form.required,
    placeholder: form.placeholder,
    options: form.fieldType === 'select' ? (form.options.length ? form.options : ['Opción 1', 'Opción 2']) : [],
  };

  return (
    <Box>
      {header}
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<DynamicForm />}
              label={unlimited ? `Usás ${active.length} campos · ilimitados` : `Usás ${active.length} de ${maxFields} ${maxFields === 1 ? 'campo' : 'campos'}`}
              variant="outlined"
            />
            {!atCap && fields.length > 0 && addButton}
          </Box>
          {atCap && <Box sx={{ mb: 2 }}>{proUpsell}</Box>}

          {fields.length === 0 ? (
            <Card variant="outlined" sx={{ textAlign: 'center', py: 5, px: 2 }}>
              <DynamicForm color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Sumá tu primera pregunta</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', mb: 3 }}>
                Por ejemplo "¿Tenés alguna alergia?" o "Patente del auto". Aparece en "Tus datos", después del nombre,
                teléfono y email.
              </Typography>
              {addButton}
            </Card>
          ) : (
            <Stack spacing={1.25}>
              {fields.map((f, i) => {
                const hiddenByPlan = f.isActive && !shownInBooking.some((s) => s.id === f.id);
                return (
                  <Card key={f.id} variant="outlined" sx={{ opacity: f.isActive ? 1 : 0.6 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '10px !important' }}>
                      <Stack>
                        <IconButton size="small" aria-label="Subir" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                          <ArrowUpward fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Bajar" disabled={busy || i === fields.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDownward fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={600} noWrap>
                          {f.label}
                          {f.required && <Box component="span" sx={{ color: 'error.main' }}> *</Box>}
                        </Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Chip size="small" label={FORM_FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType} />
                          {f.required && <Chip size="small" label="Obligatorio" variant="outlined" />}
                          {!f.isActive && <Chip size="small" label="Desactivado" />}
                          {hiddenByPlan && (
                            <Tooltip title="Tu plan actual no incluye tantos campos: este no se muestra al reservar.">
                              <Chip size="small" color="warning" label="Fuera del plan" />
                            </Tooltip>
                          )}
                        </Stack>
                        {f.fieldType === 'select' && f.options.length > 0 && (
                          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ mt: 0.5 }}>
                            {f.options.join(' · ')}
                          </Typography>
                        )}
                      </Box>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(f)}><Edit fontSize="small" /></IconButton>
                      </Tooltip>
                      {f.isActive ? (
                        <Tooltip title="Desactivar">
                          <IconButton size="small" onClick={() => setToDeactivate(f)}><Block fontSize="small" /></IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reactivar">
                          <span>
                            <IconButton size="small" disabled={busy} onClick={() => reactivate(f)}><Replay fontSize="small" /></IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Grid>

        <Grid item xs={12} md={5}>
          <FormPreview fields={shownInBooking.length > 0 ? shownInBooking : []} />
          {shownInBooking.length === 0 && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Así se ve hoy. Tus campos aparecen entre el teléfono y las notas.
            </Typography>
          )}
        </Grid>
      </Grid>

      {/* Agregar / editar */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editing ? 'Editar campo' : 'Nuevo campo'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Pregunta o nombre del campo"
              fullWidth
              autoFocus={!editing}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              inputProps={{ maxLength: 120 }}
              placeholder="Ej: ¿Tenés alguna alergia?"
            />
            <TextField
              select
              label="Tipo de respuesta"
              fullWidth
              value={form.fieldType}
              onChange={(e) => setForm({ ...form, fieldType: e.target.value as FormFieldType })}
            >
              {(Object.keys(FORM_FIELD_TYPE_LABELS) as FormFieldType[]).map((t) => (
                <MenuItem key={t} value={t}>{FORM_FIELD_TYPE_LABELS[t]}</MenuItem>
              ))}
            </TextField>

            {form.fieldType === 'select' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Opciones (mínimo 2)</Typography>
                {form.options.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                    {form.options.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        onDelete={() => setForm((prev) => ({ ...prev, options: prev.options.filter((o) => o !== opt) }))}
                      />
                    ))}
                  </Box>
                )}
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Escribí una opción y Enter"
                    value={optionDraft}
                    onChange={(e) => setOptionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOptions(optionDraft);
                      }
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (/[\n,]/.test(text)) {
                        e.preventDefault();
                        addOptions(text);
                      }
                    }}
                  />
                  <Button variant="outlined" onClick={() => addOptions(optionDraft)} disabled={!optionDraft.trim()}>
                    Sumar
                  </Button>
                </Stack>
              </Box>
            )}

            {form.fieldType !== 'checkbox' && (
              <TextField
                label={form.fieldType === 'select' ? 'Ayuda debajo del campo (opcional)' : 'Texto de ejemplo (opcional)'}
                fullWidth
                value={form.placeholder}
                onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
                placeholder={form.fieldType === 'number' ? 'Ej: 42' : 'Ej: látex, lidocaína'}
              />
            )}

            <FormControlLabel
              control={<Switch checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />}
              label="Obligatorio"
            />
            {editing && (
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
                label={form.isActive ? 'Activo: se pide al reservar' : 'Desactivado: no se pide'}
              />
            )}

            <Divider />
            <Box>
              <Typography variant="overline" color="text.secondary">Así lo ve tu cliente</Typography>
              <Box sx={{ mt: 1 }}>
                <CustomFieldInput field={dialogPreview} value={previewValue} onChange={setPreviewValue} />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar campo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!toDeactivate} onClose={() => setToDeactivate(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Dejar de pedir "{toDeactivate?.label}"?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Deja de aparecer en tu página de reservas. Las reservas que ya lo respondieron conservan la respuesta. Lo podés
            reactivar cuando quieras.
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

export default BookingFormFields;
