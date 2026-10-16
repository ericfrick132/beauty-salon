/**
 * Onboarding wizard config for TurnosPro.
 *
 * Palette + typography are pulled from the landing's "Editorial Agenda" theme
 * (see src/marketing-next/app/(lib)/theme.ts). The wizard must feel like the
 * landing: warm cream paper, forest/coral ink accents, Fraunces serif display,
 * Space Grotesk body, JetBrains Mono kickers. Until the owner picks the business
 * type it's the product brand; from then on the wizard takes the look of that
 * rubro (config/businessLooks.ts: palette, display font, its own photos).
 */

import React from 'react';
import type {
  OnboardingConfig,
  OnboardingLook,
  ThemePreset,
} from '../components/onboarding/OnboardingWizard';
import { lookFor } from './businessLooks';
import AiChatStoryPanel from '../components/onboarding/AiChatStoryPanel';
import { getWording } from '../utils/wording';

// Images served via Unsplash CDN on beauty / salon / barber verticals.
// Step panels are 4:5 (1200×1500) and the background is 16:9 hero.
// The wizard applies a grayscale(40%) + contrast(1.03) filter so color shifts
// in the source are muted — any on-vertical photo works.
const UNSPLASH = (id: string, w = 1200, h = 1500) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=80&auto=format&fit=crop`;

const palette = {
  paper: '#F4EFE6',        // landing paper, warm cream
  paperRule: 'rgba(23, 20, 16, 0.14)',
  ink: '#171410',          // landing ink
  inkSoft: '#5C5347',      // landing inkSoft
  inkFaint: '#8C8275',     // landing inkMute
  primary: '#1E5E3F',      // landing forest (CTAs, progress fill)
  primaryInk: '#F4EFE6',   // paper on forest
  secondary: '#E8593C',    // landing coral (accent swatch)
  overlay: 'rgba(23, 20, 16, 0.34)',
};

const themePresets: ThemePreset[] = [
  {
    code: 'vibrant',
    label: 'Natural — bosque y coral',
    primary: '#1E5E3F',
    secondary: '#E8593C',
  },
  {
    code: 'inspiring',
    label: 'Inspirador — moderno',
    primary: '#4A5BFF',
    secondary: '#EDF0FF',
  },
  {
    code: 'light',
    label: 'Editorial — minimalista',
    primary: '#171410',
    secondary: '#F5F5F5',
  },
  {
    code: 'dark',
    label: 'Nocturno — modo oscuro',
    primary: '#F4EFE6',
    secondary: '#2A2622',
    darkMode: true,
  },
  {
    code: 'custom',
    label: 'Armá tu propia paleta',
    primary: '#1E5E3F',
    secondary: '#E8593C',
  },
];

const STEP_ALTS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Foto del rubro',
  2: 'El oficio en detalle',
  3: 'Herramientas y productos del rubro',
  4: 'Un cliente atendido',
  5: 'El espacio listo para recibir clientes',
};

/** Look del rubro elegido en el paso 2 (paleta, títulos, fondo, fotos y la paleta como primera opción de marca). */
const lookForActivity = (activity: string): OnboardingLook | null => {
  const look = lookFor(activity);
  if (!look) return null;
  const steps = look.images.steps;
  return {
    palette: look.palette,
    displayFont: look.displayFont,
    backgroundUrl: look.images.bg,
    stepImages: {
      1: { url: steps[1], alt: look.alts?.step1 ?? STEP_ALTS[1] },
      2: { url: steps[2], alt: look.alts?.step2 ?? STEP_ALTS[2] },
      3: { url: steps[3], alt: look.alts?.step3 ?? STEP_ALTS[3] },
      4: { url: steps[4], alt: look.alts?.step4 ?? STEP_ALTS[4] },
      5: { url: steps[5], alt: look.alts?.step5 ?? STEP_ALTS[5] },
    },
    preset: { code: 'business', label: look.presetLabel, primary: look.palette.primary, secondary: look.palette.secondary },
  };
};

export const turnosProOnboardingConfig: OnboardingConfig = {
  productKey: 'turnospro',
  productName: 'TurnosPro',
  // Landing logo lives at marketing-next/public/logo.png. The frontend does not
  // ship the editorial wordmark yet, so we fall back to a local /logo.png the
  // index.html already references (see public/index.html).
  logoUrl: '/logo.png',
  backgroundUrl: UNSPLASH('1522337660859-02fbefca4702', 1920, 1080),
  stepImages: {
    1: {
      url: UNSPLASH('1560066984-138dadb4c035'),
      alt: 'Salón de belleza editorial en blanco y negro',
    },
    2: {
      url: UNSPLASH('1600948836101-f9ffda59d250'),
      alt: 'Barbería con detalle artesanal',
    },
    3: {
      url: UNSPLASH('1522337360788-8b13dee7a37e'),
      alt: 'Esencia del oficio, paleta y herramientas',
    },
    4: {
      url: UNSPLASH('1560750588-73207b1ef5b8'),
      alt: 'Cliente acomodándose antes del turno',
    },
    5: {
      url: UNSPLASH('1487412947147-5cebf100ffc2'),
      alt: 'Espacio listo, luz natural',
    },
  },
  // Paso 2 (calificación: "¿cómo gestionás los turnos hoy?"): en lugar de la
  // foto, mostramos al agente IA confirmando un turno por WhatsApp — el
  // momento justo para vender el diferencial.
  stepPanels: {
    2: <AiChatStoryPanel />,
  },
  palette,
  typography: {
    // Matches the landing's next/font loaders. These CSS var names are defined
    // at the <html> level by the wizard page (see CompletarPerfil.tsx).
    display: '"Fraunces", Georgia, "Times New Roman", serif',
    body: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  copy: {
    businessWord: 'estudio',
    step1Kicker: 'STEP 01 · 05',
    step1Title: 'Lo primero, saludarnos',
    step1Subtitle: '¿Cómo te llamás?',
    step2Kicker: 'STEP 02 · 05',
    step2Title: 'Contanos de tu estudio',
    step2Subtitle: 'Así te armamos la agenda con la terminología que corresponde.',
    step3Kicker: 'STEP 03 · 05',
    step3Title: 'Personalizá tu marca',
    step3Subtitle: 'Así te verán tus clientes cuando reserven. Se puede cambiar cuando quieras.',
    step4Kicker: 'STEP 04 · 05',
    step4Title: 'Queremos tener un detalle',
    step4Subtitle: 'Te hacemos un regalo en tu cumple — y si querés, un poco de prensa en redes.',
    step5Kicker: 'STEP 05 · 05',
    step5TitleTemplate: 'Listo, {name}',
    step5Subtitle: 'Tu TurnosPro está armado. Entrá y cargá tus primeros turnos.',
    step5Cta: 'Ir al panel',
  },
  qualification: {
    // TurnosPro no necesita toggle "profesional / centro" — el propio tipo de
    // negocio ya distingue (barbería vs salón vs spa, etc.).
    activity: {
      key: 'activity',
      label: '¿Qué tipo de negocio tenés?',
      options: [
        { value: 'barberia', label: 'Barbería' },
        { value: 'salon_belleza', label: 'Salón de belleza' },
        { value: 'estetica', label: 'Estética' },
        { value: 'spa', label: 'Spa' },
        { value: 'manicuria', label: 'Manicuría' },
        { value: 'peluqueria_canina', label: 'Peluquería canina' },
        { value: 'otro', label: 'Otro' },
      ],
    },
    volume: {
      key: 'volume',
      label: '¿Cuántos turnos manejás por mes?',
      options: [
        { value: 'lt_50', label: 'Menos de 50' },
        { value: '50_150', label: '50 a 150' },
        { value: '150_400', label: '150 a 400' },
        { value: 'gt_400', label: 'Más de 400' },
        { value: 'none', label: 'Aún no tomo turnos' },
      ],
    },
    workMode: {
      key: 'workMode',
      label: '¿Cómo gestionás los turnos hoy?',
      options: [
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'cuaderno', label: 'Cuaderno' },
        { value: 'excel', label: 'Excel' },
        { value: 'google_calendar', label: 'Google Calendar' },
        { value: 'otra_app', label: 'Otra app' },
      ],
    },
  },
  themePresets,
  lookForActivity,
};

/**
 * El mismo onboarding en tú y con "cita" para negocios de México y España. Argentina y Uruguay usan el
 * config de arriba tal cual.
 */
export const onboardingConfigForCountry = (country?: string | null): OnboardingConfig => {
  const w = getWording(country);
  if (!w.usesTu) return turnosProOnboardingConfig;
  const base = turnosProOnboardingConfig;
  const q = base.qualification;
  return {
    ...base,
    copy: {
      ...base.copy,
      step1Subtitle: '¿Cómo te llamas?',
      step2Title: 'Cuéntanos de tu estudio',
      step3Title: 'Personaliza tu marca',
      step4Subtitle: 'Te hacemos un regalo en tu cumpleaños — y si quieres, un poco de difusión en redes.',
      step5Subtitle: 'Tu TurnosPro está listo. Entra y carga tus primeras citas.',
    },
    qualification: {
      ...q,
      activity: q.activity && { ...q.activity, label: '¿Qué tipo de negocio tienes?' },
      volume: q.volume && {
        ...q.volume,
        label: '¿Cuántas citas manejas al mes?',
        options: q.volume.options.map((o) => (o.value === 'none' ? { ...o, label: 'Aún no doy citas' } : o)),
      },
      workMode: q.workMode && { ...q.workMode, label: '¿Cómo gestionas las citas hoy?' },
    },
  } as OnboardingConfig;
};

export default turnosProOnboardingConfig;
