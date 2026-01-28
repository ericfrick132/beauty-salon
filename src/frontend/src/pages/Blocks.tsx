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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import { Add, ChevronLeft, ChevronRight, Today, ViewWeek, ViewDay, ViewModule, Event, Repeat, EventRepeat } from '@mui/icons-material';
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
}

type SeriesAction = 'single' | 'following' | 'all';

const round15 = (hhmm: string) => {
  if (!hhmm) return hhmm;
  const [h, m] = hhmm.split(':').map(n => parseInt(n || '0', 10));
  const floored = m - (m % 15);
  return `${String(h).padStart(2,'0')}:${String(floored).padStart(2,'0')}`;
};

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

  // Series action dialog
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [seriesDialogMode, setSeriesDialogMode] = useState<'edit'|'delete'>('edit');
  const [pendingBlock, setPendingBlock] = useState<BlockItem | null>(null);

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
        const flat = res.flat();
        setRows(flat);
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
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
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

  const handleOpenEdit = (row: BlockItem, action: SeriesAction = 'single') => {
    setDialogMode('edit');
    setEditing({ ...row, _action: action } as any);
    const d = new Date(row.startTime);
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const start = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const de = new Date(row.endTime);
    const end = `${String(de.getHours()).padStart(2,'0')}:${String(de.getMinutes()).padStart(2,'0')}`;
    setForm(f => ({
      ...f,
      employeeId: row.employeeId,
      type: 'single',
      date,
      start,
      end,
      reason: row.reason || '',
      forceOverride: false,
    }));
    setDialogOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event;
    const block = rows.find(r => r.id === event.id);
    if (!block) return;

    // Check if it's part of a series
    if (block.seriesId) {
      setPendingBlock(block);
      setSeriesDialogMode('edit');
      setSeriesDialogOpen(true);
    } else {
      handleOpenEdit(block, 'single');
    }
  };

  const handleSeriesAction = (action: SeriesAction) => {
    if (!pendingBlock) return;
    setSeriesDialogOpen(false);

    if (seriesDialogMode === 'edit') {
      handleOpenEdit(pendingBlock, action);
    } else if (seriesDialogMode === 'delete') {
      handleDeleteWithAction(pendingBlock, action);
    }
  };

  const handleDeleteWithAction = async (block: BlockItem, action: SeriesAction) => {
    try {
      if (action === 'single') {
        await employeeApi.deleteBlock(block.employeeId, block.id);
      } else if (action === 'following') {
        await api.delete(`/employees/${block.employeeId}/blocks/${block.id}/and-following`);
      } else if (action === 'all' && block.seriesId) {
        await api.delete(`/employees/${block.employeeId}/blocks/series/${block.seriesId}`);
      }
      await loadBlocks();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error eliminando bloqueo');
    }
  };

  const handleDelete = async (row: BlockItem) => {
    if (row.seriesId) {
      setPendingBlock(row);
      setSeriesDialogMode('delete');
      setSeriesDialogOpen(true);
    } else {
      if (!window.confirm('¿Eliminar bloqueo?')) return;
      await employeeApi.deleteBlock(row.employeeId, row.id);
      await loadBlocks();
    }
  };

  const handleSave = async () => {
    const targetIds = form.employeeId && form.employeeId !== 'all' ? [form.employeeId] : employees.map(e => e.id);
    const action = (editing as any)?._action as SeriesAction || 'single';

    if (dialogMode === 'create') {
      if (form.type === 'recurring') {
        const startDate = (form.date || new Date().toISOString().split('T')[0]);
        const payloadBase: any = {
          startDate,
          startTimeOfDay: round15(form.startTimeOfDay),
          endTimeOfDay: round15(form.endTimeOfDay),
          daysOfWeek: form.daysOfWeek,
          reason: form.reason || undefined,
          forceOverride: form.forceOverride,
        };
        for (const id of targetIds) {
          const payload = { ...payloadBase };
          if (form.until) payload.endDate = form.until;
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
      if (!form.date) { alert('Seleccione fecha'); return; }
      const startISO = new Date(`${form.date}T${round15(form.start)}`).toISOString();
      const endISO = new Date(`${form.date}T${round15(form.end)}`).toISOString();

      if (action === 'single') {
        // Update only this block
        await employeeApi.updateBlock(editing.employeeId, editing.id, {
          startTime: startISO,
          endTime: endISO,
          reason: form.reason || undefined,
          forceOverride: form.forceOverride
        });
      } else if (action === 'following' && editing.seriesId) {
        // Update this and following blocks
        await api.put(`/employees/${editing.employeeId}/blocks/${editing.id}/and-following`, {
          reason: form.reason || undefined,
          startTimeOfDay: round15(form.start),
          endTimeOfDay: round15(form.end),
          forceOverride: form.forceOverride,
        });
      } else if (action === 'all' && editing.seriesId) {
        // Update all blocks in the series
        await api.put(`/employees/${editing.employeeId}/blocks/series/${editing.seriesId}`, {
          reason: form.reason || undefined,
          startTimeOfDay: round15(form.start),
          endTimeOfDay: round15(form.end),
          forceOverride: form.forceOverride,
        });
      }
    }
    setDialogOpen(false);
    await loadBlocks();
  };

  const findEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || '-';

  // Convert blocks to calendar events
  const blockEvents = rows.map(b => ({
    id: b.id,
    title: b.reason || `Bloqueado - ${findEmployeeName(b.employeeId)}`,
    start: b.startTime,
    end: b.endTime,
    backgroundColor: b.seriesId ? '#7986cb' : '#9e9e9e', // Different color for series
    borderColor: b.seriesId ? '#5c6bc0' : '#757575',
    textColor: '#ffffff',
    extendedProps: {
      employeeId: b.employeeId,
      employeeName: findEmployeeName(b.employeeId),
      reason: b.reason,
      seriesId: b.seriesId,
    }
  }));

  // Scroll near current time
  const initialScrollTime = React.useMemo(() => {
    const now = new Date();
    const hh = Math.max(0, now.getHours() - 1).toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}:00`;
  }, []);

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Toolbar sx={{ px: '0 !important' }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 600 }}>Bloqueos</Typography>

          {/* Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ButtonGroup size="small">
              <IconButton onClick={() => calendarRef.current?.getApi().prev()} size="small">
                <ChevronLeft />
              </IconButton>
              <Button onClick={() => calendarRef.current?.getApi().today()} startIcon={<Today />} size="small">
                Hoy
              </Button>
              <IconButton onClick={() => calendarRef.current?.getApi().next()} size="small">
                <ChevronRight />
              </IconButton>
            </ButtonGroup>

            {/* View Buttons */}
            <ButtonGroup size="small">
              <Button
                variant={currentView === 'dayGridMonth' ? 'contained' : 'outlined'}
                onClick={() => handleViewChange('dayGridMonth')}
                startIcon={<ViewModule />}
              >
                Mes
              </Button>
              <Button
                variant={currentView === 'timeGridWeek' ? 'contained' : 'outlined'}
                onClick={() => handleViewChange('timeGridWeek')}
                startIcon={<ViewWeek />}
              >
                Semana
              </Button>
              <Button
                variant={currentView === 'timeGridDay' ? 'contained' : 'outlined'}
                onClick={() => handleViewChange('timeGridDay')}
                startIcon={<ViewDay />}
              >
                Día
              </Button>
            </ButtonGroup>

            <Button startIcon={<Add />} variant="contained" onClick={handleOpenCreate}>Nuevo</Button>
          </Box>
        </Toolbar>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Empleado</InputLabel>
              <Select value={selectedEmployee} label="Empleado" onChange={(e)=> setSelectedEmployee(e.target.value)}>
                <MenuItem value="all">Todos</MenuItem>
                {employees.map((e:any)=> <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                size="small"
                sx={{ backgroundColor: '#9e9e9e', color: 'white' }}
                label="Puntual"
              />
              <Chip
                size="small"
                sx={{ backgroundColor: '#7986cb', color: 'white' }}
                label="Serie recurrente"
              />
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
          datesSet={(arg) => {
            setViewRange({ start: arg.start.toISOString(), end: arg.end.toISOString() });
          }}
          allDaySlot={false}
          slotDuration="00:30:00"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          eventDisplay="block"
        />
      </Paper>

      {/* Series action dialog */}
      <Dialog open={seriesDialogOpen} onClose={() => setSeriesDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {seriesDialogMode === 'edit' ? 'Editar bloqueo recurrente' : 'Eliminar bloqueo recurrente'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Este bloqueo es parte de una serie. ¿Qué desea {seriesDialogMode === 'edit' ? 'editar' : 'eliminar'}?
          </Typography>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleSeriesAction('single')}>
                <ListItemIcon>
                  <Event />
                </ListItemIcon>
                <ListItemText
                  primary="Solo este bloqueo"
                  secondary="Los demás bloqueos de la serie no se modificarán"
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleSeriesAction('following')}>
                <ListItemIcon>
                  <EventRepeat />
                </ListItemIcon>
                <ListItemText
                  primary="Este y los siguientes"
                  secondary="Los bloqueos anteriores no se modificarán"
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleSeriesAction('all')}>
                <ListItemIcon>
                  <Repeat />
                </ListItemIcon>
                <ListItemText
                  primary="Toda la serie"
                  secondary="Se modificarán todos los bloqueos de esta serie"
                />
              </ListItemButton>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeriesDialogOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Edit/Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Nuevo bloqueo' : (
            <>
              Editar bloqueo
              {editing?.seriesId && (
                <Chip
                  size="small"
                  label={
                    (editing as any)?._action === 'all' ? 'Toda la serie' :
                    (editing as any)?._action === 'following' ? 'Este y siguientes' :
                    'Solo este'
                  }
                  sx={{ ml: 1 }}
                  color="primary"
                  variant="outlined"
                />
              )}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Empleado</InputLabel>
                <Select label="Empleado" value={form.employeeId} onChange={(e)=> setForm({ ...form, employeeId: e.target.value as string })} disabled={dialogMode === 'edit'}>
                  <MenuItem value="all">Todos</MenuItem>
                  {employees.map((e:any)=> <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {dialogMode === 'create' && (
              <Grid item xs={12}>
                <ToggleButtonGroup exclusive value={form.type} onChange={(e, val)=> val && setForm({ ...form, type: val })}>
                  <ToggleButton value="recurring">Repetición</ToggleButton>
                  <ToggleButton value="single">Puntual</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            )}

            {form.type === 'recurring' && dialogMode === 'create' ? (
              <>
                <Grid item xs={12}>
                  <TextField fullWidth type="time" label="Hora inicio" InputLabelProps={{ shrink: true }} value={form.startTimeOfDay} inputProps={{ step: 900 }} onChange={(e)=> setForm({ ...form, startTimeOfDay: round15(e.target.value) })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="time" label="Hora fin" InputLabelProps={{ shrink: true }} value={form.endTimeOfDay} inputProps={{ step: 900 }} onChange={(e)=> setForm({ ...form, endTimeOfDay: round15(e.target.value) })} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Días de semana</Typography>
                  <Box>
                    {[0,1,2,3,4,5,6].map(d => (
                      <FormControlLabel key={d} control={<Switch size="small" checked={form.daysOfWeek.includes(d)} onChange={(e)=>{
                        const set = new Set(form.daysOfWeek);
                        if (e.target.checked) set.add(d); else set.delete(d);
                        setForm({ ...form, daysOfWeek: Array.from(set) });
                      }} />} label={['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]} />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="date" label="Repetir hasta (opcional)" InputLabelProps={{ shrink: true }} value={form.until} onChange={(e)=> setForm({ ...form, until: e.target.value })} />
                </Grid>
              </>
            ) : (
              <>
                {/* For editing series (following/all), don't show date field */}
                {!((editing as any)?._action === 'following' || (editing as any)?._action === 'all') && (
                  <Grid item xs={12}>
                    <TextField fullWidth type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e)=> setForm({ ...form, date: e.target.value })} />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField fullWidth type="time" label="Hora inicio" InputLabelProps={{ shrink: true }} value={form.start} inputProps={{ step: 900 }} onChange={(e)=> setForm({ ...form, start: round15(e.target.value) })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth type="time" label="Hora fin" InputLabelProps={{ shrink: true }} value={form.end} inputProps={{ step: 900 }} onChange={(e)=> setForm({ ...form, end: round15(e.target.value) })} />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField fullWidth label="Motivo (opcional)" value={form.reason} onChange={(e)=> setForm({ ...form, reason: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={form.forceOverride} onChange={(e)=> setForm({ ...form, forceOverride: e.target.checked })} />} label="Forzar sobre reservas (las cancela)" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setDialogOpen(false)}>Cancelar</Button>
          {dialogMode === 'edit' && editing && (
            <Button color="error" onClick={async () => {
              setDialogOpen(false);
              await handleDelete(editing);
            }}>
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
