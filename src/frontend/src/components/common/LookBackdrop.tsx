import React from 'react';
import { Box } from '@mui/material';
import type { BusinessLook } from '../../config/businessLooks';

/**
 * Fondo sutil con la foto del rubro (barbería, spa…): muy difuminada, con poca opacidad y el color del papel
 * encima para que no compita con el contenido. El contenedor padre tiene que ser position: relative; las
 * tarjetas siguen con su fondo sólido, así que la lectura no cambia.
 */
const LookBackdrop: React.FC<{ look: BusinessLook | null; opacity?: number }> = ({ look, opacity = 0.16 }) => {
  if (!look) return null;
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        // Fundido hacia abajo: arriba se ve el rubro, abajo queda el papel liso.
        maskImage: 'linear-gradient(180deg, #000 0%, #000 35%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 35%, transparent 100%)',
        animation: 'tpBackdropIn 900ms ease both',
        '@keyframes tpBackdropIn': { from: { opacity: 0 } },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: '-40px',
          backgroundImage: `url(${look.images.bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px) saturate(80%)',
          opacity,
        }}
      />
    </Box>
  );
};

export default LookBackdrop;
