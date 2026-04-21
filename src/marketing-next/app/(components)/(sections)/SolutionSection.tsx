'use client';
import { Box, Container, Grid, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { solutionContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

export default function SolutionSection() {
  return (
    <Box component="section" sx={{ py: { xs: 9, md: 14 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <SectionLabel number="01" label="La solución" />
        </AnimatedSection>

        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="flex-end">
          <Grid item xs={12} md={7}>
            <AnimatedSection>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.2rem', md: '3.4rem', lg: '4rem' },
                  fontVariationSettings: '"opsz" 144',
                  color: palette.ink,
                  maxWidth: 720,
                }}
              >
                Una solución integral{' '}
                <Box
                  component="span"
                  sx={{ fontStyle: 'italic', color: palette.coral, fontWeight: 500 }}
                >
                  para tu negocio.
                </Box>
              </Typography>
            </AnimatedSection>
          </Grid>
          <Grid item xs={12} md={5}>
            <AnimatedSection delay={0.1}>
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.05rem' },
                  color: palette.inkSoft,
                  lineHeight: 1.7,
                  borderLeft: `2px solid ${palette.ink}`,
                  pl: 2.5,
                }}
              >
                {solutionContent.description}
              </Typography>
            </AnimatedSection>
          </Grid>
        </Grid>

        {/* Two horizontal "agenda entry" blocks instead of generic stacked images */}
        <Box sx={{ mt: { xs: 7, md: 10 } }}>
          {solutionContent.blocks.map((block, i) => (
            <AnimatedSection key={block.title} delay={i * 0.12}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '88px 1fr 1fr' },
                  gap: { xs: 3, md: 6 },
                  alignItems: 'flex-start',
                  py: { xs: 4, md: 5 },
                  borderTop: `1.5px solid ${palette.ink}`,
                  ...(i === solutionContent.blocks.length - 1 && {
                    borderBottom: `1.5px solid ${palette.ink}`,
                  }),
                }}
              >
                <Box
                  sx={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '0.78rem',
                    letterSpacing: '0.14em',
                    color: palette.inkSoft,
                    pt: { md: 1 },
                  }}
                >
                  PASO {String(i + 1).padStart(2, '0')}
                </Box>
                <Box>
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: { xs: '1.6rem', md: '2.1rem' },
                      color: palette.ink,
                      mb: { xs: 1.5, md: 0 },
                    }}
                  >
                    {block.title}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: { xs: '1rem', md: '1.05rem' },
                      color: palette.inkSoft,
                      lineHeight: 1.65,
                    }}
                  >
                    {block.description}
                  </Typography>
                </Box>
              </Box>
            </AnimatedSection>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
