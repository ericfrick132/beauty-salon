import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@/app/(lib)/brand';
import { blogArticles } from '@/app/(lib)/blog';
import { verticalLinks } from '@/app/(lib)/vertical-links';
import { pageAlternates } from '@/app/(lib)/seo';
import { softwareAppSchema, faqSchema, breadcrumbSchema, articleSchema } from '@/app/(lib)/schema';
import ContentShell from '@/app/(components)/(content)/ContentShell';
import PageHero from '@/app/(components)/(content)/PageHero';
import Prose from '@/app/(components)/(content)/Prose';
import TrialCta from '@/app/(components)/(content)/TrialCta';
import RelatedVerticals from '@/app/(components)/(content)/RelatedVerticals';
import FaqSection from '@/app/(components)/(sections)/FaqSection';
import FinalCta from '@/app/(components)/(sections)/FinalCta';

const article = blogArticles.find((a) => a.slug === 'mejor-sistema-de-turnos-online-argentina')!;

export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: pageAlternates(article.path),
  openGraph: {
    title: article.title,
    description: article.description,
    url: `${brand.brand_domain}${article.path}`,
    siteName: brand.brand_name,
    images: [{ url: brand.og_image, width: 1200, height: 630 }],
    locale: brand.lang,
    type: 'article',
    publishedTime: article.datePublished,
    modifiedTime: article.dateModified,
  },
};

// Datos de competidores: solo lo publicado en sus sitios a septiembre de 2026.
// No agregar nada que no esté acá.
const SOURCE_NOTE = 'según su sitio (septiembre 2026)';

