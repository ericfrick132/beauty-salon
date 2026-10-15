import React from 'react';
import { Alert, Box } from '@mui/material';
import { useTenantMoney } from '../../hooks/useTenantMoney';

type CountryFeature = 'arcaInvoicing' | 'chytapay' | 'transferDetection';

/**
 * Pantallas que existen solo en algunos países (ARCA, Chytapay y detección de transferencias son
 * de Argentina). Si el negocio es de otro país muestra un aviso en lugar de la página.
 */
const CountryFeatureGate: React.FC<{ feature: CountryFeature; children: React.ReactNode }> = ({ feature, children }) => {
  const { features, country } = useTenantMoney();
  if (features[feature]) return <>{children}</>;
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="info">Esta función todavía no está disponible para negocios de {country.name}.</Alert>
    </Box>
  );
};

export default CountryFeatureGate;
