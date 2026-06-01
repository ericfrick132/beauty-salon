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
  // En el primer ingreso de cuentas creadas sin contraseña (magic link),
  // forzamos definir una contraseña: no se puede cancelar ni cerrar hasta crearla.
  forced?: boolean;
}

const ChangePasswordDialog: React.FC<Props> = ({ open, onClose, forced = false }) => {
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
    // En modo forzado solo se puede salir una vez creada la contraseña.
    if (forced && !success) return;
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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={forced}
    >
      <DialogTitle>{forced ? 'Creá tu contraseña' : 'Cambiar contraseña'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {forced && !success && (
            <Alert severity="info">
              Tu cuenta se creó sin contraseña. Definí una para poder volver a
              entrar más adelante con tu email.
            </Alert>
          )}
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
        {!forced && <Button onClick={handleClose} disabled={saving}>Cancelar</Button>}
        <Button onClick={handleSubmit} variant="contained" disabled={saving || success}>
          {saving ? 'Guardando…' : forced ? 'Crear contraseña' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
