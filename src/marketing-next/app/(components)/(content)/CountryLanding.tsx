'use client';
import { Box, Container, Typography } from '@mui/material';
import ContentShell from './ContentShell';
import PageHero from './PageHero';
import Prose from './Prose';
import TrialCta from './TrialCta';
import SectionLabel from '../(sections)/SectionLabel';
import PricingSection from '../(sections)/PricingSection';
import FaqSection from '../(sections)/FaqSection';
import { MARKET_COUNTRIES, type MarketCountryCode } from '@/app/(lib)/countries';
import { palette } from '@/app/(lib)/theme';

/**
 * Landing de TurnosPro para Uruguay, México o España (/uy, /mx, /es). Mismo cascarón, header, modal de
 * alta y sección de precios que la home, con el copy del país (countries.ts), el alta con el país
 * preseleccionado y los precios en su moneda. Recibe solo el código: el contenido (con funciones) vive
 * en countries.ts y se importa del lado del cliente.
 */
export default function CountryLanding({ code }: { code: MarketCountryCode }) {
  const c = MARKET_COUNTRIES[code];

  return (
    <ContentShell country={c}>
      <PageHero
        number="01"
        label={c.hero.label}
        h1={c.hero.h1}
        intro={c.hero.intro}
        crumbs={[
          { name: 'TurnosPro', path: '/' },
          { name: c.name, path: c.path },
        ]}
      >
        <TrialCta label={c.hero.cta} microcopy={c.hero.microcopy} secondaryHref="#precios" secondaryLabel={c.hero.secondary} />
      </PageHero>

      <Box id="beneficios" component="section" sx={{ py: { xs: 7, md: 10 }, bgcolor: palette.paperSoft, borderBottom: `1.5px solid ${palette.ink}` }}>
        <Container maxWidth="lg">
          <SectionLabel number="02" label={c.benefits.label} />
          <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, color: palette.ink, mb: { xs: 4, md: 6 }, maxWidth: 760 }}>
            {c.benefits.title}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
            {c.benefits.items.map((item) => (
              <Box
                key={item.title}
                sx={{
                  p: 3,
                  border: `1.5px solid ${palette.ink}`,
                  borderRadius: 2,
                  bgcolor: palette.paper,
                  boxShadow: `4px 4px 0 ${palette.ink}`,
                }}
              >
                <Typography variant="h3" sx={{ fontSize: '1.25rem', fontWeight: 600, color: palette.ink, mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography sx={{ color: palette.inkSoft, lineHeight: 1.6, fontSize: '0.98rem' }}>{item.text}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Box id="como-funciona" component="section" sx={{ py: { xs: 7, md: 10 }, bgcolor: palette.paper }}>
        <Container maxWidth="md">
          <SectionLabel number="03" label={c.how.label} />
          <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, color: palette.ink, mb: 4 }}>
            {c.how.title}
          </Typography>
          <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
            {c.how.steps.map((step, i) => (
              <Box component="li" key={step} sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
                <Box
                  component="span"
                  sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.8rem', color: palette.coral, fontWeight: 700, minWidth: 28 }}
                >
                  0{i + 1}
                </Box>
                <Typography sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, color: palette.ink, lineHeight: 1.6 }}>{step}</Typography>
              </Box>
            ))}
          </Box>
          <TrialCta label={c.hero.cta} microcopy={c.hero.microcopy} />
        </Container>
      </Box>

      <Prose>
        {c.sections.map((s) => (
          <section key={s.h2}>
            <h2>{s.h2}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {s.bullets && (
              <ul>
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </Prose>

      <PricingSection />

      <FaqSection items={c.faqs} number="05" title={c.faqTitle} titleAccent={c.faqAccent} />

      <Box component="section" sx={{ py: { xs: 6, md: 8 }, bgcolor: palette.paperDeep, borderTop: `1.5px solid ${palette.ink}` }}>
        <Container maxWidth="md">
          <TrialCta label={c.hero.cta} microcopy={c.hero.microcopy} align="center" />
        </Container>
      </Box>
    </ContentShell>
  );
}
