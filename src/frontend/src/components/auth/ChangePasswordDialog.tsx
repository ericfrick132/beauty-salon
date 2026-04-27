import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import api from '../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ChangePasswordDialog: React.FC<Props> = ({ open, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setNewPassword('');
    setConfirm('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { newPassword });
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar contraseña</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">Contraseña actualizada.</Alert>}
          <TextField
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            autoFocus
            disabled={saving || success}
            helperText="Mínimo 8 caracteres."
          />
          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            fullWidth
            disabled={saving || success}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || success}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
