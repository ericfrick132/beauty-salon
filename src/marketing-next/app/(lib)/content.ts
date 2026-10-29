export const heroContent = {
  eyebrow: 'Agenda con IA y cobros online',
  headline: 'Agenda más con tu sitio listo para reservas',
  subheadline:
    'Publica tu web de turnos, activa pagos anticipados y un agente de IA que confirma tus turnos por WhatsApp. Sin descargas ni apps nativas.',
  cta: 'Quiero mi sitio de reservas',
  secondaryCta: 'Ver demo',
  microcopy: 'Gratis para siempre, sin tarjeta. Pasate de plan cuando lo necesites.',
  trustBadges: ['Pago seguro', 'GDPR', '99.9% uptime'],
};

export const features = [
  {
    icon: 'Storefront' as const,
    title: 'Sitio de reservas',
    description: 'Web rápida y responsiva para que tus clientes reserven 24/7 desde cualquier dispositivo.',
  },
  {
    icon: 'MenuBook' as const,
    title: 'Catálogo de servicios',
    description: 'Carga servicios, precios, horarios, sucursales, especialistas y reglas de recordatorio.',
  },
  {
    icon: 'EventAvailable' as const,
    title: 'Agenda inteligente',
    description: 'Disponibilidad en tiempo real, bloqueos y turnos recurrentes para optimizar tu agenda.',
  },
  {
    icon: 'Payment' as const,
    title: 'Cobros anticipados',
    description: 'Señas con MercadoPago integrado. Reduce ausencias y asegura tus ingresos.',
  },
  {
    icon: 'SmartToy' as const,
    title: 'Agente IA por WhatsApp',
    description: 'Una IA que pide confirmación antes de cada turno y responde sola: confirma o libera el horario, desde tu propio número.',
  },
  {
    icon: 'People' as const,
    title: 'Gestión de clientes',
    description: 'Historial, preferencias y comunicación centralizada con cada cliente.',
  },
];

export const solutionContent = {
  headline: 'Una solución integral para tu negocio',
  description:
    'Entrega a tus clientes una web rápida para reservar, pagar anticipos y recibir la confirmación de una IA por WhatsApp. Sin depender de descargas ni tiendas de apps.',
  blocks: [
    {
      title: 'Arma tu catálogo de servicios',
      description:
        'Configura tipos de turnos, duración, precios y especialistas. Todo desde un panel simple y visual.',
    },
    {
      title: 'Comparte el link con tus clientes',
      description:
        'Tu web de reservas lista para compartir en redes, WhatsApp o donde quieras. Reservas 24/7.',
    },
  ],
};

export const featureHighlightText =
  'Mientras vos descansás, la **IA de TurnosPro** confirma turnos y potencia tu negocio las 24hs.';

export const agendaContent = {
  headline: 'Tu agenda online, tus turnos siempre organizados',
  bullets: [
    'Vista diaria, semanal y mensual para cada profesional.',
    'Bloqueos de horario y turnos recurrentes.',
    'El agente IA confirma o libera cada turno solo, por WhatsApp.',
    'Notificaciones en tiempo real ante nuevas reservas.',
    'Reportes de ocupación y facturación.',
  ],
};

// Sección del agente IA de confirmación (Nº 03)
export const aiBotContent = {
  headline: 'Conocé a tu nuevo empleado: un agente IA',
  description:
    'La IA de TurnosPro le escribe a cada cliente antes de su turno, entiende la respuesta y actúa sola: confirma la asistencia o cancela y te libera el horario. Todo por WhatsApp, desde el número de tu negocio. Es un add-on que podés sumar a cualquier plan.',
  bullets: [
    'Pide confirmación con la anticipación que elijas (horas o minutos).',
    'La IA entiende la respuesta y actualiza tu agenda al instante.',
    'Si el cliente cancela, el horario queda libre para otro turno.',
    'Sale de tu propio número de WhatsApp, con tu tono y tu marca.',
  ],
  cta: 'Quiero mi agente IA',
  chat: [
    { from: 'bot' as const, text: 'Hola Juan! Te escribimos de Estudio Belén por tu turno de Corte y Color el viernes a las 15:30.\n\nRespondé 1 para confirmar tu turno ✅ o 2 para cancelarlo ❌' },
    { from: 'client' as const, text: '1' },
    { from: 'bot' as const, text: '¡Gracias Juan! Tu turno del viernes a las 15:30 quedó confirmado. Te esperamos 😊' },
  ],
  chatFooter: 'Turno confirmado en tu agenda · Sin que muevas un dedo',
};

