import React from 'react';
import { Container, Typography, Box, Fab } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import CalendarView from '../components/calendar/CalendarView';
import { useTenant } from '../contexts/TenantContext';

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { getTerm } = useTenant();

  return (
    <Container maxWidth={false} sx={{ py: 0, px: 0, height: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ height: '100%' }}
      >
        <CalendarView />
        
        {/* Floating Action Button to create new booking */}
        <Fab
          color="primary"
          aria-label="nueva cita"
          onClick={() => navigate('/new-booking')}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <Add />
        </Fab>
      </motion.div>
    </Container>
  );
};

export default Calendar;