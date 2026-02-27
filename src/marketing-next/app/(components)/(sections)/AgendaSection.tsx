'use client';
import { Box, Container, Grid, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AnimatedSection from './AnimatedSection';
import { agendaContent } from '@/app/(lib)/content';

function AgendaMockup() {
  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '4/3',
        borderRadius: 3,
        background: 'linear-gradient(135deg, #2563EB08, #10B98115)',
        border: '1px solid #2563EB22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 280 200" fill="none">
        {/* Calendar grid mockup */}
        <rect x="10" y="10" width="260" height="180" rx="12" fill="#fff" stroke="#2563EB" strokeWidth="1.5" opacity="0.6" />
        <rect x="10" y="10" width="260" height="36" rx="12" fill="#2563EB" opacity="0.1" />
        <text x="140" y="33" textAnchor="middle" fill="#2563EB" fontSize="12" fontWeight="600" opacity="0.7">
          Febrero 2026
        </text>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5, 6].map((col) => (
          <line key={`v${col}`} x1={10 + col * 37.14} y1="46" x2={10 + col * 37.14} y2="190" stroke="#E2E8F0" strokeWidth="0.5" />
        ))}
        {[0, 1, 2, 3].map((row) => (
          <line key={`h${row}`} x1="10" y1={46 + row * 36} x2="270" y2={46 + row * 36} stroke="#E2E8F0" strokeWidth="0.5" />
        ))}
        {/* Some colored blocks representing appointments */}
        <rect x="50" y="52" width="30" height="14" rx="3" fill="#2563EB" opacity="0.3" />
        <rect x="125" y="90" width="30" height="14" rx="3" fill="#10B981" opacity="0.3" />
        <rect x="200" y="70" width="30" height="14" rx="3" fill="#7C3AED" opacity="0.3" />
        <rect x="88" y="126" width="30" height="14" rx="3" fill="#EC4899" opacity="0.25" />
        <rect x="163" y="150" width="30" height="14" rx="3" fill="#2563EB" opacity="0.3" />
      </svg>
    </Box>
  );
}

export default function AgendaSection() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <AnimatedSection direction="left">
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, letterSpacing: '-0.02em' }}>
                {agendaContent.headline}
              </Typography>
              <List disablePadding>
                {agendaContent.bullets.map((bullet) => (
                  <ListItem key={bullet} disableGutters sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={bullet}
                      primaryTypographyProps={{ color: 'text.secondary', lineHeight: 1.6 }}
                    />
                  </ListItem>
                ))}
              </List>
            </AnimatedSection>
          </Grid>
          <Grid item xs={12} md={6}>
            <AnimatedSection direction="right">
              <AgendaMockup />
            </AnimatedSection>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
