// Datos 100% inventados para las demos (/demo-admin y /demo-app). Semilla fija, pero relativos
// a la fecha de hoy para que la agenda y los "hace X días" nunca queden viejos.

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PayMethod = 'cash' | 'card' | 'transfer' | 'mercadopago';

export type Service = {
  id: string;
  name: string;
  duration: number; // minutos
  price: number;
  deposit: number; // 0 = no pide seña
  category: string;
  popular?: boolean;
};

export type Professional = { id: string; name: string; role: string; color: string };

export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  lastVisit: Date | null;
  visits: number;
  since: Date;
};

export type Booking = {
  id: number;
  customerId: number;
  serviceId: string;
  proId: string;
  start: Date;
  status: BookingStatus;
  depositPaid: boolean;
  paid: boolean;
  method?: PayMethod;
  viaBot?: boolean;
  viaAgent?: boolean;
};

export const BUSINESS = 'Estudio Nómade';
export const SUBDOMAIN = 'estudionomade';
export const ADMIN = { firstName: 'Sofía', email: 'sofia@estudionomade.com' };

export const SERVICES: Service[] = [
  { id: 'corte', name: 'Corte de pelo', duration: 45, price: 14000, deposit: 0, category: 'Cortes', popular: true },
  { id: 'corte-barba', name: 'Corte + barba', duration: 60, price: 18000, deposit: 0, category: 'Barbería', popular: true },
  { id: 'barba', name: 'Perfilado de barba', duration: 30, price: 8000, deposit: 0, category: 'Barbería' },
  { id: 'color', name: 'Coloración completa', duration: 120, price: 42000, deposit: 12000, category: 'Color', popular: true },
  { id: 'mechas', name: 'Mechas / balayage', duration: 150, price: 58000, deposit: 18000, category: 'Color' },
  { id: 'brushing', name: 'Lavado + brushing', duration: 40, price: 10000, deposit: 0, category: 'Peinados' },
  { id: 'keratina', name: 'Alisado con keratina', duration: 120, price: 55000, deposit: 15000, category: 'Tratamientos' },
];

export const PROS: Professional[] = [
  { id: 'sofia', name: 'Sofía Ledesma', role: 'Estilista', color: '#1E40AF' },
  { id: 'matias', name: 'Matías Roldán', role: 'Barbero', color: '#0F766E' },
  { id: 'lucia', name: 'Lucía Pereyra', role: 'Colorista', color: '#9D174D' },
];

export const METHOD_LABEL: Record<PayMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mercadopago: 'MercadoPago',
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No vino',
};

// Mismos colores que CalendarView del panel real.
export const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: '#ff9800',
  confirmed: '#4caf50',
  completed: '#2196f3',
  cancelled: '#f44336',
  no_show: '#9e9e9e',
};

const FIRST = ['Martina', 'Joaquín', 'Camila', 'Tomás', 'Valentina', 'Lautaro', 'Julieta', 'Franco', 'Agustina', 'Nicolás',
  'Florencia', 'Bruno', 'Micaela', 'Santiago', 'Rocío', 'Facundo', 'Milagros', 'Ignacio', 'Belén', 'Gonzalo',
  'Paula', 'Ezequiel', 'Antonella', 'Federico', 'Brenda', 'Matías', 'Luciana', 'Diego', 'Abril', 'Emiliano'];
const LAST = ['Benítez', 'Romero', 'Acosta', 'Medina', 'Herrera', 'Castro', 'Ruiz', 'Álvarez', 'Molina', 'Ortiz',
  'Silva', 'Rojas', 'Ferreyra', 'Godoy', 'Ríos', 'Sosa', 'Luna', 'Aguirre', 'Peralta', 'Cabrera'];

const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const DAY = 86_400_000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(startOfDay(d).getTime() + n * DAY + (d.getTime() - startOfDay(d).getTime()));
export const addMinutes = (d: Date, n: number) => new Date(d.getTime() + n * 60_000);
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
export const atTime = (day: Date, h: number, m = 0) => { const d = startOfDay(day); d.setHours(h, m, 0, 0); return d; };

