import React, { useState, useMemo } from 'react';
import { Box, Container, Paper, Tabs, Tab, Typography } from '@mui/material';
import { WhatsApp, Tune, CreditCard, Assessment } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import WhatsAppSettings from './WhatsAppSettings';
import MessagingSettings from './MessagingSettings';
import MessagingCredits from './MessagingCredits';
import MessageHistory from './MessageHistory';

const TABS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: <WhatsApp fontSize="small" />, component: WhatsAppSettings },
  { key: 'recordatorios', label: 'Recordatorios', icon: <Tune fontSize="small" />, component: MessagingSettings },
  { key: 'creditos', label: 'Créditos', icon: <CreditCard fontSize="small" />, component: MessagingCredits },
  { key: 'historial', label: 'Historial', icon: <Assessment fontSize="small" />, component: MessageHistory },
];

const MessagingHub: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialIndex = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const idx = TABS.findIndex((t) => t.key === tab);
    return idx >= 0 ? idx : 0;
  }, [location.search]);

  const [index, setIndex] = useState(initialIndex);

  const handleChange = (_: React.SyntheticEvent, newIndex: number) => {
    setIndex(newIndex);
    const params = new URLSearchParams(location.search);
    params.set('tab', TABS[newIndex].key);
    navigate({ search: params.toString() }, { replace: true });
  };

  const Active = TABS[index].component;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Mensajería
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Conectá WhatsApp, configurá recordatorios automáticos y administrá tus créditos.
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Tabs
          value={index}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 56 },
          }}
        >
          {TABS.map((t) => (
            <Tab key={t.key} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      <Box>
        <Active />
      </Box>
    </Container>
  );
};

export default MessagingHub;