export const businessTypesContent = {
  headline: 'Ideal para todo tipo de negocios',
  description:
    'Peluquerías, barberías, centros de estética, consultorios, estudios de yoga, y cualquier negocio que trabaje con turnos.',
  types: ['Peluquerías', 'Barberías', 'Estética', 'Consultorios', 'Estudios', 'Profesionales'],
};

export const howItWorksSteps = [
  { number: 1, title: 'Crea tu cuenta', description: 'Registrate gratis en 2 minutos.', time: '2 min' },
  { number: 2, title: 'Configura servicios', description: 'Carga horarios, servicios y especialistas.', time: '5 min' },
  { number: 3, title: 'Comparte tu link', description: 'Enviá tu web de turnos por WhatsApp o redes.', time: '3 min' },
  { number: 4, title: 'Automatiza con IA', description: 'Activa señas con MercadoPago y tu agente IA de confirmación.', time: '5 min' },
  { number: 5, title: 'Crecé tu negocio', description: 'Analizá reportes y optimizá tu agenda.', time: '' },
];

export const faqs = [
  {
    q: '¿Qué hace TurnosPro por WhatsApp?',
    a: 'Desde el plan Plus, antes de cada turno le llega un WhatsApp a tu cliente desde el número de tu negocio para confirmar o cancelar: si responde, tu agenda se actualiza sola y, si cancela, el horario queda libre. Además podés sumar el asistente por menú (add-on), con el que tus clientes reservan, consultan y cancelan turnos solos. El plan Gratuito no incluye WhatsApp.',
  },
  {
    q: '¿Es mi sitio realmente propio?',
    a: 'Sí. Configuramos una experiencia exclusiva con tu marca, sin listados compartidos con otros negocios.',
  },
  {
    q: '¿Qué necesito para configurarla?',
    a: 'Logo, colores y la información de tus servicios. En la puesta en marcha guiada la dejamos lista en días.',
  },
  {
    q: '¿Con qué se integra TurnosPro?',
    a: 'Hoy se integra con Mercado Pago (señas y pagos anticipados con tu propia cuenta) y, desde el plan Plus, con WhatsApp (recordatorios, confirmación de turnos y asistente por menú desde tu número). Si necesitás otra integración, escribinos y la evaluamos.',
  },
  {
    q: '¿Puedo agregar funcionalidades a medida?',
    a: 'Claro. Nuestro equipo evolutivo prioriza mejoras según tus necesidades.',
  },
  {
    q: '¿Qué incluye el soporte?',
    a: 'Acompañamiento en onboarding, resolución de incidencias y mejoras continuas.',
  },
  {
    q: '¿Hay contrato mínimo?',
    a: 'No. Empezás en el plan Gratuito y te pasás de plan, bajás o cancelás cuando quieras.',
  },
];

export type PlanCode = 'free' | 'plus' | 'advance' | 'pro_v2';

/** Celda de la tabla comparativa: true = incluido, false = no incluido, string = valor. */
export type ComparisonCell = boolean | string;

export interface ComparisonRow {
  label: string;
  /** Gratuito, Plus, Advance, Pro (mismo orden que pricingContent.plans). */
  values: [ComparisonCell, ComparisonCell, ComparisonCell, ComparisonCell];
}

export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

export interface PlanComparisonCopy {
  title: string;
  accent: string;
  intro: string;
  featureHeader: string;
  priceLabel: string;
  swipeHint: string;
  groups: ComparisonGroup[];
  exampleTitle: string;
  example: string;
  packs: string;
  faqTitle: string;
  faqs: { q: string; a: string }[];
}

/**
 * Tabla "Compará los planes". Voz: 'vos' (AR/UY: turnos, reservas) o 'tu' (MX/ES: citas).
 * payments: con qué se cobra online en el país (Mercado Pago o tarjeta vía Stripe en España).
 */
