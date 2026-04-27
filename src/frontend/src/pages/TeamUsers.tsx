import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import { Add, Edit, Block, CheckCircle } from '@mui/icons-material';
import api from '../services/api';
import { ROLE_ADMIN, ROLE_EMPLOYEE, roleLabel } from '../utils/permissions';

interface TenantUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: string;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

interface FormState {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  role: string;
}

const emptyForm: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
  role: ROLE_EMPLOYEE,
};

const ROLE_OPTIONS = [
  { value: ROLE_EMPLOYEE, label: 'Empleado (sin reportes ni facturación)' },
  { value: ROLE_ADMIN, label: 'Administrador (acceso total)' },
];

const TeamUsers: React.FC = () => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TenantUser[]>('/tenant-users');
      setUsers(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (u: TenantUser) => {
    setEditingId(u.id);
    setForm({
      email: u.email,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      phone: u.phone || '',
      password: '',
      role: u.role,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.email.trim() || (!editingId && form.password.length < 8)) {
      setFormError('Email y contraseña (mínimo 8 caracteres) son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const payload: any = {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          role: form.role,
        };
        if (form.password) payload.newPassword = form.password;
        await api.put(`/tenant-users/${editingId}`, payload);
      } else {
        await api.post('/tenant-users', {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          role: form.role,
        });
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error || 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: TenantUser) => {
    try {
      if (u.isActive) {
        await api.delete(`/tenant-users/${u.id}`);
      } else {
        await api.put(`/tenant-users/${u.id}`, { isActive: true });
      }
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo actualizar el usuario.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Equipo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Creá perfiles para tu equipo. Los <b>Empleados</b> no ven reportes ni el panel de facturación.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Agregar usuario
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Último acceso</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      Todavía no hay usuarios. Agregá el primero con el botón de arriba.
                    </TableCell>
                  </TableRow>
                )}
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={roleLabel(u.role)}
                        color={u.role === ROLE_ADMIN ? 'primary' : 'default'}
                        variant={u.role === ROLE_ADMIN ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Chip size="small" label="Activo" color="success" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Inactivo" color="default" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-AR') : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(u)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.isActive ? 'Desactivar' : 'Reactivar'}>
                        <IconButton size="small" onClick={() => toggleActive(u)}>
                          {u.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
              required
              disabled={!!editingId}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Nombre"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                fullWidth
              />
              <TextField
                label="Apellido"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                fullWidth
              />
            </Stack>
            <TextField
              label="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Rol"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              fullWidth
            >
              {ROLE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label={editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              required={!editingId}
              helperText={editingId ? 'Dejá vacío para no cambiarla.' : 'Mínimo 8 caracteres.'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Guardar' : 'Crear usuario'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamUsers;
