/**
 * Sitio público por país: Argentina es la home de siempre ('/'); Uruguay, México y España tienen su
 * landing (/uy, /mx, /es) con copy local y precios en la moneda con la que se cobra la suscripción
 * (UY en dólares, MX en pesos mexicanos, ES en euros: lo devuelve /api/subscription-plans?country=XX).
 *
 * Voz: Uruguay voseo ("elegí", "turno", "seña"); México y España tú ("elige", "cita") con
 * "anticipo" (MX) y "señal" + "móvil" (ES). España cobra la señal con tarjeta (Stripe), no con Mercado Pago.
 */

import { buildPlanComparison, pricingContent, type PlanCode, type PlanComparisonCopy } from './content';

export type CountryCode = 'AR' | 'UY' | 'MX' | 'ES';
export type MarketCountryCode = Exclude<CountryCode, 'AR'>;

export interface CountryFaq {
  q: string;
  a: string;
}

export interface CountrySection {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface CountryPlanCopy {
  tagline: string;
  features: string[];
}

export interface CountryCopy {
  /** Texto del modal de alta. */
  signup: {
    ribbon: string;
    title: string;
    subtitle: string;
    button: string;
    sending: string;
    finePrint: string;
    passwordLink: string;
    sendError: string;
  };
  pricing: {
    headline: string;
    /** Palabra del titular que va en cursiva coral. */
    accent: string;
    subheadline: string;
    microcopy: string;
    perMonth: string;
    /** Nota bajo el precio del plan Gratuito. */
    freeNote: string;
    /** Nota bajo el precio de los planes pagos (moneda). */
    paidNote: string;
    /** Aclaración de la comisión por cobro online, debajo de las tarjetas. */
    commissionNote: string;
    /** Bajada y bullets de cada plan en la voz del país (mismo orden que pricingContent). */
    plans: Record<PlanCode, CountryPlanCopy>;
    /** Tabla "Compará los planes", ejemplo de comisión, packs y FAQ de precios. */
    comparison: PlanComparisonCopy;
  };
  footerTagline: string;
  footerFindUs: string;
}

export interface MarketCountry {
  code: MarketCountryCode;
  /** Valor de ?pais= y path de la landing. */
  slug: 'uy' | 'mx' | 'es';
  path: '/uy' | '/mx' | '/es';
  name: string;
  hreflang: 'es-UY' | 'es-MX' | 'es-ES';
  /** Moneda de la suscripción a la plataforma (CountryProfile.PlatformCurrency del backend). */
  currency: 'USD' | 'MXN' | 'EUR';
  /** Código de discado que preselecciona el alta. */
  dial: string;
  meta: { title: string; description: string };
  hero: { label: string; h1: string; intro: string[]; cta: string; microcopy: string; secondary: string };
  benefits: { label: string; title: string; items: { title: string; text: string }[] };
  how: { label: string; title: string; steps: string[] };
  sections: CountrySection[];
  faqs: CountryFaq[];
  faqTitle: string;
  faqAccent: string;
  pricingSnippet: { title: string; intro: string };
  copy: CountryCopy;
}

const tuSignup = (deposit: string): CountryCopy['signup'] => ({
  ribbon: '⚡ GRATIS PARA SIEMPRE · SIN TARJETA · LISTO EN 2 MIN',
  title: 'Crea tu cuenta gratis',
  subtitle: 'Sin contraseña: te enviamos un código por email y entras directo. Gratis para siempre, sin tarjeta.',
  button: 'Empezar gratis',
  sending: 'Enviando código...',
  finePrint: `Te enviamos un código de 6 dígitos a tu email para confirmar y armas tu agenda: rubro, servicios, horarios y ${deposit}. No te pedimos tarjeta.`,
  passwordLink: 'Prefiero crear usuario y contraseña',
  sendError: 'No pudimos enviar el código. Inténtalo de nuevo.',
});

/** La transferencia automática (TransferDetection) hoy solo funciona en Argentina: afuera no se ofrece. */
const AUTO_TRANSFER = 'Transferencia bancaria automática';

/**
 * Uruguay y México conectan Mercado Pago pegando credenciales: con ese token no se puede cobrar
 * marketplace_fee, así que ahí ningún plan tiene comisión por cobro (en España sí, vía Stripe).
 */
const withoutCommission = (plans: Record<PlanCode, CountryPlanCopy>): Record<PlanCode, CountryPlanCopy> =>
  Object.fromEntries(
    Object.entries(plans).map(([code, p]) => [
      code,
      { ...p, features: p.features.map((f) => (/comisión por cobro/.test(f) ? 'Sin comisión por cobro' : f)) },
    ]),
  ) as Record<PlanCode, CountryPlanCopy>;

/** Uruguay usa la misma voz que Argentina (vos, turnos, Mercado Pago), sin la transferencia automática. */
const voseoPlans = Object.fromEntries(
  pricingContent.plans.map((p) => [p.code, { tagline: p.tagline, features: p.features.filter((f) => f !== AUTO_TRANSFER) }]),
) as Record<PlanCode, CountryPlanCopy>;

/** México y España: tú y "citas". España cobra con tarjeta (Stripe) en vez de Mercado Pago. */
const tuPlans = (opts: { perMonth: string; payments: string }): Record<PlanCode, CountryPlanCopy> => ({
  free: {
    tagline: 'Para empezar a recibir citas online.',
    features: [
      `100 citas ${opts.perMonth}`,
      'Hasta 3 agendas',
      '1 servicio por agenda',
      opts.payments,
      'Panel de métricas',
      '5% de comisión por cobro',
    ],
  },
  plus: {
    tagline: 'Un plus en la gestión de tus citas.',
    features: [
      `200 citas ${opts.perMonth}`,
      'Hasta 5 agendas',
      'Servicios ilimitados',
      'Recordatorios automáticos',
      `30 mensajes de WhatsApp ${opts.perMonth}`,
      '2% de comisión por cobro',
    ],
  },
  advance: {
    tagline: 'Para ordenar y automatizar todas tus citas.',
    features: [
      'Citas y agendas ilimitadas',
      `100 mensajes de WhatsApp ${opts.perMonth}`,
      'Citas recurrentes',
      'Un campo personalizado en el formulario',
      'Cupones de descuento',
      '1% de comisión por cobro',
    ],
  },
  pro_v2: {
    tagline: 'Sin límites ni fricciones.',
    features: [
      'Todo lo del plan Advance',
      `250 mensajes de WhatsApp ${opts.perMonth}`,
      'Citas recurrentes ilimitadas',
      'Campos personalizados ilimitados',
      'Ficha e historial de clientes',
      'Píxel y Google Analytics',
      'Sin comisión por cobro',
    ],
  },
});

export const MARKET_COUNTRIES: Record<MarketCountryCode, MarketCountry> = {
  UY: {
    code: 'UY',
    slug: 'uy',
    path: '/uy',
    name: 'Uruguay',
    hreflang: 'es-UY',
    currency: 'USD',
    dial: '+598',
    meta: {
      title: 'TurnosPro Uruguay | Agenda de turnos online con señas y WhatsApp',
      description:
        'Sistema de turnos online para negocios de Uruguay: reservas 24/7, señas con Mercado Pago y recordatorios por WhatsApp. Plan gratuito para siempre, sin tarjeta.',
    },
    hero: {
      label: 'TurnosPro en Uruguay',
      h1: 'Tu agenda de turnos online, con señas y recordatorios por WhatsApp',
      intro: [
        'Tus clientes reservan solos las 24 horas desde tu página de turnos, pagan la seña con Mercado Pago y reciben el recordatorio por WhatsApp. Vos te olvidás de anotar en el cuaderno y de perseguir confirmaciones.',
        'Hecho para peluquerías, barberías, centros de estética, consultorios y profesionales independientes de Montevideo y todo Uruguay. Precios en dólares, horario de Montevideo y teléfonos +598.',
      ],
      cta: 'Empezar gratis',
      microcopy: 'Gratis para siempre · Sin tarjeta · Listo en 15 minutos',
      secondary: 'Ver precios',
    },
    benefits: {
      label: 'Beneficios',
      title: 'Menos ausencias, más turnos cobrados',
      items: [
        { title: 'Reservas 24/7', text: 'Tu página de turnos con tus servicios, profesionales y horarios. Los clientes eligen y reservan sin escribirte.' },
        { title: 'Señas con Mercado Pago', text: 'Conectás tu cuenta de Mercado Pago Uruguay y el turno se confirma recién cuando entra la seña, en pesos uruguayos.' },
        { title: 'Recordatorios por WhatsApp', text: 'Mensajes automáticos antes del turno, con opción de confirmar o cancelar. Menos huecos en la agenda.' },
        { title: 'Agenda multi-profesional', text: 'Cada profesional con su agenda, sus servicios y sus horarios, todo en un mismo panel desde el celular o la compu.' },
      ],
    },
    how: {
      label: 'Cómo funciona',
      title: 'Listo en tres pasos',
      steps: [
        'Creá tu cuenta gratis y cargá tus servicios, precios y horarios.',
        'Conectá Mercado Pago para cobrar señas y compartí tu link de turnos en Instagram y WhatsApp.',
        'Tus clientes reservan solos y TurnosPro les manda los recordatorios.',
      ],
    },
    sections: [
      {
        h2: 'Un sistema de turnos pensado para Uruguay',
        paragraphs: [
          'Los montos se muestran en pesos uruguayos, la agenda usa el horario de Montevideo y los teléfonos de tus clientes van con +598, así los recordatorios por WhatsApp llegan bien.',
          'Arrancás gratis en el plan Gratuito, sin tarjeta y para siempre. Si te pasás a un plan pago, la suscripción se paga en dólares con tarjeta y sin permanencia.',
        ],
      },
    ],
    faqs: [
      { q: '¿Funciona en Uruguay?', a: 'Sí. TurnosPro trabaja con pesos uruguayos, el horario de Montevideo y teléfonos +598 para los recordatorios por WhatsApp.' },
      { q: '¿Cómo cobro las señas?', a: 'Conectás tu cuenta de Mercado Pago Uruguay con tus credenciales y cada reserva online te pide la seña antes de confirmar el turno. La plata va directo a tu cuenta.' },
      { q: '¿En qué moneda pago la suscripción?', a: 'Los planes pagos se pagan en dólares con tarjeta. Tus clientes te pagan en pesos uruguayos.' },
      { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, no hay permanencia: bajás al plan Gratuito o cancelás desde el panel en un clic.' },
    ],
    faqTitle: 'Lo que todos preguntan',
    faqAccent: 'antes de empezar.',
    pricingSnippet: {
      title: 'Precios de TurnosPro en Uruguay',
      intro: 'Arrancás gratis y te pasás de plan cuando lo necesitás. Precios en dólares por mes.',
    },
    copy: {
      signup: {
        ribbon: '⚡ GRATIS PARA SIEMPRE · SIN TARJETA · LISTO EN 2 MIN',
        title: 'Creá tu cuenta gratis',
        subtitle: 'Sin contraseña: te mandamos un código por email y entrás directo. Gratis para siempre, sin tarjeta.',
        button: 'Empezar gratis',
        sending: 'Enviando código...',
        finePrint: 'Te mandamos un código de 6 dígitos a tu email para confirmar y armás tu agenda: rubro, servicios y horarios. No te pedimos tarjeta.',
        passwordLink: 'Prefiero crear usuario y contraseña',
        sendError: 'No pudimos enviar el código. Intentá de nuevo.',
      },
      pricing: {
        headline: 'Empezá gratis. Pasate de plan cuando lo necesites.',
        accent: 'gratis',
        subheadline:
          'Todos los negocios arrancan en el plan Gratuito: 100 reservas por mes, sin tarjeta y para siempre. Cuando necesitás más agendas, recordatorios o WhatsApp, te pasás de plan desde el panel.',
        microcopy: 'Sin permanencia · Sin tarjeta para empezar · Precios en dólares',
        perMonth: '/ mes',
        freeNote: 'Gratis siempre. Sin tarjeta.',
        paidNote: 'Precio final en dólares.',
        commissionNote:
          'En Uruguay no cobramos comisión por los cobros online: lo que cobrás con Mercado Pago es todo tuyo (aparte de la comisión de Mercado Pago).',
        plans: withoutCommission(voseoPlans),
        comparison: buildPlanComparison({
          voice: 'vos',
          payments: 'mp',
          autoTransfer: false,
          noCommission: true,
          example:
            'Un turno de US$ 20 cobrado online con Mercado Pago: en cualquier plan te llegan los US$ 20 (menos la comisión de Mercado Pago). TurnosPro no se queda con nada del cobro.',
        }),
      },
      footerTagline: 'Reservas online, cobros con seña y recordatorios por WhatsApp. Construido para profesionales independientes y pequeños negocios.',
      footerFindUs: 'Encontranos en:',
    },
  },

  MX: {
    code: 'MX',
    slug: 'mx',
    path: '/mx',
    name: 'México',
    hreflang: 'es-MX',
    currency: 'MXN',
    dial: '+52',
    meta: {
      title: 'TurnosPro México | Agenda de citas en línea con anticipos y WhatsApp',
      description:
        'Sistema de citas en línea para negocios de México: reservas 24/7, anticipos con Mercado Pago y recordatorios por WhatsApp. Plan gratuito para siempre, sin tarjeta.',
    },
    hero: {
      label: 'TurnosPro en México',
      h1: 'Tu agenda de citas en línea, con anticipos y recordatorios por WhatsApp',
      intro: [
        'Tus clientes agendan solos las 24 horas desde tu página de citas, pagan el anticipo con Mercado Pago y reciben el recordatorio por WhatsApp. Tú te olvidas de la libreta y de perseguir confirmaciones.',
        'Hecho para estéticas, barberías, salones de belleza, consultorios y profesionales independientes de CDMX, Guadalajara, Monterrey y todo México. Precios en pesos mexicanos y celulares +52.',
      ],
      cta: 'Empezar gratis',
      microcopy: 'Gratis para siempre · Sin tarjeta · Listo en 15 minutos',
      secondary: 'Ver precios',
    },
    benefits: {
      label: 'Beneficios',
      title: 'Menos citas perdidas, más anticipos cobrados',
      items: [
        { title: 'Citas 24/7', text: 'Tu página de citas con tus servicios, profesionales y horarios. Tus clientes eligen y reservan sin escribirte.' },
        { title: 'Anticipos con Mercado Pago', text: 'Conectas tu cuenta de Mercado Pago México y la cita se confirma cuando entra el anticipo, en pesos mexicanos.' },
        { title: 'Recordatorios por WhatsApp', text: 'Mensajes automáticos antes de la cita, con opción de confirmar o cancelar. Menos huecos en tu agenda.' },
        { title: 'Agenda para todo tu equipo', text: 'Cada profesional con su agenda, sus servicios y sus horarios, todo en un mismo panel desde el celular o la computadora.' },
      ],
    },
    how: {
      label: 'Cómo funciona',
      title: 'Listo en tres pasos',
      steps: [
        'Crea tu cuenta gratis y carga tus servicios, precios y horarios.',
        'Conecta Mercado Pago para cobrar anticipos y comparte tu link de citas en Instagram y WhatsApp.',
        'Tus clientes agendan solos y TurnosPro les envía los recordatorios.',
      ],
    },
    sections: [
      {
        h2: 'Un sistema de citas pensado para México',
        paragraphs: [
          'Los montos se muestran en pesos mexicanos, la agenda usa el horario del centro de México y los celulares de tus clientes van con +52, así los recordatorios por WhatsApp llegan bien.',
          'Empiezas gratis en el plan Gratuito, sin tarjeta y para siempre. Si te pasas a un plan de pago, la suscripción se paga en pesos mexicanos con tarjeta y sin plazo forzoso.',
        ],
      },
    ],
    faqs: [
      { q: '¿Funciona en México?', a: 'Sí. TurnosPro trabaja con pesos mexicanos, el horario del centro de México y celulares +52 para los recordatorios por WhatsApp.' },
      { q: '¿Cómo cobro los anticipos?', a: 'Conectas tu cuenta de Mercado Pago México con tus credenciales y cada cita en línea pide el anticipo antes de confirmarse. El dinero llega directo a tu cuenta.' },
      { q: '¿En qué moneda pago la suscripción?', a: 'Los planes de pago se pagan en pesos mexicanos, con tarjeta. Tus clientes también te pagan en pesos mexicanos.' },
      { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, no hay plazo forzoso: vuelves al plan Gratuito o cancelas desde el panel en un clic.' },
    ],
    faqTitle: 'Lo que todos preguntan',
    faqAccent: 'antes de empezar.',
    pricingSnippet: {
      title: 'Precios de TurnosPro en México',
      intro: 'Empiezas gratis y cambias de plan cuando lo necesitas. Precios mensuales en pesos mexicanos.',
    },
    copy: {
      signup: tuSignup('anticipos'),
      pricing: {
        headline: 'Empieza gratis. Cambia de plan cuando lo necesites.',
        accent: 'gratis',
        subheadline:
          'Todos los negocios empiezan en el plan Gratuito: 100 citas por mes, sin tarjeta y para siempre. Cuando necesitas más agendas, recordatorios o WhatsApp, cambias de plan desde el panel.',
        microcopy: 'Sin plazo forzoso · Sin tarjeta para empezar · Precios en pesos mexicanos',
        perMonth: '/ mes',
        freeNote: 'Gratis siempre. Sin tarjeta.',
        paidNote: 'Precio final en pesos mexicanos.',
        commissionNote:
          'En México no cobramos comisión por los cobros en línea: lo que cobras con Mercado Pago es todo tuyo (aparte de la comisión de Mercado Pago).',
        plans: withoutCommission(tuPlans({ perMonth: 'por mes', payments: 'Cobros con Mercado Pago y transferencia' })),
        comparison: buildPlanComparison({
          voice: 'tu',
          payments: 'mp',
          autoTransfer: false,
          noCommission: true,
          example:
            'Una cita de $400 MXN cobrada en línea con Mercado Pago: en cualquier plan te llegan los $400 MXN (menos la comisión de Mercado Pago). TurnosPro no se queda con nada del cobro.',
        }),
      },
      footerTagline: 'Citas en línea, cobro de anticipos y recordatorios por WhatsApp. Hecho para profesionales independientes y pequeños negocios.',
      footerFindUs: 'Encuéntranos en:',
    },
  },

  ES: {
    code: 'ES',
    slug: 'es',
    path: '/es',
    name: 'España',
    hreflang: 'es-ES',
    currency: 'EUR',
    dial: '+34',
    meta: {
      title: 'TurnosPro España | Agenda de citas online con señal y WhatsApp',
      description:
        'Software de citas online para negocios de España: reservas 24/7, señal con tarjeta y recordatorios por WhatsApp. Plan gratuito para siempre, sin tarjeta.',
    },
    hero: {
      label: 'TurnosPro en España',
      h1: 'Tu agenda de citas online, con señal y recordatorios por WhatsApp',
      intro: [
        'Tus clientes reservan solos las 24 horas desde tu página de citas, pagan la señal con tarjeta y reciben el recordatorio por WhatsApp. Tú te olvidas de la libreta y de perseguir confirmaciones.',
        'Hecho para peluquerías, barberías, centros de estética, clínicas y profesionales autónomos de Madrid, Barcelona, Valencia y toda España. Precios en euros, horario peninsular y móviles +34.',
      ],
      cta: 'Empezar gratis',
      microcopy: 'Gratis para siempre · Sin tarjeta · Listo en 15 minutos',
      secondary: 'Ver precios',
    },
    benefits: {
      label: 'Beneficios',
      title: 'Menos citas perdidas, más señales cobradas',
      items: [
        { title: 'Reservas 24/7', text: 'Tu página de citas con tus servicios, profesionales y horarios. Tus clientes eligen y reservan sin escribirte.' },
        { title: 'Señal con tarjeta', text: 'Conectas tu cuenta de cobros (Stripe) en unos minutos y la cita se confirma cuando se paga la señal con tarjeta, en euros y directo a tu cuenta.' },
        { title: 'Recordatorios por WhatsApp', text: 'Mensajes automáticos antes de la cita, con opción de confirmar o cancelar. Menos huecos en tu agenda.' },
        { title: 'Agenda para todo tu equipo', text: 'Cada profesional con su agenda, sus servicios y sus horarios, todo en un mismo panel desde el móvil o el ordenador.' },
      ],
    },
    how: {
      label: 'Cómo funciona',
      title: 'Listo en tres pasos',
      steps: [
        'Crea tu cuenta gratis y añade tus servicios, precios y horarios.',
        'Conecta tu cuenta de cobros para pedir señal y comparte tu enlace de citas en Instagram y WhatsApp.',
        'Tus clientes reservan solos y TurnosPro les envía los recordatorios.',
      ],
    },
    sections: [
      {
        h2: 'Un software de citas pensado para España',
        paragraphs: [
          'Los importes se muestran en euros, la agenda usa el horario peninsular y los móviles de tus clientes van con +34, así los recordatorios por WhatsApp llegan bien.',
          'La señal se cobra con tarjeta a través de Stripe, en tu propia cuenta: el dinero es tuyo desde el primer momento. Empiezas gratis en el plan Gratuito, sin tarjeta y para siempre; si te pasas a un plan de pago, se paga en euros con tarjeta o domiciliación SEPA.',
        ],
      },
    ],
    faqs: [
      { q: '¿Funciona en España?', a: 'Sí. TurnosPro trabaja con euros, el horario peninsular y móviles +34 para los recordatorios por WhatsApp.' },
      { q: '¿Cómo cobro la señal?', a: 'Conectas tu cuenta de Stripe desde el panel y cada reserva online pide la señal con tarjeta antes de confirmar la cita. El dinero va directo a tu cuenta.' },
      { q: '¿En qué moneda pago la suscripción?', a: 'Los planes de pago se pagan en euros, con tarjeta o domiciliación SEPA.' },
      { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, no hay permanencia: vuelves al plan Gratuito o cancelas desde el panel en un clic.' },
    ],
    faqTitle: 'Lo que todos preguntan',
    faqAccent: 'antes de empezar.',
    pricingSnippet: {
      title: 'Precios de TurnosPro en España',
      intro: 'Empiezas gratis y cambias de plan cuando lo necesitas. Precios mensuales en euros.',
    },
    copy: {
      signup: tuSignup('señal'),
      pricing: {
        headline: 'Empieza gratis. Cambia de plan cuando lo necesites.',
        accent: 'gratis',
        subheadline:
          'Todos los negocios empiezan en el plan Gratuito: 100 citas al mes, sin tarjeta y para siempre. Cuando necesitas más agendas, recordatorios o WhatsApp, cambias de plan desde el panel.',
        microcopy: 'Sin permanencia · Sin tarjeta para empezar · Precios en euros',
        perMonth: '/ mes',
        freeNote: 'Gratis siempre. Sin tarjeta.',
        paidNote: 'Precio final en euros.',
        commissionNote:
          'La comisión se descuenta sola de cada cobro online con tarjeta. Los cobros en efectivo o por transferencia manual no pagan comisión.',
        plans: tuPlans({ perMonth: 'al mes', payments: 'Cobros con tarjeta (Stripe) y transferencia' }),
        comparison: buildPlanComparison({
          voice: 'tu',
          payments: 'stripe',
          autoTransfer: false,
          example:
            'Una cita de 20 € cobrada online: en Gratuito pagas 1 € de comisión, en Plus 0,40 €, en Advance 0,20 €, en Pro 0 €. La comisión se descuenta sola en cada cobro con tarjeta (aparte de la comisión del procesador de pagos). Los cobros en efectivo o por transferencia manual no pagan comisión.',
        }),
      },
      footerTagline: 'Citas online, cobro de señal y recordatorios por WhatsApp. Hecho para profesionales autónomos y pequeños negocios.',
      footerFindUs: 'Encuéntranos en:',
    },
  },
};

export const MARKET_COUNTRY_LIST: MarketCountry[] = [MARKET_COUNTRIES.UY, MARKET_COUNTRIES.MX, MARKET_COUNTRIES.ES];

/** País de ?pais= / ?country= ("uy", "MX", ...). Null = Argentina (la home de siempre). */
export function marketCountryFromParam(value: string | null | undefined): MarketCountry | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  return (MARKET_COUNTRIES as Record<string, MarketCountry>)[code] ?? null;
}

/** Lee ?pais= (o ?country=) de la URL actual. Solo en el cliente. */
export function marketCountryFromLocation(): MarketCountry | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return marketCountryFromParam(params.get('pais') || params.get('country'));
  } catch {
    return null;
  }
}

/** Precio partido para la tarjeta del plan: prefijo chico, número grande y sufijo. */
export interface PriceParts {
  prefix: string;
  amount: string;
  suffix: string;
}

export function priceParts(value: number, currency: MarketCountry['currency']): PriceParts {
  const whole = Math.round(value) === value;
  const digits = { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 };
  switch (currency) {
    case 'USD':
      return { prefix: 'US$', amount: new Intl.NumberFormat('es-UY', digits).format(value), suffix: '' };
    case 'MXN':
      return { prefix: '$', amount: new Intl.NumberFormat('es-MX', digits).format(value), suffix: 'MXN' };
    case 'EUR':
      return { prefix: '', amount: new Intl.NumberFormat('es-ES', digits).format(value), suffix: '€' };
  }
}

export function formatCountryPrice(value: number, currency: MarketCountry['currency']): string {
  const p = priceParts(value, currency);
  return [p.prefix, p.amount, p.suffix].filter(Boolean).join(' ');
}

/**
 * Equivalente del precio en ARS, igual que PlatformPricing.FromArs del backend (ARS 1300 = USD 1,
 * MXN 17,5, EUR 0,92; USD/EUR al entero, MXN a la decena). Es lo que se ve en el HTML estático y si
 * la API no responde; con la API se muestran los precios que cargó el super admin.
 */
export function estimateFromArs(ars: number, currency: MarketCountry['currency']): number {
  const usd = ars / 1300;
  const friendly = (v: number, step: number) => Math.max(step, Math.round(v / step) * step);
  switch (currency) {
    case 'USD':
      return friendly(usd, 1);
    case 'EUR':
      return friendly(usd * 0.92, 1);
    case 'MXN':
      return friendly(usd * 17.5, 10);
  }
}

/** Base de la API (misma regla que el alta: meta api-base o el mismo dominio). */
export function apiUrl(path: string): string {
  let base = '';
  if (typeof window !== 'undefined') {
    const meta = document.querySelector('meta[name="api-base"]');
    const raw = meta?.getAttribute('content') || (window as any).__API_BASE || '';
    const trimmed = String(raw).trim().replace(/\/+$/, '');
    base = trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
  }
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  return cleaned.startsWith('/api') ? `${base}${cleaned}` : `${base}/api${cleaned}`;
}

/** Precios mensuales por código de plan en la moneda del país (/api/subscription-plans?country=XX). */
export async function fetchCountryPlanPrices(country: MarketCountry): Promise<Record<string, number>> {
  const res = await fetch(apiUrl(`/subscription-plans?isActive=true&country=${country.code}`));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const plans: Array<{ code?: string; price?: number; currency?: string }> = await res.json();
  const out: Record<string, number> = {};
  for (const p of plans) {
    if (!p?.code || typeof p.price !== 'number' || p.price <= 0) continue;
    // Si el backend todavía no tiene ?country= devuelve ARS: no lo mostramos como dólares/euros.
    if (p.currency && p.currency.toUpperCase() !== country.currency) continue;
    out[p.code] = p.price;
  }
  return out;
}