export function buildPlanComparison(opts: {
  voice: 'vos' | 'tu';
  payments: 'mp' | 'stripe';
  /** Transferencia automática (TransferDetection): hoy solo Argentina (CountryProfile del backend). */
  autoTransfer: boolean;
  /**
   * Sin comisión por cobro en ningún plan: Uruguay y México conectan Mercado Pago pegando credenciales y
   * con ese token Mercado Pago no permite cobrar marketplace_fee (solo con OAuth, como en Argentina).
   */
  noCommission?: boolean;
  example: string;
}): PlanComparisonCopy {
  const tu = opts.voice === 'tu';
  const mp = opts.payments === 'mp';
  const bookings = tu ? 'Citas' : 'Reservas';
  const processor = mp ? 'Mercado Pago' : 'tarjeta';
  const autoTransferRow: ComparisonRow = { label: 'Transferencia bancaria automática (se confirma sola)', values: [false, false, true, true] };
  return {
    title: tu ? 'Compara los planes' : 'Compará los planes',
    accent: tu ? 'Compara' : 'Compará',
    intro: tu
      ? 'Todo lo que incluye cada plan, fila por fila. Empiezas en Gratuito y cambias cuando tu agenda lo pida.'
      : 'Todo lo que incluye cada plan, fila por fila. Arrancás en Gratuito y te pasás cuando tu agenda lo pida.',
    featureHeader: 'Qué incluye',
    priceLabel: 'Precio',
    swipeHint: tu ? 'Desliza para ver todos los planes →' : 'Deslizá para ver todos los planes →',
    groups: [
      {
        title: tu ? 'Citas y agenda' : 'Reservas y agenda',
        rows: [
          { label: `${bookings} por mes`, values: ['100', '200', 'Ilimitadas', 'Ilimitadas'] },
          { label: 'Agendas (profesionales)', values: ['Hasta 3', 'Hasta 5', 'Ilimitadas', 'Ilimitadas'] },
          { label: 'Servicios', values: ['1 por agenda', 'Ilimitados', 'Ilimitados', 'Ilimitados'] },
          { label: tu ? 'Página de citas online con tu link' : 'Página de reservas online con tu link', values: [true, true, true, true] },
          { label: tu ? 'Citas recurrentes (citas fijas)' : 'Reservas recurrentes (turnos fijos)', values: [false, false, true, 'Ilimitadas'] },
          { label: 'Campos personalizados en el formulario', values: [false, false, '1', 'Ilimitados'] },
        ],
      },
      {
        title: 'Cobros',
        rows: [
          {
            label: mp
              ? tu ? 'Cobro de anticipos y citas con Mercado Pago' : 'Cobro de señas y turnos con Mercado Pago'
              : 'Cobro de señal y citas con tarjeta (Stripe)',
            values: [true, true, true, true],
          },
          { label: 'Transferencia (manual)', values: [true, true, true, true] },
          ...(opts.autoTransfer ? [autoTransferRow] : []),
          { label: 'Cupones de descuento', values: [false, false, true, true] },
          {
            label: 'Comisión por cobro online',
            values: opts.noCommission ? ['Sin comisión', 'Sin comisión', 'Sin comisión', 'Sin comisión'] : ['5%', '2%', '1%', 'Sin comisión'],
          },
        ],
      },
      {
        title: 'WhatsApp y recordatorios',
        rows: [
          { label: 'Recordatorios automáticos', values: [false, true, true, true] },
          { label: 'Confirmación automática por WhatsApp (el cliente responde SI/NO)', values: [false, true, true, true] },
          { label: 'Mensajes de WhatsApp incluidos por mes', values: [false, '30', '100', '250'] },
        ],
      },
      {
        title: tu ? 'Clientes y métricas' : 'Clientes y métricas',
        rows: [
          { label: 'Panel de métricas', values: [true, true, true, true] },
          { label: 'Ficha e historial de clientes', values: [false, false, false, true] },
          { label: 'Píxel de Meta y Google Analytics en tu página', values: [false, false, false, true] },
        ],
      },
    ],
    exampleTitle: opts.noCommission ? 'Sin comisión por cobro' : 'Así se calcula la comisión',
    example: opts.example,
    packs: tu
      ? '¿Necesitas más mensajes de WhatsApp? Compras packs cuando quieras.'
      : '¿Necesitás más mensajes de WhatsApp? Comprás packs cuando quieras.',
    faqTitle: tu ? 'Preguntas sobre los planes' : 'Preguntas sobre los planes',
    faqs: tu
      ? [
          { q: '¿El plan gratuito es para siempre?', a: 'Sí. No es una prueba: no pide tarjeta y no tiene vencimiento. Solo pagas si decides cambiar a Plus, Advance o Pro.' },
          { q: '¿Qué pasa si llego a las 100 citas?', a: 'Tus clientes no pueden agendar en línea hasta el mes siguiente o hasta que mejores el plan. Ves el contador de citas del mes en el panel.' },
          { q: '¿Puedo cambiar de plan cuando quiera?', a: 'Sí. Subes o bajas de plan desde el panel. Si vuelves a Gratuito no pierdes tu agenda ni tus clientes.' },
          opts.noCommission
            ? { q: '¿Cobran comisión por los pagos?', a: `No. Lo que cobras en línea con ${processor} es todo tuyo (aparte de la comisión de ${processor}).` }
            : { q: '¿Cómo se cobra la comisión?', a: `Sale sola de cada cobro online con ${processor}. Los cobros en efectivo o por transferencia manual no pagan comisión.` },
        ]
      : [
          { q: '¿El plan gratuito es para siempre?', a: 'Sí. No es una prueba: no pide tarjeta y no tiene vencimiento. Solo pagás si decidís pasarte a Plus, Advance o Pro.' },
          { q: '¿Qué pasa si llego a las 100 reservas?', a: 'Tus clientes no pueden reservar online hasta el mes siguiente o hasta que mejores el plan. Ves el contador de reservas del mes en el panel.' },
          { q: '¿Puedo cambiar de plan cuando quiera?', a: 'Sí. Subís o bajás de plan desde el panel. Si bajás a Gratuito no perdés tu agenda ni tus clientes.' },
          opts.noCommission
            ? { q: '¿Cobran comisión por los pagos?', a: `No. Lo que cobrás online con ${processor} es todo tuyo (aparte de la comisión de ${processor}).` }
            : { q: '¿Cómo se cobra la comisión?', a: `Sale sola de cada cobro online con ${processor}. Los cobros en efectivo o por transferencia manual no pagan comisión.` },
        ],
  };
}

