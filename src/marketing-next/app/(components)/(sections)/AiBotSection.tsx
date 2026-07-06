'use client';
import { Box, Button, Container, Grid, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { aiBotContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';
import { useSignupModal } from './SignupModal';

function ChatMock() {
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: palette.paperSoft,
        border: `1.5px solid ${palette.ink}`,
        borderRadius: 2,
        boxShadow: `8px 8px 0 ${palette.ink}`,
        overflow: 'hidden',
        maxWidth: 440,
        mx: { xs: 'auto', md: 0 },
        ml: { md: 'auto' },
      }}
    >
      {/* Chat header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.8,
          borderBottom: `1.5px solid ${palette.ink}`,
          bgcolor: palette.forest,
          color: palette.paperSoft,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `1.5px solid ${palette.paperSoft}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        >
          <SmartToyIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Box sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.2 }}>
            Estudio Belén
          </Box>
          <Box
            sx={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            Agente IA · en línea
          </Box>
        </Box>
        <Box
          sx={{
            ml: 'auto',
            px: 1.2,
            py: 0.4,
            border: `1.5px solid ${palette.paperSoft}`,
            borderRadius: 999,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            bgcolor: palette.amber,
            color: palette.ink,
            fontWeight: 600,
          }}
        >
          IA 24/7
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {aiBotContent.chat.map((msg, i) => {
          const isBot = msg.from === 'bot';
          return (
            <Box key={i} sx={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
              <Box
                sx={{
                  maxWidth: '85%',
                  px: 1.8,
                  py: 1.3,
                  border: `1.5px solid ${palette.ink}`,
                  borderRadius: 2,
                  borderTopLeftRadius: isBot ? 4 : 16,
                  borderTopRightRadius: isBot ? 16 : 4,
                  bgcolor: isBot ? palette.paper : palette.forest,
                  color: isBot ? palette.ink : palette.paperSoft,
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}
              >
                {msg.text}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer stub */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1.5px dashed ${palette.ink}`,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.62rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: palette.inkSoft,
          display: 'flex',
          alignItems: 'center',
          gap: 0.8,
        }}
      >
        <Box sx={{ width: 9, height: 9, bgcolor: palette.forest, border: `1px solid ${palette.ink}`, borderRadius: '2px' }} />
        {aiBotContent.chatFooter}
      </Box>
    </Box>
  );
}

export default function AiBotSection() {
  const { open } = useSignupModal();

  return (
    <Box id="agente-ia" component="section" sx={{ py: { xs: 9, md: 14 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <SectionLabel number="03" label="Agente IA" />
        </AnimatedSection>

        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <AnimatedSection direction="left">
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '2.8rem', lg: '3.2rem' },
                  fontVariationSettings: '"opsz" 144',
                  color: palette.ink,
                  mb: 2.5,
                }}
              >
                Conocé a tu nuevo empleado:{' '}
                <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral }}>
                  un agente IA.
                </Box>
              </Typography>

              <Typography
                sx={{
                  fontSize: '1.02rem',
                  color: palette.inkSoft,
                  lineHeight: 1.65,
                  mb: 3.5,
                  maxWidth: 480,
                }}
              >
                {aiBotContent.description}
              </Typography>

              <Box
                component="ul"
                sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0, mb: 4 }}
              >
                {aiBotContent.bullets.map((bullet, i) => (
                  <Box
                    key={bullet}
                    component="li"
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2,
                      py: 2,
                      borderTop: `1.5px solid ${palette.ink}`,
                      ...(i === aiBotContent.bullets.length - 1 && {
                        borderBottom: `1.5px solid ${palette.ink}`,
                      }),
                    }}
                  >
                    <Box
                      sx={{
                        flexShrink: 0,
                        mt: 0.5,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.7rem',
                        letterSpacing: '0.12em',
                        color: palette.inkSoft,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </Box>
                    <Box sx={{ fontSize: '1rem', color: palette.ink, lineHeight: 1.5 }}>
                      {bullet}
                    </Box>
                  </Box>
                ))}
              </Box>

              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => open()}
                startIcon={<SmartToyIcon />}
                sx={{
                  border: `1.5px solid ${palette.ink}`,
                  boxShadow: `4px 4px 0 ${palette.ink}`,
                  fontWeight: 700,
                  '&:hover': {
                    boxShadow: `6px 6px 0 ${palette.ink}`,
                    transform: 'translate(-2px,-2px)',
                  },
                }}
              >
                {aiBotContent.cta}
              </Button>
            </AnimatedSection>
          </Grid>

          <Grid item xs={12} md={6}>
            <AnimatedSection direction="right">
              <ChatMock />
            </AnimatedSection>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
