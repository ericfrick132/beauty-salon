import Link from 'next/link';
import type { VerticalContent } from '@/app/(lib)/verticals';
import { verticalLinks, blogLinks } from '@/app/(lib)/vertical-links';
import ContentShell from './ContentShell';
import PageHero from './PageHero';
import Prose from './Prose';
import TrialCta from './TrialCta';
import PricingSnippet from './PricingSnippet';
import RelatedVerticals from './RelatedVerticals';
import FaqSection from '../(sections)/FaqSection';
import FinalCta from '../(sections)/FinalCta';

/**
 * Plantilla de landing por vertical (server component). Renderiza el contenido
 * de verticals.ts con los componentes de la home. El JSON-LD lo emite cada page.tsx.
 */
export default function VerticalLanding({ v }: { v: VerticalContent }) {
  const others = verticalLinks.filter((x) => x.slug !== v.slug);
  const label = v.label.toLowerCase();

  return (
    <ContentShell>
      <PageHero
        number="01"
        label={v.eyebrow}
        h1={v.h1}
        intro={v.intro}
        crumbs={[
          { name: 'Inicio', path: '/' },
          { name: v.label, path: v.path },
        ]}
      >
        <TrialCta label="Empezar gratis" secondaryHref="/#precios" secondaryLabel="Ver precios" />
      </PageHero>

      <Prose>
        {v.sections.map((s) => (
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
            {s.after?.map((p, i) => (
              <p key={`after-${i}`}>{p}</p>
            ))}
          </section>
        ))}

        <div className="tp-callout">
          <p>
            <strong>Más de 1.200 turnos por mes</strong> pasan por TurnosPro. Es el mismo producto para todos los
            rubros: si querés ver todas las funciones, mirá la <Link href="/">página principal de TurnosPro</Link>; si
            estás comparando opciones, leé{' '}
            <Link href={blogLinks[0].path}>cuál es el mejor sistema de turnos online en Argentina</Link>.
          </p>
        </div>
      </Prose>

      <PricingSnippet
        title={`Precios de TurnosPro para ${label}`}
        intro={`Mismo plan para ${label} que para cualquier otro rubro: reservas ilimitadas, señas con MercadoPago, recordatorios por WhatsApp y agenda por profesional. Cuanto más largo el compromiso, más barato el mes.`}
      />

      <RelatedVerticals items={others} />

      <FaqSection
        items={v.faqs}
        number="05"
        label="Preguntas"
        title={`Preguntas frecuentes de ${label}`}
        titleAccent="antes de empezar."
      />

      <FinalCta />
    </ContentShell>
  );
}