export interface PricingPlan {
  /** Código del plan en el backend (SubscriptionPlan.Code). */
  code: PlanCode;
  name: string;
  tagline: string;
  /** Precio mensual final en ARS. 0 = Gratuito. */
  price: number;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

// Freemium: todos los negocios arrancan en Gratuito (sin prueba, sin tarjeta) y se pasan de plan
// desde el panel. La comisión es por cobro online y la descuenta sola Mercado Pago.
export const pricingContent = {
  eyebrow: 'Nº 08 · Precios',
  headline: 'Empezá gratis. Pasate de plan cuando lo necesites.',
  accent: 'gratis',
  subheadline:
    'Todos los negocios arrancan en el plan Gratuito: 100 reservas por mes, sin tarjeta y para siempre. Cuando necesitás más agendas, recordatorios o WhatsApp, te pasás de plan desde el panel.',
  freeNote: 'Gratis siempre. Sin tarjeta.',
  paidNote: 'Precio final en pesos.',
  commissionNote:
    'La comisión se descuenta sola de cada cobro online con Mercado Pago. Los cobros en efectivo o transferencia manual no pagan comisión.',
  microcopy: 'Sin permanencia · Sin tarjeta para empezar · Cambiás de plan cuando quieras',
  comparison: buildPlanComparison({
    voice: 'vos',
    payments: 'mp',
    autoTransfer: true,
    example:
      'Un turno de $20.000 cobrado online: en Gratuito pagás $1.000 de comisión, en Plus $400, en Advance $200, en Pro $0. La comisión se descuenta sola en cada cobro con Mercado Pago (aparte de la comisión de Mercado Pago). Los cobros en efectivo o por transferencia manual no pagan comisión.',
  }),
  plans: [
    {
      code: 'free',
      name: 'Gratuito',
      tagline: 'Para empezar a recibir reservas online.',
      price: 0,
      features: [
        '100 reservas por mes',
        'Hasta 3 agendas',
        '1 servicio por agenda',
        'Cobros con MercadoPago y transferencia',
        'Panel de métricas',
        '5% de comisión por cobro',
      ],
      cta: 'Empezar gratis',
      highlighted: false,
    },
    {
      code: 'plus',
      name: 'Plus',
      tagline: 'Un plus en la gestión de tus reservas.',
      price: 8000,
      features: [
        '200 reservas por mes',
        'Hasta 5 agendas',
        'Servicios ilimitados',
        'Recordatorios automáticos',
        '30 mensajes de WhatsApp por mes',
        '2% de comisión por cobro',
      ],
      cta: 'Elegir Plus',
      highlighted: true,
      badge: 'Más elegido',
    },
    {
      code: 'advance',
      name: 'Advance',
      tagline: 'Para ordenar y automatizar todas tus reservas.',
      price: 18000,
      features: [
        'Reservas y agendas ilimitadas',
        '100 mensajes de WhatsApp por mes',
        'Reservas recurrentes',
        'Un campo personalizado en el formulario',
        'Cupones de descuento',
        'Transferencia bancaria automática',
        '1% de comisión por cobro',
      ],
      cta: 'Elegir Advance',
      highlighted: false,
    },
    {
      code: 'pro_v2',
      name: 'Pro',
      tagline: 'Sin límites ni fricciones.',
      price: 30000,
      features: [
        'Todo lo del plan Advance',
        '250 mensajes de WhatsApp por mes',
        'Reservas recurrentes ilimitadas',
        'Campos personalizados ilimitados',
        'Ficha e historial de clientes',
        'Píxel y Google Analytics',
        'Sin comisión por cobro',
      ],
      cta: 'Elegir Pro',
      highlighted: false,
    },
  ] as PricingPlan[],
};

export const finalCtaContent = {
  headline: '¿Qué esperás para llevar tu negocio al siguiente nivel?',
  subtext: 'Configúralo en 15 min y dejá que la IA trabaje por vos. Soporte humano para onboarding.',
  cta: 'Comenzar',
  guarantees: ['Garantía 30 días', 'Pago seguro', 'Soporte prioritario'],
};

// Sección #registro del final de la landing (izquierda vende, derecha el formulario de alta).
export const signupSectionContent = {
  eyebrow: 'Nº 09 · Empezá ahora',
  ribbon: '⚡ Gratis para siempre · Sin tarjeta · Listo en 2 min',
  headline: 'Empezá gratis con tu propia agenda.',
  accent: 'tu propia agenda',
  subheadline:
    'Creá tu cuenta y seguí la configuración guiada: rubro, servicios, horarios y tu equipo. En 15 minutos tus clientes ya pueden reservar.',
  steps: [
    { title: 'Creá tu cuenta', description: 'Nombre del negocio, email y WhatsApp. Confirmás con un código, sin contraseña.' },
    { title: 'Arrancá en el plan Gratuito', description: 'Entrás directo, sin tarjeta, con 100 reservas por mes. Cuando necesitás más, te pasás de plan y lo pagás con Mercado Pago.' },
    { title: 'Armá tu agenda', description: 'Elegís tu rubro y cargás servicios, horarios y profesionales. Todo guiado.' },
    { title: 'Compartí tu link y cobrá', description: 'tunegocio.turnos-pro.com: tus clientes reservan solos 24/7, con señas por MercadoPago y recordatorios por WhatsApp.' },
  ],
  guarantee:
    'Plan Gratuito para siempre, sin tarjeta. Pagás recién si te pasás a un plan pago. Sin permanencia: cambiás o cancelás cuando quieras.',
};

export const logoCarouselTitle = 'Funciona con MercadoPago y WhatsApp';

export const businessTypeOptions = [
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'barberia', label: 'Barbería' },
  { value: 'estetica', label: 'Estética' },
  { value: 'profesionales', label: 'Profesionales' },
  { value: 'salud', label: 'Salud' },
];
