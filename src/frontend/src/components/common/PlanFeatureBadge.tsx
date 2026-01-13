import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import { CheckCircle, Info, Star } from '@mui/icons-material';
import { useSubscription, PlanFeatures } from '../../contexts/SubscriptionContext';

interface PlanFeatureBadgeProps {
  feature: keyof PlanFeatures;
  label: string;
  showUpgradeHint?: boolean;
  variant?: 'chip' | 'inline' | 'card';
}

export const PlanFeatureBadge: React.FC<PlanFeatureBadgeProps> = ({
  feature,
  label,
  showUpgradeHint = true,
  variant = 'chip'
}) => {
  const { hasFeature, subscription } = useSubscription();
  const isEnabled = hasFeature(feature);

  if (variant === 'inline') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {label}:
        </Typography>
        {isEnabled ? (
          <Chip
            size="small"
            icon={<CheckCircle />}
            label="Incluido"
            color="success"
            variant="outlined"
          />
        ) : (
          <Tooltip title={showUpgradeHint ? "Disponible en planes superiores" : ""}>
            <Chip
              size="small"
              icon={<Info />}
              label="No incluido"
              color="default"
              variant="outlined"
            />
          </Tooltip>
        )}
      </Box>
    );
  }

  if (variant === 'card') {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: isEnabled ? 'success.50' : 'grey.100',
          border: '1px solid',
          borderColor: isEnabled ? 'success.light' : 'grey.300',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isEnabled ? (
            <CheckCircle color="success" fontSize="small" />
          ) : (
            <Info color="disabled" fontSize="small" />
          )}
          <Typography variant="subtitle2">
            {label}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {isEnabled
            ? `Incluido en tu plan ${subscription?.planName || ''}`
            : 'No disponible en tu plan actual'
          }
        </Typography>
      </Box>
    );
  }

  // Default: chip
  return (
    <Tooltip title={isEnabled ? "Incluido en tu plan" : "No incluido en tu plan"}>
      <Chip
        size="small"
        icon={isEnabled ? <CheckCircle /> : <Info />}
        label={label}
        color={isEnabled ? "success" : "default"}
        variant="outlined"
      />
    </Tooltip>
  );
};

// Componente para mostrar el resumen del plan en cards
interface PlanSummaryProps {
  compact?: boolean;
}

export const PlanSummary: React.FC<PlanSummaryProps> = ({ compact = false }) => {
  const { subscription, loading, isUnlimited } = useSubscription();

  if (loading || !subscription) return null;

  const features = subscription.features;
  if (!features) return null;

  const activeFeatures = [
    features.allowWhatsApp && 'WhatsApp',
    features.allowCustomBranding && 'Branding',
    features.allowOnlinePayments && 'Pagos Online',
    features.allowReports && 'Reportes',
    features.allowSmsNotifications && 'SMS',
    features.allowEmailMarketing && 'Email Marketing',
    features.allowMultiLocation && 'Multi-Sucursal',
  ].filter(Boolean);

  if (compact) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {activeFeatures.slice(0, 4).map((feature) => (
          <Chip
            key={feature as string}
            size="small"
            label={feature}
            color="success"
            variant="outlined"
          />
        ))}
        {activeFeatures.length > 4 && (
          <Chip
            size="small"
            label={`+${activeFeatures.length - 4}`}
            color="default"
            variant="outlined"
          />
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Star fontSize="small" color="warning" />
        <Typography variant="subtitle2" fontWeight="bold">
          {subscription.planName}
        </Typography>
        {subscription.isTrialPeriod && (
          <Chip
            size="small"
            label={`${subscription.daysRemaining} dias de prueba`}
            color="warning"
            variant="outlined"
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {activeFeatures.map((feature) => (
          <Chip
            key={feature as string}
            size="small"
            label={feature}
            color="success"
            variant="outlined"
          />
        ))}
      </Box>
      {features.allowWhatsApp && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          WhatsApp: {isUnlimited('whatsAppMonthlyLimit') ? 'Ilimitado' : `${features.whatsAppMonthlyLimit} msgs/mes`}
        </Typography>
      )}
    </Box>
  );
};
