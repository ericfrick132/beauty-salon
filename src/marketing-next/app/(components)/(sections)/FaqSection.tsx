'use client';
import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AnimatedSection from './AnimatedSection';
import { faqs } from '@/app/(lib)/content';

export default function FaqSection() {
  return (
    <Box id="faq" component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <AnimatedSection>
          <Typography
            variant="h3"
            sx={{ textAlign: 'center', fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}
          >
            Preguntas frecuentes
          </Typography>
          <Typography
            variant="body1"
            sx={{ textAlign: 'center', color: 'text.secondary', mb: 6 }}
          >
            Todo lo que necesitás saber antes de empezar.
          </Typography>
        </AnimatedSection>

        {faqs.map((faq, i) => (
          <AnimatedSection key={faq.q} delay={i * 0.05}>
            <Accordion
              elevation={0}
              disableGutters
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:not(:last-of-type)': { borderBottom: 0 },
                '&::before': { display: 'none' },
                '&:first-of-type': { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
                '&:last-of-type': { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {faq.q}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 2.5 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {faq.a}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </AnimatedSection>
        ))}
      </Container>
    </Box>
  );
}
