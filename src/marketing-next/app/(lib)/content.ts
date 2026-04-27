export const heroContent = {
  eyebrow: 'Agenda y cobros online',
  headline: 'Agenda más con tu sitio listo para reservas',
  subheadline:
    'Publica tu web de turnos, activa pagos anticipados y recordatorios por WhatsApp. Sin descargas ni apps nativas.',
  cta: 'Quiero mi sitio de reservas',
  secondaryCta: 'Ver demo',
  microcopy: 'Sin tarjeta. Cancela cuando quieras.',
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
    icon: 'NotificationsActive' as const,
    title: 'Recordatorios automáticos',
    description: 'WhatsApp y email automáticos para que tus clientes nunca olviden su turno.',
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
    'Entrega a tus clientes una web rápida para reservar, pagar anticipos y recibir recordatorios. Sin depender de descargas ni tiendas de apps.',
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
  'Mientras vos descansás, **TurnosPro** potencia tu negocio las 24hs.';

export const agendaContent = {
  headline: 'Tu agenda online, tus turnos siempre organizados',
  bullets: [
    'Vista diaria, semanal y mensual para cada profesional.',
    'Bloqueos de horario y turnos recurrentes.',
    'Notificaciones en tiempo real ante nuevas reservas.',
    'Reportes de ocupación y facturación.',
  ],
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
  { number: 4, title: 'Automatiza cobros', description: 'Activa señas con MercadoPago y recordatorios.', time: '5 min' },
  { number: 5, title: 'Crecé tu negocio', description: 'Analizá reportes y optimizá tu agenda.', time: '' },
];

export const testimonials = [
  {
    name: 'Gaby Conde',
    role: 'Esteticista',
    quote: 'Me cambió totalmente el trabajo, te ahorra tiempo y problema con el tema de las señas.',
    rating: 5,
  },
  {
    name: 'Angie Aicardi',
    role: 'Emprendedora',
    quote: 'Mis turnos incrementaron, ya que los clientes sacan turnos las 24hs.',
    rating: 5,
  },
  {
    name: 'Erica Rodriguez',
    role: 'Dueña de salón',
    quote: 'Es la solución a tu negocio, súper recomendable.',
    rating: 5,
  },
];

export const faqs = [
  {
    q: '¿Es mi sitio realmente propio?',
    a: 'Sí. Configuramos una experiencia exclusiva con tu marca, sin listados compartidos con otros negocios.',
  },
  {
    q: '¿Qué necesito para configurarla?',
    a: 'Logo, colores y la información de tus servicios. En la puesta en marcha guiada la dejamos lista en días.',
  },
  {
    q: '¿Puedo integrarla con otros sistemas?',
    a: 'Evaluamos las integraciones que necesites (pagos, reportes, CRM) y las habilitamos según tu plan.',
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
    a: 'No. Puedes probarla, pausar o cambiar de plan cuando quieras.',
  },
];

export const pricingContent = {
  eyebrow: 'Nº 07 · Precios',
  headline: 'Elegí el plan que se adapta a tu negocio',
  subheadline:
    'Mismo plan, distinto compromiso. Cuanto más largo, mayor el descuento. Todos los planes incluyen prueba gratis, sin tarjeta.',
  microcopy: 'Sin permanencia · Cancelás cuando quieras · Cambiás de plan en 1 clic',
  features: [
    'Reservas online ilimitadas',
    'Cobros con MercadoPago',
    'Recordatorios por WhatsApp',
    'Agenda multi-profesional',
    'Reportes y métricas',
    'Soporte prioritario',
  ],
  plans: [
    {
      code: 'promo',
      name: 'Promo 3 meses',
      commitment: '3 meses',
      price: 45000,
      discount: '10% OFF',
      trialDays: 14,
      cta: 'Empezar prueba',
      highlighted: false,
    },
    {
      code: '6meses',
      name: 'Plan 6 meses',
      commitment: '6 meses',
      price: 40000,
      discount: '20% OFF',
      trialDays: 14,
      cta: 'Empezar prueba',
      highlighted: true,
      badge: 'Más popular',
    },
    {
      code: '12meses',
      name: 'Plan 12 meses',
      commitment: '12 meses',
      price: 37500,
      discount: '25% OFF',
      trialDays: 14,
      cta: 'Empezar prueba',
      highlighted: false,
      badge: 'Mejor precio',
    },
    {
      code: 'pro',
      name: 'Plan mensual',
      commitment: 'Mes a mes',
      price: 50000,
      discount: null,
      trialDays: 7,
      cta: 'Empezar prueba',
      highlighted: false,
    },
  ],
};

export const finalCtaContent = {
  headline: '¿Qué esperás para llevar tu negocio al siguiente nivel?',
  subtext: 'Configúralo en 15 min. Soporte humano para onboarding.',
  cta: 'Comenzar',
  guarantees: ['Garantía 30 días', 'Pago seguro', 'Soporte prioritario'],
};

export const logoCarouselTitle = 'Integra a tu tienda las aplicaciones que ya usas';

export const businessTypeOptions = [
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'barberia', label: 'Barbería' },
  { value: 'estetica', label: 'Estética' },
  { value: 'profesionales', label: 'Profesionales' },
  { value: 'salud', label: 'Salud' },
];
