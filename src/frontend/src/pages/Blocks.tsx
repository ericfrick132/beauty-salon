import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  ButtonGroup,
  Chip,
} from '@mui/material';
import { Add, ChevronLeft, ChevronRight, Today, ViewWeek, ViewDay, ViewModule, Delete, Edit } from '@mui/icons-material';
import { employeeApi } from '../services/api';
import api from '../services/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';

interface BlockItem {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  reason?: string;
  seriesId?: string;
  recurrencePattern?: string;
  isRecurring?: boolean;
  recurrenceStart?: string;
  recurrenceEnd?: string;
}

const round15 = (hhmm: string) => {
  if (!hhmm) return hhmm;
  const [h, m] = hhmm.split(':').map(n => parseInt(n || '0', 10));
  const floored = m - (m % 15);
  return `${String(h).padStart(2,'0')}:${String(floored).padStart(2,'0')}`;
};

const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const Blocks: React.FC = () => {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState('timeGridWeek');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [viewRange, setViewRange] = useState<{ start: string; end: string } | null>(null);
  const [rows, setRows] = useState<BlockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create'|'edit'>('create');
  const [editing, setEditing] = useState<BlockItem | null>(null);

  const [form, setForm] = useState({
    employeeId: 'all',
    type: 'recurring' as 'recurring'|'single',
    // single
    date: '',
    start: '09:00',
    end: '10:00',
    // recurring
    startTimeOfDay: '09:00',
    endTimeOfDay: '10:00',
    daysOfWeek: [1,2,3,4,5] as number[],
    startDate: '',
    until: '',
    reason: '',
    forceOverride: false,
  });

  const loadEmployees = async () => {
    try {
      const list = await employeeApi.getEmployees();
      setEmployees(list);
    } catch {}
  };

  const loadBlocks = async () => {
    if (!viewRange) return;
    setLoading(true);
    try {
      if (selectedEmployee === 'all') {
        const res = await Promise.all(
          employees.map(e => employeeApi.getBlocks(e.id, { from: viewRange.start, to: viewRange.end }).catch(() => []))
        );
        setRows(res.flat());
      } else {
        const items = await employeeApi.getBlocks(selectedEmployee, { from: viewRange.start, to: viewRange.end });
        setRows(items);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);
  useEffect(() => { if (employees.length && viewRange) loadBlocks(); }, [employees, selectedEmployee, viewRange]);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setEditing(null);
    setForm(f => ({
      ...f,
      employeeId: selectedEmployee,
      type: 'recurring',
      reason: '',
      daysOfWeek: [1,2,3,4,5],
      startDate: '',
      until: '',
      startTimeOfDay: '09:00',
      endTimeOfDay: '10:00',
      date: '',
      start: '09:00',
      end: '10:00',
      forceOverride: false,
    }));
    setDialogOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const block = rows.find(r => r.id === info.event.id);
    if (!block) return;
    handleOpenEdit(block);
  };

  const handleOpenEdit = (block: BlockItem) => {
    setDialogMode('edit');
    setEditing(block);

    if (block.isRecurring && block.recurrencePattern) {
      try {
        const pattern = JSON.parse(block.recurrencePattern);
        setForm(f => ({
          ...f,
          employeeId: block.employeeId,
          type: 'recurring',
          startTimeOfDay: pattern.startTimeOfDay || '09:00',
          endTimeOfDay: pattern.endTimeOfDay || '10:00',
          daysOfWeek: pattern.daysOfWeek || [1,2,3,4,5],
          startDate: block.recurrenceStart ? block.recurrenceStart.split('T')[0] : '',
          until: block.recurrenceEnd ? block.recurrenceEnd.split('T')[0] : '',
          reason: block.reason || '',
          forceOverride: false,
        }));
      } catch {
        // fallback
      }
    } else {
      const d = new Date(block.startTime);
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const start = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const de = new Date(block.endTime);
      const end = `${String(de.getHours()).padStart(2,'0')}:${String(de.getMinutes()).padStart(2,'0')}`;
      setForm(f => ({
        ...f,
        employeeId: block.employeeId,
        type: 'single',
        date,
        start,
        end,
        reason: block.reason || '',
        forceOverride: false,
      }));
    }
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!editing) return;
    const msg = editing.isRecurring
      ? '¿Eliminar esta regla recurrente? Se desbloqueará en todos los días.'
      : '¿Eliminar este bloqueo?';
    if (!window.confirm(msg)) return;

    try {
      await employeeApi.deleteBlock(editing.employeeId, editing.id);
      setDialogOpen(false);
      await loadBlocks();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error eliminando bloqueo');
    }
  };

  const handleSave = async () => {
    const targetIds = form.employeeId && form.employeeId !== 'all' ? [form.employeeId] : employees.map(e => e.id);

    try {
      if (dialogMode === 'create') {
        if (form.type === 'recurring') {
          const startDate = form.startDate || new Date().toISOString().split('T')[0];
          const payload: any = {
            startDate,
            startTimeOfDay: round15(form.startTimeOfDay),
            endTimeOfDay: round15(form.endTimeOfDay),
            daysOfWeek: form.daysOfWeek,
            reason: form.reason || undefined,
            forceOverride: form.forceOverride,
          };
          if (form.until) payload.endDate = form.until;
          for (const id of targetIds) {
            await employeeApi.createRecurringBlocks(id, payload);
          }
        } else {
          if (!form.date) { alert('Seleccione fecha'); return; }
          const startISO = new Date(`${form.date}T${round15(form.start)}`).toISOString();
          const endISO = new Date(`${form.date}T${round15(form.end)}`).toISOString();
          if (new Date(endISO) <= new Date(startISO)) { alert('Hora fin > inicio'); return; }
          for (const id of targetIds) {
            await employeeApi.createBlock(id, { startTime: startISO, endTime: endISO, reason: form.reason || undefined });
          }
        }
      } else if (dialogMode === 'edit' && editing) {
        if (editing.isRecurring) {
          // Update recurring rule
          await api.put(`/employees/${editing.employeeId}/blocks/${editing.id}/recurring`, {
            startTimeOfDay: round15(form.startTimeOfDay),
            endTimeOfDay: round15(form.endTimeOfDay),
            daysOfWeek: form.daysOfWeek,
            reason: form.reason || undefined,
            recurrenceEnd: form.until || undefined,
          });
        } else {
          // Update single block
          if (!form.date) { alert('Seleccione fecha'); return; }
          const startISO = new Date(`${form.date}T${round15(form.start)}`).toISOString();
          const endISO = new Date(`${form.date}T${round15(form.end)}`).toISOString();
          await employeeApi.updateBlock(editing.employeeId, editing.id, {
            startTime: startISO,
            endTime: endISO,
            reason: form.reason || undefined,
            forceOverride: form.forceOverride
          });
        }
      }
      setDialogOpen(false);
      await loadBlocks();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error guardando bloqueo');
    }
  };

  const findEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || '-';

  const blockEvents = rows.map((b, idx) => ({
    id: b.id,
    title: b.reason || `Bloqueado - ${findEmployeeName(b.employeeId)}`,
    start: b.startTime,
    end: b.endTime,
    backgroundColor: b.isRecurring ? '#7986cb' : '#9e9e9e',
    borderColor: b.isRecurring ? '#5c6bc0' : '#757575',
    textColor: '#ffffff',
    extendedProps: {
      employeeId: b.employeeId,
      employeeName: findEmployeeName(b.employeeId),
      reason: b.reason,
      isRecurring: b.isRecurring,
    }
  }));

  const initialScrollTime = React.useMemo(() => {
    const now = new Date();
    const hh = Math.max(0, now.getHours() - 1).toString().padStart(2, '0');
    return `${hh}:${now.getMinutes().toString().padStart(2, '0')}:00`;
  }, []);

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Toolbar sx={{ px: '0 !important' }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 600 }}>Bloqueos</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ButtonGroup size="small">
              <IconButton onClick={() => calendarRef.current?.getApi().prev()} size="small"><ChevronLeft /></IconButton>
              <Button onClick={() => calendarRef.current?.getApi().today()} startIcon={<Today />} size="small">Hoy</Button>
              <IconButton onClick={() => calendarRef.current?.getApi().next()} size="small"><ChevronRight /></IconButton>
            </ButtonGroup>
            <ButtonGroup size="small">
              <Button variant={currentView === 'dayGridMonth' ? 'contained' : 'outlined'} onClick={() => handleViewChange('dayGridMonth')}>Mes</Button>
              <Button variant={currentView === 'timeGridWeek' ? 'contained' : 'outlined'} onClick={() => handleViewChange('timeGridWeek')}>Semana</Button>
              <Button variant={currentView === 'timeGridDay' ? 'contained' : 'outlined'} onClick={() => handleViewChange('timeGridDay')}>Día</Button>
            </ButtonGroup>
            <Button startIcon={<Add />} variant="contained" onClick={handleOpenCreate}>Nuevo</Button>
          </Box>
        </Toolbar>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Empleado</InputLabel>
              <Select value={selectedEmployee} label="Empleado" onChange={(e) => setSelectedEmployee(e.target.value)}>
                <MenuItem value="all">Todos</MenuItem>
                {employees.map((e: any) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip size="small" sx={{ backgroundColor: '#9e9e9e', color: 'white' }} label="Puntual" />
              <Chip size="small" sx={{ backgroundColor: '#7986cb', color: 'white' }} label="Recurrente" />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ flex: 1, p: 2 }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          events={blockEvents}
          locale="es"
          height="100%"
          headerToolbar={false}
          nowIndicator={true}
          slotMinTime="06:00"
          slotMaxTime="22:00"
          scrollTime={initialScrollTime}
          eventClick={handleEventClick}
          datesSet={(arg) => setViewRange({ start: arg.start.toISOString(), end: arg.end.toISOString() })}
          allDaySlot={false}
          slotDuration="00:30:00"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          eventDisplay="block"
        />
      </Paper>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Nuevo bloqueo' : (
            <>
              Editar bloqueo
              {editing?.isRecurring && <Chip size="small" label="Recurrente" sx={{ ml: 1 }} color="primary" variant="outlined" />}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Empleado</InputLabel>
                <Select label="Empleado" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value as string })} disabled={dialogMode === 'edit'}>
                  <MenuItem value="all">Todos</MenuItem>
                  {employees.map((e: any) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {dialogMode === 'create' && (
              <Grid item xs={12}>
                <ToggleButtonGroup exclusive value={form.type} onChange={(_, val) => val && setForm({ ...form, type: val })}>
                  <ToggleButton value="recurring">Recurrente</ToggleButton>
                  <ToggleButton value="single">Puntual</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            )}

            {(form.type === 'recurring' && dialogMode === 'create') || (dialogMode === 'edit' && editing?.isRecurring) ? (
              <>
                <Grid item xs={6}>
                  <TextField fullWidth type="time" label="Hora inicio" InputLabelProps={{ shrink: true }} value={form.startTimeOfDay} inputProps={{ step: 900 }} onChange={(e) => setForm({ ...form, startTimeOfDay: round15(e.target.value) })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="time" label="Hora fin" InputLabelProps={{ shrink: true }} value={form.endTimeOfDay} inputProps={{ step: 900 }} onChange={(e) => setForm({ ...form, endTimeOfDay: round15(e.target.value) })} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Días de la semana</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {[0,1,2,3,4,5,6].map(d => (
                      <Chip
                        key={d}
                        label={DAY_NAMES[d]}
                        onClick={() => {
                          const set = new Set(form.daysOfWeek);
                          if (set.has(d)) set.delete(d); else set.add(d);
                          setForm({ ...form, daysOfWeek: Array.from(set) });
                        }}
                        color={form.daysOfWeek.includes(d) ? 'primary' : 'default'}
                        variant={form.daysOfWeek.includes(d) ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Grid>
                {dialogMode === 'create' && (
                  <Grid item xs={6}>
                    <TextField fullWidth type="date" label="Desde" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </Grid>
                )}
                <Grid item xs={dialogMode === 'create' ? 6 : 12}>
                  <TextField fullWidth type="date" label="Hasta (vacío = indefinido)" InputLabelProps={{ shrink: true }} value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <TextField fullWidth type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="time" label="Hora inicio" InputLabelProps={{ shrink: true }} value={form.start} inputProps={{ step: 900 }} onChange={(e) => setForm({ ...form, start: round15(e.target.value) })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="time" label="Hora fin" InputLabelProps={{ shrink: true }} value={form.end} inputProps={{ step: 900 }} onChange={(e) => setForm({ ...form, end: round15(e.target.value) })} />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField fullWidth label="Motivo (opcional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Grid>
            {form.type === 'single' && (
              <Grid item xs={12}>
                <FormControlLabel control={<Switch checked={form.forceOverride} onChange={(e) => setForm({ ...form, forceOverride: e.target.checked })} />} label="Forzar sobre reservas (las cancela)" />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          {dialogMode === 'edit' && editing && (
            <Button color="error" startIcon={<Delete />} onClick={handleDelete}>
              Eliminar
            </Button>
          )}
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Blocks;