const faqs = [
  {
    q: '¿Hay sistemas de turnos online gratis en Argentina?',
    a: 'Sí. Según sus sitios (septiembre 2026), Gendu tiene un plan gratuito con turnos ilimitados, ReservaSimple es gratis hasta 30 turnos por mes, Turnify es gratis y Turnito es gratis hasta 100 turnos por mes con 5% de comisión. TurnosPro no tiene plan gratuito permanente: ofrece prueba gratis de 7 a 14 días sin tarjeta.',
  },
  {
    q: '¿Conviene un sistema con comisión por turno o una cuota fija?',
    a: 'Depende del volumen. Con pocos turnos, una comisión por turno o un plan gratis limitado suele salir más barato. Con muchos turnos y tickets altos, una cuota fija sin comisión, como la de TurnosPro, termina costando menos y es más previsible.',
  },
  {
    q: '¿Qué sistema de turnos cobra señas con MercadoPago?',
    a: 'TurnosPro integra señas y pagos anticipados con MercadoPago en el flujo de reserva: el dinero entra directo en tu cuenta y no hay comisión por turno. De las otras opciones, solo relevamos lo que publican sobre precios y comisiones, no su manejo de señas.',
  },
  {
    q: '¿Cuánto tarda poner en marcha un sistema de turnos online?',
    a: 'En TurnosPro la puesta a punto lleva unos 15 minutos: creás la cuenta con tu WhatsApp, cargás servicios, precios y profesionales, conectás MercadoPago y compartís el link de tu web de turnos.',
  },
  {
    q: '¿Los recordatorios por WhatsApp salen de mi propio número?',
    a: 'En TurnosPro sí: los recordatorios, las confirmaciones y el agente de IA (add-on) funcionan desde el número de WhatsApp de tu negocio, con tu nombre y tu tono.',
  },
];

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function ArticlePage() {
  const jsonLd = [
    articleSchema({
      headline: article.h1,
      description: article.description,
      path: article.path,
      datePublished: article.datePublished,
      dateModified: article.dateModified,
    }),
    breadcrumbSchema([
      { name: 'Inicio', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: article.h1, path: article.path },
    ]),
    softwareAppSchema(),
    faqSchema(faqs),
  ];

  const byLabel = Object.fromEntries(verticalLinks.map((v) => [v.slug, v.path]));

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <ContentShell>
        <PageHero
          number="01"
          label="Guía"
          h1={article.h1}
          meta={`Publicado el ${fmtDate(article.datePublished)} · Lectura de 7 minutos · Por ${brand.brand_name}`}
          intro={[
            'Si tenés una peluquería, una barbería, un centro de estética o un consultorio, ya sabés que la agenda en papel y el WhatsApp no escalan. La pregunta es qué sistema de turnos online conviene en Argentina hoy: con precios en pesos, cobros por MercadoPago y clientes que viven en WhatsApp.',
            'En esta guía repasamos qué tiene que tener sí o sí, con qué criterios compararlos, cómo se paran las opciones más conocidas (con lo que publican en sus sitios a septiembre de 2026) y cuánto cuesta cada una. La escribimos desde TurnosPro, así que vamos a ser claros sobre dónde somos mejores y dónde no.',
          ]}
          crumbs={[
            { name: 'Inicio', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: 'Mejor sistema de turnos online en Argentina', path: article.path },
          ]}
        />

        <Prose>
          <section>
            <h2>Qué tiene que tener un sistema de turnos online en Argentina</h2>
            <p>
              Un sistema de turnos no es solo un calendario compartido. Para un negocio de servicios en Argentina, el
              mínimo que tiene que resolver es este:
            </p>
            <ul>
              <li>
                <strong>Reservas 24/7 desde tu propio link</strong>, sin que el cliente descargue una app ni se cree
                una cuenta. El link va en Instagram, en el estado de WhatsApp y en Google.
              </li>
              <li>
                <strong>Agenda por profesional</strong> con vista diaria, semanal y mensual, bloqueos de horario y
                turnos recurrentes. Si tenés más de una persona atendiendo, esto no es opcional.
              </li>
              <li>
                <strong>Señas con MercadoPago</strong> integradas en la reserva. En Argentina, MercadoPago es el medio
                que todos tienen, y la seña es la herramienta más efectiva contra las ausencias.
              </li>
              <li>
                <strong>Recordatorios y confirmación por WhatsApp</strong>, idealmente desde tu propio número y no
                desde uno genérico.
              </li>
              <li>
                <strong>Catálogo de servicios con precios y duración</strong>, para que el cliente reserve sabiendo qué
                va a pagar y la agenda sepa cuánto tiempo bloquear.
              </li>
              <li>
                <strong>Reportes</strong> de ocupación y facturación por profesional.
              </li>
              <li>
                <strong>Precio en pesos, sin comisión por turno</strong> y sin permanencia, con soporte en español.
              </li>
            </ul>
            <p>
              Si una herramienta no cumple con las primeras cuatro, probablemente vas a seguir contestando mensajes y
              persiguiendo confirmaciones a mano.
            </p>
          </section>

          <section>
            <h2>Seis criterios para comparar sistemas de turnos</h2>
            <h3>1. Costo real: cuota fija más comisión por turno</h3>
            <p>
              Muchos sistemas se anuncian como gratis y cobran comisión sobre cada turno o sobre cada cobro. Hacé la
              cuenta con tu volumen real: por ejemplo, con un ticket promedio de ARS 15.000, un 5% de comisión son ARS
              750 por turno; a 100 turnos por mes, ARS 75.000. A partir de cierto volumen, una cuota fija es más barata
              y mucho más previsible.
            </p>
            <h3>2. Límite de turnos por mes</h3>
            <p>
              Los planes gratuitos suelen tener un tope de turnos. Está bien para arrancar, pero una barbería con dos
              sillones lo supera en una semana. Fijate qué pasa cuando llegás al límite y cuánto cuesta el plan
              siguiente.
            </p>
            <h3>3. Señas y cobros anticipados</h3>
            <p>
              ¿Podés exigir seña por servicio? ¿La plata entra directo en tu cuenta de MercadoPago o pasa por la
              plataforma? ¿Te cobran comisión por cobrar? Esto define si vas a bajar las ausencias o solo a agendarlas.
            </p>
            <h3>4. WhatsApp: recordatorio, confirmación y desde qué número</h3>
            <p>
              Un recordatorio desde un número desconocido se ignora. Preguntá si sale de tu propio WhatsApp y si el
              sistema entiende la respuesta del cliente o solo manda el aviso.
            </p>
            <h3>5. Agenda multi-profesional y turnos recurrentes</h3>
            <p>
              Cada profesional con su agenda, sus horarios y sus servicios; turnos que se repiten cada semana para los
              pacientes o clientas fijas. Si esto se hace a mano, el sistema te ahorra poco.
            </p>
            <h3>6. Puesta en marcha y soporte</h3>
            <p>
              ¿Cuánto tarda en estar en vivo? ¿Hay soporte para cargar todo? ¿Podés cancelar cuando quieras? Un buen
              sistema se configura en minutos y no te ata con permanencia.
            </p>
          </section>

          <section>
            <h2>Comparativa: Gendu, ReservaSimple, Turnify, Turnito, AgendaPro y TurnosPro</h2>
            <p>
              Los datos de los demás sistemas son los que publican en sus sitios a septiembre de 2026; no relevamos
              funciones que no informen públicamente, por eso hay celdas marcadas como &quot;no relevado&quot;.
            </p>
            <div className="tp-table">
              <table>
                <thead>
                  <tr>
                    <th>Sistema</th>
                    <th>Plan gratuito</th>
                    <th>Planes pagos</th>
                    <th>Comisión</th>
                    <th>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>TurnosPro</strong>
                    </td>
                    <td>Prueba gratis de 7 a 14 días, sin tarjeta</td>
                    <td>ARS 37.500 a 50.000 por mes según compromiso</td>
                    <td>0%</td>
                    <td>Este sitio</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Gendu</strong>
                    </td>
                    <td>Plan gratuito con turnos ilimitados</td>
                    <td>Desde ARS 6.900 por mes</td>
                    <td>0%</td>
                    <td>{SOURCE_NOTE}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>ReservaSimple</strong>
                    </td>
                    <td>Gratis hasta 30 turnos por mes, con recordatorios por WhatsApp y email</td>
                    <td>No relevado</td>
                    <td>No relevado</td>
                    <td>{SOURCE_NOTE}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Turnify</strong>
                    </td>
                    <td>Gratis</td>
                    <td>No relevado</td>
                    <td>No relevado</td>
                    <td>{SOURCE_NOTE}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Turnito</strong>
                    </td>
                    <td>Gratis hasta 100 turnos por mes</td>
                    <td>No relevado</td>
                    <td>5%</td>
                    <td>{SOURCE_NOTE}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>AgendaPro</strong>
                    </td>
                    <td>No relevado</td>
                    <td>No relevado</td>
                    <td>No relevado</td>
                    <td>Producto regional, {SOURCE_NOTE}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <strong>Gendu</strong>, {SOURCE_NOTE}, ofrece un plan gratuito con turnos ilimitados, planes pagos desde
              ARS 6.900 por mes y 0% de comisión: el precio de entrada más bajo de la lista.{' '}
              <strong>ReservaSimple</strong>, {SOURCE_NOTE}, es gratis hasta 30 turnos por mes con recordatorios por
              WhatsApp y email; alcanza para arrancar, con más volumen hay que pasar a un plan pago.
            </p>
            <p>
              <strong>Turnify</strong>, {SOURCE_NOTE}, es gratis. <strong>Turnito</strong>, {SOURCE_NOTE}, es gratis
              hasta 100 turnos por mes con un 5% de comisión. <strong>AgendaPro</strong> es un producto regional, no
              exclusivo del mercado argentino.
            </p>
            <p>
              <strong>TurnosPro</strong> no tiene plan gratuito permanente: tiene prueba gratis sin tarjeta, cuota fija
              en pesos entre ARS 37.500 y 50.000 por mes, 0% de comisión, señas con MercadoPago directo a tu cuenta,
              recordatorios y confirmación por WhatsApp desde tu número, un agente de IA que confirma turnos solo
              (add-on), agenda multi-profesional, reportes, soporte prioritario y app para iPhone.
            </p>
          </section>

          <section>
            <h2>Dónde TurnosPro es mejor y dónde no</h2>
            <p>
              Seamos claros: <strong>TurnosPro no es la opción más barata</strong>. Si atendés vos solo, tenés 20 o 30
              turnos al mes y las ausencias no te duelen, un plan gratuito te alcanza y no tiene sentido pagar una
              cuota.
            </p>
            <p>
              TurnosPro conviene cuando el negocio ya tiene volumen y el problema es otro: turnos que se caen, un
              equipo de varios profesionales, señas que hoy cobrás a mano por WhatsApp y horas perdidas confirmando.
              Ahí las diferencias son concretas:
            </p>
            <ul>
              <li>
                <strong>Sin comisión por turno</strong>: a 200 turnos por mes, la cuota fija sale menos que una comisión
                del 5% con tickets medianos, y sabés de antemano cuánto pagás.
              </li>
              <li>
                <strong>Señas con MercadoPago</strong> configurables por servicio, con la plata en tu cuenta. Los negocios
                que combinan señas y recordatorios con TurnosPro reportan hasta un 80% menos de cancelaciones.
              </li>
              <li>
                <strong>Agente de IA por WhatsApp</strong> desde el número de tu negocio: pide confirmación, entiende la
                respuesta y confirma o libera el horario sin que intervengas.
              </li>
              <li>
                <strong>Agenda multi-profesional y multi-sucursal</strong>, con turnos recurrentes y bloqueos.
              </li>
              <li>
                <strong>Puesta a punto en 15 minutos</strong>, soporte prioritario y sin permanencia.
              </li>
            </ul>
            <p>
              Con un ticket promedio de ARS 15.000, evitar cuatro ausencias por mes ya cubre el plan de 12 meses. Esa es
              la cuenta que tenés que hacer.
            </p>
          </section>

          <section>
            <h2>Cuánto cuesta un sistema de turnos online en Argentina en 2026</h2>
            <p>Con los datos de arriba, el mercado se ordena en tres escalones:</p>
            <ul>
              <li>
                <strong>Gratis con límites o comisión</strong>: ReservaSimple (hasta 30 turnos), Turnito (hasta 100
                turnos, 5% de comisión), Turnify y el plan gratuito de Gendu.
              </li>
              <li>
                <strong>Pago de entrada</strong>: Gendu desde ARS 6.900 por mes, {SOURCE_NOTE}.
              </li>
              <li>
                <strong>Plan completo con cobros, WhatsApp e IA</strong>: TurnosPro, de ARS 37.500 a 50.000 por mes.
              </li>
            </ul>
            <p>Los planes de TurnosPro son un mismo producto con distinto compromiso:</p>
            <ul>
              <li>Plan mensual: ARS 50.000 por mes, 7 días gratis, sin permanencia.</li>
              <li>Plan 3 meses: ARS 45.000 por mes, 14 días gratis.</li>
              <li>Plan 6 meses: ARS 40.000 por mes, 14 días gratis.</li>
              <li>Plan 12 meses: ARS 37.500 por mes, 14 días gratis.</li>
            </ul>
            <p>
              Todos incluyen reservas ilimitadas, cobros con MercadoPago, recordatorios por WhatsApp, agenda
              multi-profesional, reportes y soporte prioritario; el agente de IA es un add-on. Detalle en la{' '}
              <Link href="/#precios">sección de precios de TurnosPro</Link>.
            </p>
          </section>

          <section>
            <h2>Cómo elegir según tu rubro</h2>
            <p>Armamos una guía por rubro con lo que más pesa en cada caso:</p>
            <ul>
              <li>
                <Link href={byLabel['sistema-de-turnos-para-peluquerias']}>Sistema de turnos para peluquerías</Link>:
                agenda por estilista, señas para servicios largos como color y catálogo con precios.
              </li>
              <li>
                <Link href={byLabel['sistema-de-turnos-para-barberias']}>Sistema de turnos para barberías</Link>:
                turnos cortos y muchos por día, reservas desde Instagram y cobros anticipados.
              </li>
              <li>
                <Link href={byLabel['sistema-de-turnos-para-centros-de-estetica']}>
                  Sistema de turnos para centros de estética
                </Link>
                : tratamientos largos, señas obligatorias y agenda por cabina o profesional.
              </li>
              <li>
                <Link href={byLabel['sistema-de-turnos-para-consultorios']}>Sistema de turnos para consultorios</Link>:
                turnos recurrentes, confirmación automática e historial de cada paciente.
              </li>
            </ul>
          </section>

          <section>
            <h2>Conclusión: cuál es el mejor sistema de turnos online en Argentina</h2>
            <p>
              El mejor sistema de turnos online en Argentina es el que resuelve tu problema real al costo que tu
              volumen justifica. Si recién arrancás y tenés pocos turnos, probá una opción gratuita como Gendu,
              ReservaSimple, Turnify o Turnito. Si ya tenés equipo, volumen y ausencias que te cuestan plata, TurnosPro
              te da señas con MercadoPago sin comisión, WhatsApp desde tu número y un agente de IA que confirma por vos,
              por una cuota fija en pesos.
            </p>
            <p>Podés probarlo gratis, sin tarjeta, y tenerlo funcionando en 15 minutos.</p>
          </section>

          <TrialCta label="Probar TurnosPro gratis" secondaryHref="/" secondaryLabel="Ver todas las funciones" />
        </Prose>

        <RelatedVerticals items={verticalLinks} title="Guías de TurnosPro para" number="02" />

        <FaqSection items={faqs} number="03" label="Preguntas" title="Preguntas frecuentes" titleAccent="sobre sistemas de turnos." />

        <FinalCta />
      </ContentShell>
    </>
  );
}