export const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
export const pad = (n: number) => String(n).padStart(2, '0');
export const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
export const fmtShort = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
export const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const longDate = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
export const initials = (name: string) => name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id)!;
export const proById = (id: string) => PROS.find((p) => p.id === id)!;
export const fullName = (c: Customer) => `${c.firstName} ${c.lastName}`;

export function buildCustomers(today: Date): Customer[] {
  const rng = mulberry32(8080);
  return Array.from({ length: 84 }, (_, i) => {
    const firstName = FIRST[i % FIRST.length];
    const lastName = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length];
    const handle = `${firstName}.${lastName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return {
      id: i + 1,
      firstName,
      lastName,
      phone: `+54 9 11 ${4000 + Math.floor(rng() * 5999)}-${1000 + Math.floor(rng() * 8999)}`,
      email: `${handle}@gmail.com`,
      lastVisit: rng() < 0.08 ? null : addDays(today, -Math.floor(rng() * 60)),
      visits: 1 + Math.floor(rng() * 18),
      since: addDays(today, -30 - Math.floor(rng() * 700)),
    };
  });
}

// Turnos de 8 días atrás a 7 adelante, lunes a sábado, de 9 a 20 hs.
export function buildBookings(customers: Customer[], today: Date): Booking[] {
  const rng = mulberry32(4242);
  const now = today.getTime();
  const out: Booking[] = [];
  let id = 1;
  const proServices: Record<string, string[]> = {
    sofia: ['corte', 'brushing', 'keratina', 'corte'],
    matias: ['corte-barba', 'barba', 'corte', 'corte-barba'],
    lucia: ['color', 'mechas', 'brushing', 'color'],
  };
  for (let offset = -8; offset <= 7; offset++) {
    const day = addDays(today, offset);
    if (day.getDay() === 0) continue;
    const closeHour = day.getDay() === 6 ? 15 : 20;
    for (const pro of PROS) {
      let cursor = atTime(day, 9, rng() < 0.5 ? 0 : 30);
      while (true) {
        const service = serviceById(proServices[pro.id][Math.floor(rng() * 4)]);
        const end = addMinutes(cursor, service.duration);
        if (end.getHours() + end.getMinutes() / 60 > closeHour) break;
        const busy = offset < 0 ? 0.78 : offset === 0 ? 0.72 : Math.max(0.25, 0.7 - offset * 0.07);
        if (rng() < busy) {
          const start = new Date(cursor);
          const past = end.getTime() < now;
          let status: BookingStatus;
          const r = rng();
          if (past) status = r < 0.04 ? 'no_show' : r < 0.08 ? 'cancelled' : 'completed';
          else if (offset <= 1) status = r < 0.72 ? 'confirmed' : r < 0.95 ? 'pending' : 'cancelled';
          else status = r < 0.45 ? 'confirmed' : 'pending';
          const methodRoll = rng();
          const method: PayMethod = methodRoll < 0.35 ? 'mercadopago' : methodRoll < 0.6 ? 'cash' : methodRoll < 0.82 ? 'transfer' : 'card';
          out.push({
            id: id++,
            customerId: customers[Math.floor(rng() * customers.length)].id,
            serviceId: service.id,
            proId: pro.id,
            start,
            status,
            depositPaid: service.deposit > 0 && (status === 'completed' || rng() < 0.85),
            paid: status === 'completed' && rng() > 0.06,
            method: status === 'completed' ? method : undefined,
            viaBot: status === 'confirmed' && rng() < 0.7,
          });
        }
        cursor = addMinutes(end, rng() < 0.3 ? 15 : 0);
      }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// Estadísticas del bot de los últimos 30 días (inventadas, coherentes entre sí).
export const BOT_STATS = { sent: 412, confirmed: 356, cancelled: 31, noAnswer: 25 };
export const PAST_WEEKS_NOSHOW = { before: 18, after: 4 };
