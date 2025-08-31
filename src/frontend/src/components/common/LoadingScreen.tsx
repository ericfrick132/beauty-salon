import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#000000',
        gap: 2,
      }}
    >
      <CircularProgress 
        size={60} 
        sx={{ 
          color: '#FFFF00',
          mb: 2 
        }} 
      />
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#FFFFFF',
          fontWeight: 500 
        }}
      >
        Cargando Turnos Pro...
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          color: '#CCCCCC',
          textAlign: 'center',
          maxWidth: 300
        }}
      >
        Configurando tu experiencia personalizada
      </Typography>
    </Box>
  );
};

export default LoadingScreen;