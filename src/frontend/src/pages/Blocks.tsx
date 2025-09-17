import React, { useEffect, useMemo, useState } from 'react';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { format } from 'date-fns';
import { employeeApi } from '../services/api';

interface BlockItem {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

const round15 = (hhmm: string) => {
  if (!hhmm) return hhmm;
  const [h, m] = hhmm.split(':').map(n => parseInt(n || '0', 10));
  const floored = m - (m % 15);
  return `${String(h).padStart(2,'0')}:${String(floored).padStart(2,'0')}`;
};

const Blocks: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
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
    if (!from || !to) return;
    setLoading(true);
    try {
      if (selectedEmployee === 'all') {
        const res = await Promise.all(
          employees.map(e => employeeApi.getBlocks(e.id, { from, to }).catch(() => []))
        );
        const flat = res.flat();
        setRows(flat);
      } else {
        const items = await employeeApi.getBlocks(selectedEmployee, { from, to });
        setRows(items);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);
  useEffect(() => {
    // Set default range to current week
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 3);
    start.setHours(0,0,0,0);
    const end = new Date(now);
    end.setDate(now.getDate() + 10);
    end.setHours(23,59,0,0);
    setFrom(start.toISOString());
    setTo(end.toISOString());
  }, []);
  useEffect(() => { if (employees.length) loadBlocks(); }, [employees, selectedEmployee, from, to]);

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

  const handleOpenEdit = (row: BlockItem) => {
    setDialogMode('edit');
    setEditing(row);
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

  const handleDelete = async (row: BlockItem) => {
    if (!window.confirm('¿Eliminar bloqueo?')) return;
    await employeeApi.deleteBlock(row.employeeId, row.id);
    await loadBlocks();
  };

  const handleSave = async () => {
    const targetIds = form.employeeId && form.employeeId !== 'all' ? [form.employeeId] : employees.map(e => e.id);
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
      await employeeApi.updateBlock(editing.employeeId, editing.id, { startTime: startISO, endTime: endISO, reason: form.reason || undefined, forceOverride: form.forceOverride });
    }
    setDialogOpen(false);
    await loadBlocks();
  };

  const findEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || '-';

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Toolbar sx={{ px: '0 !important' }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 600 }}>Bloqueos</Typography>
          <Button startIcon={<Add />} variant="contained" onClick={handleOpenCreate}>Nuevo</Button>
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
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={from ? from.split('T')[0] : ''} onChange={(e)=> setFrom(new Date(`${e.target.value}T00:00`).toISOString())} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={to ? to.split('T')[0] : ''} onChange={(e)=> setTo(new Date(`${e.target.value}T23:59`).toISOString())} />
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Empleado</TableCell>
                <TableCell>Inicio</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{findEmployeeName(r.employeeId)}</TableCell>
                  <TableCell>{format(new Date(r.startTime), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{format(new Date(r.endTime), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{r.reason || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEdit(r)} size="small"><Edit fontSize="small" /></IconButton>
                    <IconButton onClick={() => handleDelete(r)} size="small" color="error"><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === 'create' ? 'Nuevo bloqueo' : 'Editar bloqueo'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Empleado</InputLabel>
                <Select label="Empleado" value={form.employeeId} onChange={(e)=> setForm({ ...form, employeeId: e.target.value as string })}>
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
                <Grid item xs={12}>
                  <TextField fullWidth type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e)=> setForm({ ...form, date: e.target.value })} />
                </Grid>
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
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Blocks;
