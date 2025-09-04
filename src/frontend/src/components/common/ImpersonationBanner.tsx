import React from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ExitToApp as ExitIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { superAdminService } from '../../services/superAdminService';

const ImpersonationBanner: React.FC = () => {
  const isImpersonating = superAdminService.isImpersonating();
  const impersonationContext = superAdminService.getImpersonationContext();

  const handleStopImpersonation = () => {
    if (window.confirm('¿Estás seguro de que deseas volver al panel de Super Admin?')) {
      superAdminService.stopImpersonation();
    }
  };

  if (!isImpersonating || !impersonationContext) {
    return null;
  }

  return (
    <Alert 
      severity="warning" 
      sx={{ 
        mb: 2,
        backgroundColor: '#fff3e0',
        border: '2px solid #ff9800',
        '& .MuiAlert-icon': {
          color: '#f57c00'
        }
      }}
      icon={<WarningIcon />}
    >
      <AlertTitle sx={{ fontWeight: 600, color: '#e65100' }}>
        🔒 Modo Impersonación Activo
      </AlertTitle>
      
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        <PersonIcon sx={{ fontSize: 20, color: '#f57c00' }} />
        <Typography variant="body2" sx={{ color: '#e65100' }}>
          Estás viendo el sistema como:
        </Typography>
        
        <Chip
          label={`${impersonationContext.adminName} (${impersonationContext.adminEmail})`}
          variant="outlined"
          size="small"
          sx={{
            backgroundColor: '#fff',
            borderColor: '#ff9800',
            color: '#e65100',
            fontWeight: 500,
          }}
        />
        
        <Typography variant="body2" sx={{ color: '#e65100' }}>
          en
        </Typography>
        
        <Chip
          label={impersonationContext.tenantName}
          variant="filled"
          size="small"
          sx={{
            backgroundColor: '#f57c00',
            color: '#fff',
            fontWeight: 500,
          }}
        />

        <Box sx={{ flexGrow: 1 }} />
        
        <Button
          variant="contained"
          color="warning"
          size="small"
          startIcon={<ExitIcon />}
          onClick={handleStopImpersonation}
          sx={{
            backgroundColor: '#f57c00',
            color: '#fff',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#ef6c00',
            },
          }}
        >
          Volver a Super Admin
        </Button>
      </Box>

      {impersonationContext.impersonatedAt && (
        <Typography variant="caption" display="block" sx={{ mt: 1, color: '#bf360c' }}>
          Impersonación iniciada: {new Date(impersonationContext.impersonatedAt).toLocaleString('es-ES')}
        </Typography>
      )}
    </Alert>
  );
};

export default ImpersonationBanner;