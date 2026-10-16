import { verticalLinks, type VerticalLink } from '@/app/(lib)/vertical-links';

// Landings por vertical (SEO). Todo el copy sale de los hechos del producto que ya
// están en la landing (content.ts / BusinessTypes.tsx): no inventar funcionalidades.

export type VerticalSection = {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
  after?: string[];
};

export type VerticalContent = VerticalLink & {
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string[];
  sections: VerticalSection[];
  faqs: { q: string; a: string }[];
  datePublished: string;
  dateModified: string;
  /** 'feature' = landing de funcionalidad (no rubro): VerticalLanding usa títulos neutros y otro callout. */
  kind?: 'feature';
  /** Textos de VerticalLanding para landings 'feature' que no son la de señas (default: los de señas). */
  featureCopy?: { callout: string; pricingIntro: string; faqTitle: string };
};

export const verticals: VerticalContent[] = [
  {
    ...verticalLinks[0],
    title: 'Sistema de turnos para peluquerías | TurnosPro',
    description:
      'Sistema de turnos para peluquerías: agenda online por estilista, señas con MercadoPago y recordatorios por WhatsApp. Probalo gratis.',
    h1: 'Sistema de turnos para peluquerías',
    eyebrow: 'Peluquerías',
    intro: [
      'Si tu peluquería sigue anotando turnos en un cuaderno o contestando WhatsApp entre corte y corte, estás perdiendo horas de trabajo y clientas que no vuelven. TurnosPro es un sistema de turnos online pensado para peluquerías: tus clientas reservan solas las 24 horas desde tu propio sitio, eligen estilista y servicio, dejan una seña con MercadoPago y reciben recordatorios por WhatsApp.',
      'Vos ves todo en una agenda por profesional, con vista diaria, semanal y mensual, y te dedicás a lo que importa: cortar, teñir y atender bien a cada persona que se sienta en tu silla.',
    ],
    sections: [
      {
        h2: 'Una agenda por estilista, sin superposiciones',
        paragraphs: [
          'En una peluquería conviven varios profesionales con horarios distintos, servicios de duración muy diferente y clientas que siempre quieren "con la misma de la otra vez". Un sistema de turnos para peluquerías tiene que resolver eso sin que vos hagas malabares.',
          'En TurnosPro cada estilista tiene su propia agenda. Cargás sus horarios, los servicios que hace y cuánto dura cada uno. Cuando una clienta reserva, solo ve los huecos reales de la persona que eligió: no hay dobles reservas ni turnos de coloración metidos en un espacio de 20 minutos.',
        ],
        bullets: [
          'Vista diaria, semanal y mensual para cada profesional.',
          'Bloqueos de horario para almuerzos, cursos o días libres.',
          'Turnos recurrentes para las clientas que vienen cada dos o tres semanas.',
          'Disponibilidad en tiempo real: lo que ve la clienta es lo que tenés libre.',
          'Notificaciones en el momento ante cada reserva nueva.',
        ],
      },
      {
        h2: 'Señas con MercadoPago para cortar las ausencias',
        paragraphs: [
          'El problema número uno de una peluquería no es conseguir turnos, es que la gente venga. Un balayage de tres horas que se cae a último momento es una tarde de facturación perdida.',
          'Por eso TurnosPro integra señas con MercadoPago en el flujo de reserva. Vos decidís qué servicios exigen seña y de cuánto; la clienta paga desde el celular al reservar y el dinero entra en tu propia cuenta de MercadoPago, sin comisiones de TurnosPro por cada turno. Cuando hay plata de por medio, la gente avisa si no puede venir y el horario se libera para otra persona.',
          'Los negocios que usan señas y recordatorios con TurnosPro reportan hasta un 80% menos de cancelaciones. Es la diferencia entre una agenda llena en papel y una agenda llena en la caja.',
        ],
      },
      {
        h2: 'Recordatorios y confirmación por WhatsApp, con agente de IA',
        paragraphs: [
          'Tus clientas viven en WhatsApp, así que los recordatorios también. TurnosPro envía recordatorios y confirmaciones automáticas antes de cada turno, con la anticipación que vos elijas.',
          'Si querés ir un paso más allá, podés sumar el agente de IA como add-on. Le escribe a cada clienta desde el número de WhatsApp de tu peluquería, entiende lo que responde y actúa solo: confirma el turno en tu agenda o lo cancela y libera el horario. Vos no tocás el teléfono, y tu mensaje sale con tu nombre y tu tono.',
        ],
        bullets: [
          'Recordatorio automático antes del turno.',
          'Confirmación con un simple "1" o "2" que la IA interpreta.',
          'Si la clienta cancela, el hueco queda libre para otra reserva.',
          'Todo sale de tu propio número de WhatsApp, no de un número genérico.',
        ],
      },
      {
        h2: 'Catálogo de servicios con precios: corte, color y tratamientos',
        paragraphs: [
          'Una peluquería vende decenas de servicios distintos: corte, color raíz, balayage, alisado, nutrición, brushing, peinado para eventos. Cada uno con su precio y su duración. Si la clienta no los ve claros antes de reservar, te va a preguntar por WhatsApp igual.',
          'En TurnosPro armás tu catálogo de servicios con precios, duraciones y qué especialista lo hace. Tu sitio de reservas lo muestra ordenado y actualizado: si subís el precio del color, se actualiza en el momento. Y como el catálogo ya define la duración, la agenda nunca queda corta para un servicio largo.',
        ],
      },
      {
        h2: 'Reservas desde Instagram y WhatsApp, sin apps para tus clientas',
        paragraphs: [
          'Tu web de turnos tiene tu marca, tu logo y tus colores, y funciona en cualquier celular sin descargar nada. Ponés el link en la bio de Instagram, en el estado de WhatsApp y en tu Google; la clienta entra, elige servicio, estilista y horario, paga la seña y listo. Nadie tiene que crearse una cuenta ni instalar una app.',
          'Vos tenés la app de TurnosPro para iPhone para mirar la agenda desde el sillón, y el panel web con reportes de ocupación, facturación por profesional y métricas.',
        ],
      },
      {
        h2: 'Qué tiene que tener un sistema de turnos para peluquerías',
        paragraphs: [
          'Si estás comparando sistemas de turnos para tu peluquería, no alcanza con un calendario donde la gente anote su nombre. Antes de elegir, fijate que resuelva esto:',
        ],
        bullets: [
          'Agenda por estilista: que cada profesional tenga sus horarios y la clienta elija con quién atenderse.',
          'Duración por servicio: que un color o un alisado bloquee el tiempo real y no se pise con el turno siguiente.',
          'Señas online: que la clienta pague una parte al reservar y la plata entre en tu cuenta, no en la del sistema.',
          'Recordatorios por WhatsApp: que salgan solos, desde tu número, y que la confirmación o la cancelación se refleje en la agenda.',
          'Reserva sin app ni registro: que la clienta reserve desde el link de tu Instagram en un par de toques.',
          'Precios claros y sin permanencia: que sepas cuánto pagás por mes y puedas irte cuando quieras.',
        ],
        after: [
          'TurnosPro cumple todos estos puntos en un solo plan, con turnos ilimitados y todos los profesionales que tengas.',
        ],
      },
      {
        h2: 'Cómo arranca una peluquería con TurnosPro',
        paragraphs: [
          'La puesta a punto lleva unos 15 minutos y no necesitás a nadie técnico:',
        ],
        bullets: [
          'Creás tu cuenta gratis con tu email.',
          'Cargás tus estilistas, horarios y el catálogo de servicios con precios.',
          'Activás señas con tu cuenta de MercadoPago y los recordatorios por WhatsApp.',
          'Compartís el link de tu web de turnos en Instagram y WhatsApp.',
          'Sumás el agente de IA cuando quieras dejar de confirmar turnos a mano.',
        ],
        after: [
          'Tenés soporte prioritario en la puesta en marcha y después. No hay permanencia y arrancás con 7 días gratis, sin tarjeta.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo tener una agenda distinta para cada estilista?',
        a: 'Sí. Cada profesional tiene su propia agenda con sus horarios, servicios y bloqueos. Tus clientas eligen con quién atenderse y solo ven los huecos reales de esa persona, en vista diaria, semanal o mensual.',
      },
      {
        q: '¿Cómo funcionan las señas para una peluquería?',
        a: 'Elegís qué servicios exigen seña y de cuánto. Al reservar, la clienta paga con MercadoPago y el dinero entra directo en tu cuenta. TurnosPro no cobra comisión por turno.',
      },
      {
        q: '¿Los recordatorios salen de mi propio número de WhatsApp?',
        a: 'Sí. Los recordatorios, las confirmaciones y el agente de IA (add-on) funcionan desde el número de WhatsApp de tu peluquería, con tu nombre y tu tono.',
      },
      {
        q: '¿Mis clientas necesitan descargar una app para reservar?',
        a: 'No. Reservan desde tu web de turnos, en cualquier celular, sin registrarse ni instalar nada. La app para iPhone es para vos, para gestionar la agenda.',
      },
      {
        q: '¿Hay un sistema de turnos gratis para peluquerías?',
        a: 'Podés probar TurnosPro gratis antes de pagar nada: creás tu cuenta, cargás tus estilistas y servicios y empezás a recibir reservas. Si no te sirve, lo cancelás sin costo. Los sistemas gratis para siempre suelen limitar la cantidad de turnos o profesionales y no incluyen señas ni recordatorios por WhatsApp.',
      },
      {
        q: '¿Cuánto cuesta un sistema de turnos para peluquerías?',
        a: 'TurnosPro cuesta ARS 50.000 por mes en el plan mensual y baja hasta ARS 37.500 por mes en el plan de 12 meses. Todos los planes arrancan con 7 días gratis, sin tarjeta, y no tienen permanencia.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-10-05',
  },
  {
    ...verticalLinks[1],
    title: 'Sistema de turnos para barberías | TurnosPro',
    description:
      'Turnos cortos, muchos por día y reservas desde Instagram o WhatsApp. Agenda online, señas con MercadoPago y recordatorios para tu barbería.',
    h1: 'Sistema de turnos para barberías',
    eyebrow: 'Barberías',
    intro: [
      'Una barbería vive de volumen: cortes de 30 o 40 minutos, uno atrás del otro, todo el día. Cada hueco vacío es plata que no vuelve, y cada cliente que se olvidó de venir te rompe la tarde. TurnosPro es un sistema de turnos online hecho para ese ritmo: reservas 24/7 desde tu link de Instagram o WhatsApp, agenda por barbero, señas con MercadoPago y recordatorios automáticos para que el sillón no quede vacío.',
      'Lo configurás en 15 minutos, con 7 días gratis y sin permanencia, y desde ese momento tus clientes sacan turno solos mientras vos cortás.',
    ],
    sections: [
      {
        h2: 'Turnos cortos, muchos por día, cero superposiciones',
        paragraphs: [
          'Un sistema de turnos para barberías tiene que aguantar veinte o treinta reservas diarias por barbero sin confundirse. En TurnosPro cada servicio tiene su duración exacta: corte, corte y barba, perfilado, afeitado clásico o diseño. La agenda arma los huecos con esa duración y muestra al cliente solo los horarios que realmente están libres.',
          'Si un barbero se toma el mediodía o falta un día, lo bloqueás en dos toques y esos horarios desaparecen del sitio. Si un cliente viene cada dos semanas, le dejás un turno recurrente y no tiene que reservar de nuevo.',
        ],
        bullets: [
          'Agenda independiente por barbero con vista diaria, semanal y mensual.',
          'Bloqueos de horario y turnos recurrentes.',
          'Disponibilidad en tiempo real: sin dobles reservas.',
          'Notificaciones en el momento cada vez que entra una reserva.',
          'Reservas online ilimitadas en todos los planes.',
        ],
      },
      {
        h2: 'Reservas desde Instagram y WhatsApp, sin contestar mensajes',
        paragraphs: [
          'La mayoría de los clientes de una barbería llegan por Instagram o por el estado de WhatsApp. El problema es que reservar por mensaje es lento: preguntan, esperan, vos contestás entre cliente y cliente, y a veces el horario ya se fue.',
          'Con TurnosPro publicás tu propio sitio de reservas, con tu marca y tus colores, y ponés el link en la bio, en el estado y en el perfil de Google. El cliente entra, elige barbero, servicio y horario, y listo. Nada de descargar apps ni crearse cuentas. Vos solo ves la reserva aparecer en tu agenda.',
        ],
      },
      {
        h2: 'Cobros y señas con MercadoPago',
        paragraphs: [
          'Cuando un turno de 30 minutos se pierde, no hay forma de recuperarlo. Por eso muchas barberías cobran una seña o el corte completo por adelantado, y TurnosPro lo hace automático: activás cobros con tu propia cuenta de MercadoPago, decidís qué servicios piden seña y de cuánto, y el cliente paga desde el celular al reservar.',
          'La plata entra en tu cuenta de MercadoPago, no pasa por TurnosPro, y no pagás comisión por turno. Con la seña puesta, el que no puede venir avisa, y el horario se libera para el siguiente.',
        ],
        bullets: [
          'Seña parcial o pago completo, según el servicio.',
          'Cobros directo en tu cuenta de MercadoPago.',
          'Sin comisión por turno.',
          'Hasta 80% menos cancelaciones combinando señas y recordatorios.',
        ],
      },
      {
        h2: 'Recordatorios por WhatsApp y agente de IA que confirma solo',
        paragraphs: [
          'Con tantos turnos por día, confirmar uno por uno es imposible. TurnosPro manda recordatorios y confirmaciones por WhatsApp de forma automática, con la anticipación que elijas.',
          'Y si querés que nadie de tu equipo toque el teléfono, sumás el agente de IA como add-on: le escribe a cada cliente desde el número de WhatsApp de la barbería, entiende si responde "1" o "sí, voy" o "no llego", y confirma o cancela en tu agenda. Si cancela, el horario vuelve a estar disponible para otro corte.',
        ],
      },
      {
        h2: 'Catálogo de servicios con precios claros',
        paragraphs: [
          'Corte, corte y barba, barba sola, afeitado con toalla caliente, diseño, color: cada servicio con su precio, su duración y qué barbero lo hace. El catálogo se ve en tu sitio de reservas, así el cliente sabe qué va a pagar antes de sentarse, y la agenda sabe cuánto va a durar.',
          'Si tenés más de un local, cargás las sucursales y cada una tiene su equipo y su agenda. Y con los reportes y métricas ves qué barbero factura más, qué días se llenan y qué servicios conviene empujar.',
        ],
      },
      {
        h2: 'Cómo arranca una barbería con TurnosPro',
        bullets: [
          'Creás tu cuenta con tu email y entrás directo a 7 días gratis, sin tarjeta.',
          'Cargás barberos, horarios y servicios con precios y duración.',
          'Conectás tu cuenta de MercadoPago para señas o cobros completos.',
          'Ponés el link de tu sitio en Instagram, WhatsApp y Google.',
          'Activás recordatorios y, si querés, el agente de IA.',
        ],
        after: [
          'Todo el proceso lleva unos 15 minutos y tenés soporte prioritario durante la puesta en marcha. Además, con la app para iPhone gestionás la agenda desde donde estés.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Sirve para una barbería con varios barberos?',
        a: 'Sí. Cada barbero tiene su propia agenda, sus horarios y sus servicios. El cliente elige con quién cortarse y solo ve los horarios libres de esa persona. También podés cargar más de una sucursal.',
      },
      {
        q: '¿Puedo cobrar el corte completo por adelantado?',
        a: 'Sí. Configurás, servicio por servicio, si pedís una seña parcial o el pago completo. Se cobra con tu cuenta de MercadoPago al momento de reservar y no hay comisión por turno.',
      },
      {
        q: '¿Mis clientes tienen que instalar algo para reservar?',
        a: 'No. Reservan desde el link de tu sitio de turnos, en cualquier celular, sin registrarse ni descargar apps. Vos gestionás desde el panel web o la app para iPhone.',
      },
      {
        q: '¿Hay límite de turnos por mes?',
        a: 'No. Todos los planes de TurnosPro incluyen reservas online ilimitadas, algo clave para una barbería con muchos turnos cortos por día.',
      },
      {
        q: '¿Cuánto cuesta y hay permanencia?',
        a: 'Desde ARS 37.500 por mes en el plan de 12 meses hasta ARS 50.000 por mes en el plan mensual. Todos arrancan con 7 días gratis, sin tarjeta, y no hay permanencia: cancelás cuando quieras.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
  {
    ...verticalLinks[2],
    title: 'Sistema de turnos para centros de estética | TurnosPro',
    description:
      'Tratamientos largos, señas obligatorias con MercadoPago, recordatorios por WhatsApp y agenda por cabina o profesional. Probá TurnosPro gratis.',
    h1: 'Sistema de turnos para centros de estética',
    eyebrow: 'Centros de estética',
    intro: [
      'En un centro de estética un turno no es un corte de 30 minutos: es una limpieza facial de una hora, una sesión de depilación definitiva, un tratamiento corporal que ocupa la cabina toda la tarde. Cuando esa clienta no aparece, la pérdida es grande. TurnosPro es un sistema de turnos online para centros de estética que resuelve justo eso: señas obligatorias con MercadoPago, recordatorios y confirmación por WhatsApp, y una agenda por cabina o por profesional que nunca se superpone.',
      'Tus clientas reservan solas las 24 horas desde tu propio sitio, con tu marca. Vos dejás de perseguir confirmaciones y llenás la agenda con turnos que se cumplen.',
    ],
    sections: [
      {
        h2: 'Señas obligatorias para tratamientos largos',
        paragraphs: [
          'La regla es simple: cuanto más largo y más caro es el tratamiento, más te duele una ausencia. Un sistema de turnos para centros de estética tiene que permitirte exigir una seña antes de bloquear una cabina por dos horas.',
          'En TurnosPro definís, servicio por servicio, si la reserva requiere seña y de qué monto. La clienta paga con MercadoPago desde el celular en el mismo momento en que reserva; si no paga, el turno no se confirma. El dinero va directo a tu cuenta de MercadoPago y TurnosPro no cobra comisión por cada turno.',
          'Con señas y recordatorios activos, los negocios que usan TurnosPro reportan hasta un 80% menos de cancelaciones. Para una esteticista, eso es la diferencia entre una agenda que parece llena y una que factura.',
        ],
      },
      {
        h2: 'Agenda por cabina y por profesional',
        paragraphs: [
          'Un centro de estética tiene recursos que no se pueden duplicar: cabinas, camillas, equipos. Y profesionales con distintas especialidades: una hace faciales, otra depilación, otra masajes. La agenda tiene que respetar todo eso.',
          'TurnosPro te da una agenda por profesional con vista diaria, semanal y mensual, donde cada servicio ocupa exactamente el tiempo que dura. Cargás bloqueos para limpieza de cabina, capacitaciones o descansos, y turnos recurrentes para las sesiones que se repiten, como los planes de depilación o los tratamientos en varias etapas.',
        ],
        bullets: [
          'Duración real por tratamiento: nada de encajar una hora y media en un hueco de 45 minutos.',
          'Bloqueos de horario por profesional.',
          'Turnos recurrentes para sesiones periódicas.',
          'Disponibilidad en tiempo real en tu sitio de reservas.',
          'Varias sucursales, cada una con su equipo y su agenda.',
        ],
      },
      {
        h2: 'Recordatorios y confirmación automática por WhatsApp',
        paragraphs: [
          'Aunque haya seña, el recordatorio sigue siendo clave: la clienta reservó hace tres semanas y ya no se acuerda del horario. TurnosPro envía recordatorios y confirmaciones por WhatsApp de forma automática, con la anticipación que vos elijas.',
          'Si además querés que la confirmación sea inteligente, activás el agente de IA como add-on. Le escribe a cada clienta desde el número de WhatsApp de tu centro, entiende la respuesta y actúa solo: confirma el turno o lo cancela y libera la cabina para otra persona. Sale con tu marca y tu tono, y vos no intervenís.',
        ],
      },
      {
        h2: 'Catálogo de tratamientos con precios y especialistas',
        paragraphs: [
          'Limpieza facial profunda, peeling, radiofrecuencia, depilación definitiva por zona, masajes reductores, drenaje linfático, uñas esculpidas, pestañas. Cada uno con su precio, su duración y quién lo hace. Cuando el catálogo está claro en tu sitio de reservas, la clienta reserva sin preguntarte nada por WhatsApp y llega sabiendo qué va a pagar.',
          'El catálogo también le dice a la agenda cuánto dura cada cosa, así que no hay riesgo de que un tratamiento largo quede metido en un hueco corto. Y si cambiás precios, se actualizan en el momento.',
        ],
      },
      {
        h2: 'Tu propio sitio de reservas, con tu marca',
        paragraphs: [
          'TurnosPro no es un directorio donde tu centro aparece al lado de la competencia. Es tu web de turnos, con tu logo y tus colores, que funciona en cualquier celular sin descargar nada. La compartís en Instagram, WhatsApp y Google, y las reservas entran a tu agenda con notificación en el momento.',
          'Vos gestionás desde el panel web o la app para iPhone, con historial de cada clienta, reportes de ocupación y facturación por profesional, y soporte prioritario cuando lo necesites.',
        ],
      },
      {
        h2: 'Cómo arranca un centro de estética con TurnosPro',
        bullets: [
          'Creás tu cuenta con tu email y entrás directo a 7 días gratis, sin tarjeta.',
          'Cargás profesionales, horarios y el catálogo de tratamientos con duración y precio.',
          'Definís qué tratamientos exigen seña y conectás tu cuenta de MercadoPago.',
          'Activás recordatorios por WhatsApp y, si querés, el agente de IA.',
          'Compartís el link de tu sitio de reservas y empezás a recibir turnos.',
        ],
        after: [
          'La puesta a punto lleva unos 15 minutos. No hay permanencia: probás gratis, cambiás de plan cuando quieras y cancelás sin trámites.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo exigir seña solo en algunos tratamientos?',
        a: 'Sí. La seña se configura servicio por servicio: podés pedirla en los tratamientos largos o caros y dejar sin seña los cortos. El monto también lo definís vos.',
      },
      {
        q: '¿La agenda respeta la duración real de cada tratamiento?',
        a: 'Sí. Cada servicio del catálogo tiene su duración y la agenda arma los huecos con ese tiempo, por profesional. Tus clientas solo ven horarios donde el tratamiento entra completo.',
      },
      {
        q: '¿Los recordatorios y el agente de IA salen de mi número?',
        a: 'Sí. Recordatorios, confirmaciones y el agente de IA (add-on) funcionan desde el número de WhatsApp de tu centro, con tu nombre y tu tono.',
      },
      {
        q: '¿Sirve para tratamientos en varias sesiones?',
        a: 'Sí. Podés cargar turnos recurrentes para planes de depilación definitiva, tratamientos corporales o cualquier servicio que se repita cada cierto tiempo.',
      },
      {
        q: '¿Cuánto cuesta TurnosPro para un centro de estética?',
        a: 'Desde ARS 37.500 por mes (plan de 12 meses) hasta ARS 50.000 por mes (plan mensual). Todos los planes arrancan con 7 días gratis sin tarjeta, incluyen reservas ilimitadas y no tienen permanencia.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
  {
    ...verticalLinks[3],
    title: 'Sistema de turnos para consultorios | TurnosPro',
    description:
      'Agenda online para psicólogos, nutricionistas y kinesiólogos: turnos recurrentes, confirmación automática por WhatsApp e historial de cada paciente.',
    h1: 'Sistema de turnos para consultorios',
    eyebrow: 'Consultorios',
    intro: [
      'Si atendés en un consultorio, sabés que el trabajo no termina con la sesión: hay que agendar la próxima, recordarle al paciente, confirmar la noche anterior y reacomodar todo cuando alguien cancela. TurnosPro es un sistema de turnos online para consultorios de psicólogos, nutricionistas, kinesiólogos y otros profesionales de la salud: reservas 24/7 desde tu propio sitio, turnos recurrentes, confirmación automática por WhatsApp e historial de turnos de cada paciente.',
      'Se configura en 15 minutos, con 7 días gratis y sin permanencia. Funciona tanto para un profesional solo como para un consultorio con varios especialistas.',
    ],
    sections: [
      {
        h2: 'Turnos recurrentes para pacientes que vienen todas las semanas',
        paragraphs: [
          'En psicología, nutrición o kinesiología la mayoría de los pacientes repiten: el mismo día, a la misma hora, semana tras semana. Un sistema de turnos para consultorios tiene que hacer eso en un solo paso, no obligarte a cargar cada sesión a mano.',
          'En TurnosPro creás el turno recurrente una vez y la agenda lo repite con la frecuencia que definas. Si el paciente necesita cambiar una sesión puntual, la movés sin romper la serie. Y si se da de alta o pausa el tratamiento, cortás la recurrencia y esos horarios quedan libres para pacientes nuevos.',
        ],
        bullets: [
          'Turnos recurrentes semanales o con la frecuencia que elijas.',
          'Vista diaria, semanal y mensual por profesional.',
          'Bloqueos de horario para supervisiones, cursos o vacaciones.',
          'Disponibilidad en tiempo real en tu sitio de reservas.',
        ],
      },
      {
        h2: 'Confirmación automática por WhatsApp, sin perseguir a nadie',
        paragraphs: [
          'Confirmar turnos a mano la noche anterior es una de las tareas que más tiempo le roban a un profesional de la salud. TurnosPro manda recordatorios y confirmaciones por WhatsApp de forma automática, con la anticipación que vos elijas: el día anterior, unas horas antes o ambos.',
          'Con el agente de IA como add-on, la confirmación es completa: le escribe a cada paciente desde el número de WhatsApp de tu consultorio, entiende la respuesta y actúa solo. Si confirma, queda marcado en tu agenda; si cancela, el horario se libera y podés ofrecérselo a alguien de la lista de espera. Todo con tu nombre y tu tono, sin que intervengas.',
        ],
      },
      {
        h2: 'Historial de turnos de cada paciente',
        paragraphs: [
          'TurnosPro guarda el historial de turnos y las preferencias de cada paciente, con la comunicación centralizada en un solo lugar: cuándo vino, qué servicio tomó, si confirmó o canceló, si dejó seña. Eso te sirve para ver rápido quién falta seguido, quién está al día y cuándo fue la última sesión.',
          'Aclaración importante: TurnosPro es un sistema de gestión de turnos, no una historia clínica. Los datos de cada consultorio están aislados de los demás negocios y solo los ve el equipo que vos autorizás, según su rol.',
        ],
      },
      {
        h2: 'Señas con MercadoPago para reducir ausencias',
        paragraphs: [
          'Muchos consultorios ya cobran la sesión por adelantado o piden una seña para la primera consulta. TurnosPro lo integra en la reserva: activás cobros con tu propia cuenta de MercadoPago, elegís qué servicios piden seña y el paciente paga desde el celular al reservar. La plata entra en tu cuenta, sin comisión de TurnosPro por turno.',
          'Con señas y confirmación automática, los negocios que usan TurnosPro reportan hasta un 80% menos de cancelaciones. Para un consultorio con turnos de 45 o 60 minutos, cada ausencia evitada es una sesión más facturada.',
        ],
      },
      {
        h2: 'Tu sitio de reservas y tu catálogo de prestaciones',
        paragraphs: [
          'Publicás tu propia web de turnos, con tu nombre y tu marca, donde el paciente elige el profesional, la prestación y el horario. Primera consulta, sesión de seguimiento, consulta nutricional, sesión de kinesiología, evaluación: cada una con su duración y, si querés, su precio.',
          'Compartís el link por WhatsApp, Instagram o Google. El paciente reserva sin registrarse ni instalar nada, y vos recibís la notificación en el momento. Gestionás desde el panel web o la app para iPhone, y con los reportes ves ocupación y facturación por profesional.',
        ],
        bullets: [
          'Catálogo de prestaciones con duración y precio.',
          'Varios profesionales y sucursales bajo la misma cuenta.',
          'Notificaciones en tiempo real ante cada reserva.',
          'Reportes de ocupación y facturación.',
        ],
      },
      {
        h2: 'Cómo arranca un consultorio con TurnosPro',
        bullets: [
          'Creás tu cuenta con tu email y entrás directo a 7 días gratis, sin tarjeta.',
          'Cargás profesionales, horarios y prestaciones con su duración.',
          'Definís turnos recurrentes para los pacientes que ya tenés.',
          'Activás recordatorios y confirmación por WhatsApp, y el agente de IA si querés.',
          'Compartís el link de tu sitio y empezás a recibir reservas.',
        ],
        after: [
          'Tenés soporte prioritario en la puesta en marcha. No hay permanencia: probás gratis, cambiás de plan en un clic y cancelás cuando quieras.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo cargar un turno fijo semanal para un paciente?',
        a: 'Sí. Creás el turno recurrente una sola vez, con la frecuencia que quieras, y la agenda lo repite. Podés mover una sesión puntual sin afectar el resto o cortar la serie cuando el paciente termina el tratamiento.',
      },
      {
        q: '¿La confirmación por WhatsApp es automática?',
        a: 'Sí. TurnosPro envía recordatorios y confirmaciones automáticas antes de cada turno. Con el agente de IA (add-on), además interpreta la respuesta del paciente y confirma o libera el horario en tu agenda sin que intervengas.',
      },
      {
        q: '¿TurnosPro reemplaza la historia clínica?',
        a: 'No. TurnosPro gestiona turnos, recordatorios, señas y el historial de turnos de cada paciente. No es una historia clínica ni reemplaza tu sistema de registros clínicos.',
      },
      {
        q: '¿Sirve para un consultorio con varios profesionales?',
        a: 'Sí. Cada profesional tiene su agenda, sus horarios y sus prestaciones. El paciente elige con quién atenderse y ve solo los horarios libres de esa persona. También podés cargar más de una sede.',
      },
      {
        q: '¿Cuánto cuesta un sistema de turnos para consultorios?',
        a: 'TurnosPro cuesta ARS 50.000 por mes en el plan mensual, y baja a ARS 45.000, ARS 40.000 y ARS 37.500 por mes en los planes de 3, 6 y 12 meses. Todos con 7 días gratis, sin tarjeta y sin permanencia.',
      },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
  },
  {
    // Landing de funcionalidad (no es un rubro): no va en verticalLinks para no aparecer en BusinessTypes/Footer.
    slug: 'reservas-online',
    path: '/reservas-online',
    label: 'Reservas online',
    businessTypeLabel: 'Reservas online',
    title: 'Recordatorio de turnos por WhatsApp y reservas online',
    description:
      'Recordatorio de turnos por WhatsApp desde tu número, reservas online 24/7 y señas con MercadoPago sin comisión. Probá TurnosPro 7 días gratis.',
    h1: 'Reservas online con recordatorio de turnos por WhatsApp',
    eyebrow: 'Reservas online',
    intro: [
      'Un sistema de reservas online tiene que hacer tres cosas: dejar que el cliente reserve solo a cualquier hora, cobrarle una seña para que no falte y recordarle el turno por el canal que sí lee. TurnosPro hace las tres desde una sola cuenta: tu propia web de turnos disponible 24/7, señas con MercadoPago directo en tu cuenta y recordatorios y confirmación por WhatsApp desde tu propio número.',
      'Sirve para peluquerías, barberías, centros de estética, consultorios, estudios y cualquier negocio que trabaje con turnos. Se configura en 15 minutos, se prueba 7 días gratis y no tiene permanencia.',
    ],
    sections: [
      {
        h2: 'Tu web de reservas, abierta las 24 horas',
        paragraphs: [
          'TurnosPro te da un sitio de reservas propio, rápido y pensado para el celular. Cargás tu catálogo de servicios con duración y precio, tus profesionales con sus horarios y, si tenés más de una, tus sucursales. El cliente entra desde el link que compartís en Instagram, en tu perfil de Google o en el estado de WhatsApp, elige servicio, profesional y horario, y reserva sin descargar ninguna app ni crear una cuenta.',
          'La disponibilidad se calcula en tiempo real: dos clientes no pueden tomar el mismo horario, los bloqueos que cargás (almuerzo, cursos, vacaciones) no se ofrecen y los turnos recurrentes se repiten solos. Vos ves todo en una agenda por profesional con vista diaria, semanal y mensual.',
        ],
      },
      {
        h2: 'Señas con MercadoPago, sin comisión',
        paragraphs: [
          'La reserva online sin seña es una promesa; con seña es un compromiso. En TurnosPro definís, servicio por servicio, si pedís una seña parcial o el pago completo. El cliente paga con MercadoPago desde el celular en el mismo momento en que reserva, y la plata entra directo en tu cuenta. TurnosPro no cobra comisión por turno ni por cobro: pagás solo la cuota del plan.',
        ],
        bullets: [
          'Seña parcial o pago total, configurable por servicio.',
          'Cobro con tu propia cuenta de MercadoPago.',
          '0% de comisión sobre cada turno.',
          'El horario queda tomado recién cuando entra el pago.',
        ],
      },
      {
        h2: 'Recordatorio de turnos por WhatsApp desde tu número',
        paragraphs: [
          'Tus clientes no leen el mail: leen WhatsApp. TurnosPro manda el recordatorio de cada turno por WhatsApp desde el número de tu negocio, no desde uno genérico, y está incluido en el plan sin paquetes de mensajes. Con el agente de IA de confirmación, además, el sistema le escribe al cliente antes del turno, entiende la respuesta y actúa solo: confirma la asistencia o cancela y te libera el horario para que otra persona lo tome.',
          'Los negocios que combinan señas y recordatorios con TurnosPro reportan hasta un 80% menos de ausencias. Es la diferencia entre agendar turnos y cobrarlos.',
        ],
      },
      {
        h2: 'Gestión de clientes y reportes',
        paragraphs: [
          'Cada cliente tiene su ficha con historial de turnos y preferencias, así que la persona que atiende sabe quién viene y qué se hizo la última vez. Los reportes te muestran ocupación y facturación por profesional y por sucursal, para saber qué horarios se llenan, qué servicios se venden y a quién conviene darle más agenda.',
        ],
      },
      {
        h2: 'Cómo empezar',
        bullets: [
          'Creás tu cuenta y entrás directo a 7 días gratis, sin tarjeta.',
          'Cargás servicios, precios, profesionales y horarios.',
          'Compartís tu link de reservas en redes y en tu perfil de Google.',
          'Activás las señas con tu cuenta de MercadoPago y el agente de IA de confirmación.',
        ],
        after: [
          'Todo el proceso lleva 15 minutos. Si venís de un cuaderno, una planilla o de otro sistema, importás tus clientes y seguís.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Qué es un sistema de reservas online?',
        a: 'Es una web donde tus clientes reservan solos un turno, eligiendo servicio, profesional y horario, sin llamarte ni escribirte. TurnosPro suma a eso la seña con MercadoPago y los recordatorios por WhatsApp, que son lo que baja las ausencias.',
      },
      {
        q: '¿Los recordatorios por WhatsApp están incluidos?',
        a: 'Sí. Los recordatorios salen desde tu propio número y están incluidos en el plan, sin paquetes de mensajes. El agente de IA que pide confirmación y entiende la respuesta se activa como complemento.',
      },
      {
        q: '¿Cómo funciona el recordatorio de turnos por WhatsApp?',
        a: 'Conectás el WhatsApp de tu negocio, activás los recordatorios y elegís con cuánta anticipación salen. Desde ahí, cada turno confirmado, reservado por la web o cargado por vos en la agenda, recibe su recordatorio automático por WhatsApp desde tu número y con el texto que vos definas. No tenés que mandar nada a mano. Si activás el agente de IA de confirmación, el cliente puede responder ese mensaje para confirmar o cancelar, y el horario cancelado vuelve a quedar libre en la agenda.',
      },
      {
        q: '¿TurnosPro cobra comisión por las reservas o por las señas?',
        a: 'No. La seña o el pago completo entran directo en tu cuenta de MercadoPago y no hay comisión por turno ni por cobro. Pagás solo la cuota del plan.',
      },
      {
        q: '¿Mis clientes tienen que instalar una app?',
        a: 'No. Reservan desde el navegador del celular, con un link, sin descargar nada ni crear una cuenta. El recordatorio les llega por WhatsApp.',
      },
      {
        q: '¿Cuánto cuesta el sistema de reservas online?',
        a: 'TurnosPro cuesta ARS 50.000 por mes en el plan mensual, y baja a ARS 45.000, ARS 40.000 y ARS 37.500 por mes en los planes de 3, 6 y 12 meses. Todos con 7 días gratis sin tarjeta, reservas ilimitadas, profesionales y sucursales incluidos y sin permanencia.',
      },
      {
        q: '¿Sirve para varios profesionales o varias sucursales?',
        a: 'Sí. Cada profesional tiene su agenda, sus servicios y sus horarios, y podés cargar más de una sucursal bajo la misma cuenta, sin pagar por profesional.',
      },
    ],
    datePublished: '2026-09-04',
    dateModified: '2026-10-06',
  },
  {
    // Landing de funcionalidad (señas). Cada afirmación sale del backend:
    // Service.RequiresDeposit/DepositPercentage/DepositFixedAmount/DepositPolicy (TenantEntities.cs),
    // MercadoPagoService.CalculateDepositAsync / CreatePaymentPreferenceAsync / webhook, PublicController.CreateBooking.
    // Ojo: el webhook NO libera turnos impagos solos y TurnosPro NO devuelve señas: no prometer eso.
    slug: 'sistema-de-turnos-con-sena',
    path: '/sistema-de-turnos-con-sena',
    label: 'Turnos con seña',
    businessTypeLabel: 'Turnos con seña',
    kind: 'feature',
    title: 'Sistema de turnos con seña por Mercado Pago | TurnosPro',
    description:
      'Cobrá la seña del turno online con Mercado Pago: el cliente paga al reservar, el turno se confirma solo y la plata entra en tu cuenta. Sin comisión.',
    h1: 'Sistema de turnos con seña por Mercado Pago',
    eyebrow: 'Señas con Mercado Pago',
    intro: [
      'Un turno sin seña es una promesa; un turno con seña es un compromiso. Con TurnosPro cobrás la seña del turno online con Mercado Pago en el mismo momento en que el cliente reserva: elige servicio, profesional y horario en tu web de turnos, paga desde el celular y el turno se confirma solo cuando Mercado Pago aprueba el pago.',
      'La plata entra directo en tu cuenta de Mercado Pago, que conectás una sola vez desde el panel. TurnosPro no le suma comisión a la seña: pagás la cuota del plan y listo. Vos elegís qué servicios piden seña, de cuánto y a qué clientes.',
    ],
    sections: [
      {
        h2: 'Por qué pedir seña para los turnos',
        paragraphs: [
          'Cuando reservar no cuesta nada, cancelar tampoco: el cliente que se olvida o le surge otra cosa simplemente no viene, y ese horario ya no lo vendés. En los servicios largos o caros, un turno perdido es una parte grande del día.',
          'La seña cambia esa ecuación. Filtra las reservas al pasar y hace que el que no puede venir te avise antes, porque tiene plata puesta. Y si no avisa, la seña cubre parte del horario que perdiste.',
          'El problema es cobrarla a mano: pasar el alias, esperar el comprobante, revisar la cuenta y recién ahí confirmar el turno. Un sistema de turnos con seña online hace todo ese ida y vuelta solo.',
        ],
      },
      {
        h2: 'Cómo funciona la seña con Mercado Pago en TurnosPro, paso a paso',
        bullets: [
          'El cliente entra a tu web de turnos, elige servicio, profesional y horario y deja sus datos. No tiene que crear una cuenta ni descargar nada.',
          'Si ese servicio pide seña, TurnosPro calcula el monto según tu configuración y abre el pago de Mercado Pago por ese importe, a nombre de tu negocio.',
          'Mientras el cliente paga, el turno queda en tu agenda como pendiente de pago y ese horario no se le ofrece a nadie más.',
          'Cuando Mercado Pago aprueba el pago, el turno pasa a confirmado automáticamente y el cobro queda registrado en el turno.',
          'Te llega el aviso de seña recibida en la app de TurnosPro, sin pedir comprobantes ni revisar la cuenta.',
        ],
        after: [
          'Si usás el asistente de WhatsApp de TurnosPro, el cliente que reserva por chat recibe el link de la seña en la misma conversación y, cuando el pago se acredita, un mensaje que le confirma el turno.',
        ],
      },
      {
        h2: 'Qué pasa si el cliente no paga la seña o cancela',
        paragraphs: [
          'Si el cliente no completa el pago, el turno no se confirma: queda como pendiente de pago. TurnosPro no lo da de baja solo, así que vos decidís qué hacer: esperarlo, escribirle o cancelarlo desde la agenda. Cuando lo cancelás, el horario vuelve a quedar libre para otra reserva.',
          'Si el cliente ya pagó y después cancela, la seña está en tu cuenta de Mercado Pago, no en TurnosPro. La política la ponés vos: si avisó con tiempo podés devolverla desde tu Mercado Pago o acordar usarla en otro turno; si no avisó, te la quedás como compensación. TurnosPro no hace devoluciones automáticas ni retiene la plata en el medio.',
        ],
      },
      {
        h2: 'Cómo configurar las señas en TurnosPro',
        bullets: [
          'Conectás tu cuenta de Mercado Pago desde el panel: autorizás a TurnosPro en Mercado Pago, sin copiar claves ni tokens a mano.',
          'En cada servicio activás "Requiere seña para reservar". Los servicios sin seña se siguen reservando como siempre.',
          'Elegís el tipo de seña: un porcentaje del precio del servicio o un monto fijo. La seña nunca supera el precio del servicio.',
          'Elegís a quién se la pedís: a todos los clientes, solo a los clientes nuevos o solo cuando el turno se reserva con cierta cantidad de días de anticipación.',
        ],
        after: [
          'Podés cambiar la configuración de cada servicio cuando quieras. Todo esto viene en el mismo plan, con 7 días de prueba gratis y sin tarjeta.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Cómo cobro la seña de un turno con Mercado Pago?',
        a: 'Conectás tu cuenta de Mercado Pago a TurnosPro y activás la seña en los servicios que quieras. Cuando un cliente reserva uno de esos servicios desde tu web de turnos, paga la seña con Mercado Pago en ese momento y el turno se confirma solo cuando el pago se aprueba.',
      },
      {
        q: '¿La seña puede ser un porcentaje o un monto fijo?',
        a: 'Las dos cosas. En cada servicio elegís si la seña es un porcentaje del precio o un monto fijo, y si se la pedís a todos los clientes, solo a los nuevos o solo a las reservas hechas con cierta anticipación. La seña nunca supera el precio del servicio.',
      },
      {
        q: '¿Qué pasa si el cliente reserva y no paga la seña?',
        a: 'El turno no se confirma: queda en tu agenda como pendiente de pago y ese horario no se ofrece a otros clientes. TurnosPro no lo cancela solo; si no paga, lo cancelás vos desde la agenda y el horario vuelve a quedar libre.',
      },
      {
        q: '¿TurnosPro cobra comisión por las señas?',
        a: 'No. La seña entra directo en tu cuenta de Mercado Pago y TurnosPro no le suma comisión: pagás solo la cuota del plan. Las comisiones de Mercado Pago son las de tu propia cuenta.',
      },
      {
        q: '¿Cómo devuelvo una seña si el cliente cancela?',
        a: 'Como la plata está en tu cuenta de Mercado Pago, la devolución la hacés vos desde Mercado Pago, según la política de cancelación que tengas. TurnosPro no devuelve señas automáticamente ni retiene el dinero.',
      },
    ],
    datePublished: '2026-10-15',
    dateModified: '2026-10-15',
  },
  {
    // Landing de "gratis". Hechos: RegistrationController (alta por mail, 7 días, Trial:RequireCard=false
    // por defecto → sin tarjeta), SubscriptionMiddleware (al vencer, 402 en el panel hasta elegir plan),
    // /api/subscription-plans (precios). TurnosPro NO tiene plan gratuito: no prometerlo.
    slug: 'sistema-de-turnos-online-gratis',
    path: '/sistema-de-turnos-online-gratis',
    label: 'Prueba gratis',
    businessTypeLabel: 'Prueba gratis',
    kind: 'feature',
    featureCopy: {
      callout: 'La prueba gratis es el mismo plan que usan los negocios que pagan TurnosPro.',
      pricingIntro:
        'Después de los 7 días gratis, un solo plan con reservas ilimitadas, señas con Mercado Pago, recordatorios por WhatsApp y agenda por profesional. Sin permanencia; cuanto más largo el compromiso, más barato el mes.',
      faqTitle: 'Preguntas frecuentes sobre la prueba gratis',
    },
    title: 'Sistema de turnos online gratis por 7 días | TurnosPro',
    description:
      'Probá gratis el sistema de turnos online TurnosPro: 7 días sin tarjeta, con reservas 24/7, señas por Mercado Pago y recordatorios por WhatsApp.',
    h1: 'Sistema de turnos online gratis por 7 días, sin tarjeta',
    eyebrow: 'Prueba gratis',
    intro: [
      'Si estás buscando un sistema de turnos online gratis, lo más útil es probar uno con tu negocio real antes de pagar nada. TurnosPro tiene 7 días de prueba gratis sin tarjeta: te registrás con tu mail, cargás tus servicios y tus profesionales, y en el día ya tenés tu link de reservas para compartir por WhatsApp o Instagram.',
      'Durante la prueba usás el mismo plan que usan los negocios que pagan: reservas 24/7, agenda por profesional, señas con Mercado Pago y recordatorios por WhatsApp. Al terminar elegís si seguís; si no seguís, no se te cobra nada.',
    ],
    sections: [
      {
        h2: '¿Hay un sistema de turnos online gratis de verdad?',
        paragraphs: [
          'Lo que se suele llamar "gratis" son tres cosas distintas: una agenda en papel o en una planilla, un sistema con plan gratuito limitado y la prueba gratis de un sistema pago. La agenda en papel no cuesta nada, pero no toma reservas sola, no manda recordatorios y depende de que alguien conteste cada mensaje. Si querés arrancar así, tenemos una agenda de turnos para imprimir, gratis, con hojas diaria y semanal por profesional.',
          'Si mirás un plan gratuito, fijate cuántos turnos o profesionales permite, si cobra una comisión por cada seña y si los recordatorios están incluidos o se pagan aparte. TurnosPro no tiene plan gratuito: tiene 7 días de prueba sin tarjeta con todo incluido y después un precio mensual fijo, sin comisión por seña.',
        ],
      },
      {
        h2: 'Qué incluye la prueba gratis',
        bullets: [
          'Tu página de reservas con link propio, para que tus clientes reserven solos las 24 horas.',
          'Agenda por profesional y por sucursal, con vista diaria, semanal y mensual.',
          'Señas con Mercado Pago: la plata entra a tu cuenta y TurnosPro no le suma comisión.',
          'Recordatorios y confirmación de turnos por WhatsApp desde el número de tu negocio.',
          'Reportes de ocupación y facturación.',
        ],
        after: [
          'Es el mismo plan que se paga después: reservas ilimitadas y sin pagar por profesional.',
        ],
      },
      {
        h2: 'Cómo empezar en 3 pasos',
        bullets: [
          'Te registrás con tu mail: te llega un código, lo ingresás y entrás directo al panel. No dejás tarjeta.',
          'Cargás tus servicios con su duración y precio, tus profesionales y sus horarios.',
          'Compartís tu link de reservas y empezás a recibir turnos.',
        ],
      },
      {
        h2: 'Qué pasa cuando terminan los 7 días',
        paragraphs: [
          'Para seguir usando el panel elegís un plan y lo pagás con Mercado Pago. No hay un cobro automático que no hayas autorizado, porque nunca dejaste la tarjeta, y no hay permanencia: podés dar de baja cuando quieras.',
          'El plan mensual cuesta ARS 50.000 por mes. Si pagás por adelantado sale menos: ARS 45.000 por mes el trimestral, ARS 40.000 el semestral y ARS 37.500 el anual. Los precios vigentes están siempre en la sección de precios del sitio.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Hay un sistema de turnos online gratis?',
        a: 'TurnosPro no tiene plan gratuito, pero lo podés usar 7 días gratis y sin tarjeta, con todo incluido. Si todavía no querés un sistema, tenemos una agenda de turnos para imprimir, gratis.',
      },
      {
        q: '¿Necesito tarjeta de crédito para probar TurnosPro?',
        a: 'No. Te registrás con tu mail, entrás al panel y usás TurnosPro 7 días sin dejar tarjeta ni datos de pago. Recién al terminar elegís un plan si querés seguir.',
      },
      {
        q: '¿Qué incluye la prueba gratis?',
        a: 'Lo mismo que el plan pago: página de reservas con link propio, agenda por profesional y sucursal, señas con Mercado Pago sin comisión, recordatorios por WhatsApp y reportes, con reservas ilimitadas y sin pagar por profesional.',
      },
      {
        q: '¿Cuánto cuesta TurnosPro después de la prueba?',
        a: 'El plan mensual cuesta ARS 50.000 por mes; trimestral, semestral y anual salen ARS 45.000, 40.000 y 37.500 por mes. No hay permanencia y TurnosPro no cobra comisión por las señas.',
      },
      {
        q: '¿Qué pasa si no sigo después de los 7 días?',
        a: 'No se te cobra nada, porque nunca dejaste la tarjeta. El panel queda bloqueado hasta que elijas un plan.',
      },
    ],
    datePublished: '2026-10-16',
    dateModified: '2026-10-16',
  },
];

export function getVertical(slug: string): VerticalContent {
  const v = verticals.find((x) => x.slug === slug);
  if (!v) throw new Error(`Vertical no encontrada: ${slug}`);
  return v;
}

