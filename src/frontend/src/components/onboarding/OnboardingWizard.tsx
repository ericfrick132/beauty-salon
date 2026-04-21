/**
 * OnboardingWizard — TurnosPro adaptation of the unified pattern.
 *
 * Source of truth for structure/motion: onboarding-spec/OnboardingWizard.tsx +
 * DESIGN_SPEC.md. Typography / palette / copy / qualification come from
 * src/config/onboardingConfig.ts, which mirrors the landing's "Editorial
 * Agenda" theme (cream paper + Fraunces serif + JetBrains Mono kickers).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

/* ==================================================================== */
/*  Types                                                                */
/* ==================================================================== */

export type ProductKey =
  | 'turnospro'
  | 'gymhero'
  | 'bunker'
  | 'unistock'
  | 'playcrew'
  | 'obracloud';

export interface Palette {
  paper: string;
  paperRule: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  primary: string;
  primaryInk: string;
  secondary: string;
  overlay: string; // rgba over the blurred bg image
}

export interface WizardTypography {
  display: string;
  body: string;
  mono: string;
}

export interface QualificationOption {
  value: string;
  label: string;
}

export interface QualificationQuestion {
  key: string;
  label: string;
  placeholder?: string;
  options: QualificationOption[];
}

export interface OnboardingCopy {
  businessWord: string;
  step1Kicker: string;
  step1Title: string;
  step1Subtitle: string;
  step2Kicker: string;
  step2Title: string;
  step2Subtitle: string;
  step3Kicker: string;
  step3Title: string;
  step3Subtitle: string;
  step4Kicker: string;
  step4Title: string;
  step4Subtitle: string;
  step5Kicker: string;
  step5TitleTemplate: string;
  step5Subtitle: string;
  step5Cta: string;
}

export interface ThemePreset {
  code: 'vibrant' | 'inspiring' | 'light' | 'dark' | 'custom';
  label: string;
  primary: string;
  secondary: string;
  darkMode?: boolean;
}

export interface OnboardingConfig {
  productKey: ProductKey;
  productName: string;
  logoUrl: string;
  backgroundUrl: string;
  stepImages: Record<1 | 2 | 3 | 4 | 5, { url: string; alt: string }>;
  palette: Palette;
  typography: WizardTypography;
  copy: OnboardingCopy;
  qualification: {
    whoAreYou?: QualificationQuestion;
    activity: QualificationQuestion;
    volume: QualificationQuestion;
    workMode: QualificationQuestion;
  };
  themePresets: ThemePreset[];
  prefill?: {
    name?: string;
    avatarUrl?: string;
    email?: string;
  };
}

export interface OnboardingPayload {
  ownerName: string;
  whoAreYou?: string;
  activity: string;
  volume: string;
  workMode: string;
  themeCode: ThemePreset['code'];
  primaryColor: string;
  secondaryColor: string;
  logoFile?: File | null;
  ownerBirthday: string;
  ownerPhone: string;
  ownerInstagram?: string;
  ownerWeb?: string;
}

export interface OnboardingWizardProps {
  config: OnboardingConfig;
  onComplete: (payload: OnboardingPayload) => Promise<void> | void;
  onLogoUpload?: (file: File) => Promise<string>;
}

/* ==================================================================== */
/*  Motion                                                                */
/* ==================================================================== */

const SLIDE_DURATION = 0.28;
const SLIDE_EASE: [number, number, number, number] = [0.22, 0.8, 0.3, 1];

const slideVariants = {
  enter: (dir: 1 | -1) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: dir * -40, opacity: 0 }),
};

const staggerChild = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.4,
      ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number],
    },
  }),
};

/* ==================================================================== */
/*  Hooks                                                                */
/* ==================================================================== */

function useViewport() {
  const [w, setW] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return {
    width: w,
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    isDesktop: w >= 1024,
  };
}

/* ==================================================================== */
/*  Primitives                                                            */
/* ==================================================================== */

const Kicker: React.FC<{
  palette: Palette;
  typography: WizardTypography;
  children: React.ReactNode;
}> = ({ palette, typography, children }) => (
  <Typography
    component="p"
    sx={{
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: palette.inkFaint,
      m: 0,
    }}
  >
    {children}
  </Typography>
);

const StepTitle: React.FC<{
  palette: Palette;
  typography: WizardTypography;
  children: React.ReactNode;
}> = ({ palette, typography, children }) => (
  <Typography
    component="h2"
    sx={{
      fontFamily: typography.display,
      fontWeight: 500,
      fontVariationSettings: '"opsz" 144, "SOFT" 30',
      fontSize: 'clamp(32px, 4vw, 56px)',
      lineHeight: 1.02,
      letterSpacing: '-0.025em',
      color: palette.ink,
      m: 0,
    }}
  >
    {children}
  </Typography>
);

const StepSubtitle: React.FC<{
  palette: Palette;
  typography: WizardTypography;
  children: React.ReactNode;
}> = ({ palette, typography, children }) => (
  <Typography
    component="p"
    sx={{
      fontFamily: typography.display,
      fontStyle: 'italic',
      fontSize: 'clamp(15px, 1.2vw, 18px)',
      lineHeight: 1.55,
      color: palette.inkSoft,
      m: 0,
    }}
  >
    {children}
  </Typography>
);

const FieldLabel: React.FC<{
  palette: Palette;
  typography: WizardTypography;
  children: React.ReactNode;
}> = ({ palette, typography, children }) => (
  <Typography
    component="label"
    sx={{
      display: 'block',
      fontFamily: typography.mono,
      fontSize: 10.5,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: palette.inkFaint,
      mb: 0.8,
    }}
  >
    {children}
  </Typography>
);

interface InkInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'color'> {
  palette: Palette;
  typography: WizardTypography;
}

const InkInput: React.FC<InkInputProps> = ({ palette, typography, ...rest }) => (
  <Box
    component="input"
    {...rest}
    sx={{
      width: '100%',
      fontFamily: typography.body,
      fontSize: 15.5,
      color: palette.ink,
      background: 'transparent',
      border: 'none',
      borderBottom: `1px solid ${palette.paperRule}`,
      px: 0,
      py: 1.2,
      outline: 'none',
      transition: 'border-color 180ms ease',
      '&::placeholder': { color: palette.inkFaint, opacity: 0.7 },
      '&:focus': { borderBottomColor: palette.primary },
    }}
  />
);

const InkSelect: React.FC<{
  palette: Palette;
  typography: WizardTypography;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: QualificationOption[];
}> = ({ palette, typography, value, onChange, placeholder, options }) => (
  <Select
    displayEmpty
    value={value}
    onChange={(e) => onChange(e.target.value as string)}
    variant="standard"
    disableUnderline
    sx={{
      width: '100%',
      fontFamily: typography.body,
      fontSize: 15.5,
      color: value ? palette.ink : palette.inkFaint,
      borderBottom: `1px solid ${palette.paperRule}`,
      '& .MuiSelect-select': { py: 1.2, px: 0 },
      '&:hover': { borderBottomColor: palette.ink },
      '&.Mui-focused': { borderBottomColor: palette.primary },
    }}
    MenuProps={{
      PaperProps: {
        sx: {
          mt: 1,
          borderRadius: 0,
          border: `1px solid ${palette.paperRule}`,
          boxShadow: `0 20px 40px rgba(0,0,0,0.10)`,
          background: palette.paper,
        },
      },
    }}
    renderValue={(v) => (
      <span
        style={{
          color: v ? palette.ink : palette.inkFaint,
          fontFamily: typography.body,
        }}
      >
        {options.find((o) => o.value === v)?.label ??
          placeholder ??
          'Elegí una opción'}
      </span>
    )}
  >
    {options.map((o) => (
      <MenuItem
        key={o.value}
        value={o.value}
        sx={{
          fontFamily: typography.body,
          fontSize: 15,
          py: 1.1,
          '&.Mui-selected': { background: `${palette.primary}14` },
        }}
      >
        {o.label}
      </MenuItem>
    ))}
  </Select>
);

const InkButton: React.FC<{
  palette: Palette;
  typography: WizardTypography;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({
  palette,
  typography,
  children,
  variant = 'primary',
  onClick,
  disabled,
  type = 'button',
}) => {
  const primary = variant === 'primary';
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      type={type}
      disableRipple
      disableElevation
      sx={{
        fontFamily: typography.mono,
        fontSize: 12,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 500,
        px: primary ? 3.5 : 1,
        py: 1.4,
        borderRadius: 0,
        minHeight: 44,
        color: primary ? palette.primaryInk : palette.ink,
        background: primary ? palette.primary : 'transparent',
        border: primary ? `1px solid ${palette.primary}` : 'none',
        boxShadow: 'none',
        transition: 'background-color 180ms ease, transform 120ms ease',
        '&:hover': {
          background: primary ? palette.ink : `${palette.ink}0a`,
          borderColor: primary ? palette.ink : undefined,
          boxShadow: 'none',
          transform: 'none',
        },
        '&:active': { transform: 'scale(0.98)' },
        '&.Mui-disabled': {
          opacity: 0.35,
          color: primary ? palette.primaryInk : palette.ink,
        },
      }}
    >
      {children}
    </Button>
  );
};

/* ==================================================================== */
/*  Progress bar                                                          */
/* ==================================================================== */

const ProgressBar: React.FC<{
  step: number;
  total: number;
  palette: Palette;
}> = ({ step, total, palette }) => (
  <Box
    role="progressbar"
    aria-valuenow={step}
    aria-valuemin={0}
    aria-valuemax={total}
    sx={{
      position: 'relative',
      width: '100%',
      height: 3,
      background: palette.paperRule,
      overflow: 'hidden',
    }}
  >
    <motion.div
      animate={{ scaleX: step / total }}
      initial={{ scaleX: 0 }}
      transition={{ duration: 0.45, ease: SLIDE_EASE }}
      style={{
        width: '100%',
        height: '100%',
        background: palette.primary,
        transformOrigin: 'left center',
      }}
    />
  </Box>
);

/* ==================================================================== */
/*  Story image panel (desktop only)                                      */
/* ==================================================================== */

const StoryPanel: React.FC<{
  stepIndex: number;
  config: OnboardingConfig;
}> = ({ stepIndex, config }) => {
  const img = config.stepImages[(stepIndex + 1) as 1 | 2 | 3 | 4 | 5];
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        background: config.palette.paper,
        overflow: 'hidden',
        display: { xs: 'none', md: 'block' },
      }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={stepIndex}
          src={img.url}
          alt={img.alt}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(40%) contrast(1.03)',
          }}
        />
      </AnimatePresence>
      {/* Paper grain overlay for warmth — matches landing's body grain. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'multiply',
          opacity: 0.35,
          background: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            '<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'220\' height=\'220\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0 0.04  0 0 0 0.10 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>'
          )}")`,
        }}
      />
    </Box>
  );
};

/* ==================================================================== */
/*  Step bodies                                                           */
/* ==================================================================== */

interface StepProps {
  config: OnboardingConfig;
  formData: OnboardingPayload;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingPayload>>;
  goNext: () => void;
  goBack: () => void;
  stepIndex: number;
}

const StepShell: React.FC<{
  palette: Palette;
  typography: WizardTypography;
  kicker: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  canNext?: boolean;
  backVisible?: boolean;
  hideNav?: boolean;
}> = ({
  palette,
  typography,
  kicker,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  canNext,
  backVisible = true,
  hideNav = false,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 3.5 }}>
    <Box>
      <motion.div custom={0} variants={staggerChild} initial="hidden" animate="show">
        <Kicker palette={palette} typography={typography}>
          {kicker}
        </Kicker>
      </motion.div>
      <Box sx={{ mt: 1.2 }}>
        <motion.div custom={1} variants={staggerChild} initial="hidden" animate="show">
          <StepTitle palette={palette} typography={typography}>
            {title}
          </StepTitle>
        </motion.div>
      </Box>
      <Box sx={{ mt: 1.2, maxWidth: 440 }}>
        <motion.div custom={2} variants={staggerChild} initial="hidden" animate="show">
          <StepSubtitle palette={palette} typography={typography}>
            {subtitle}
          </StepSubtitle>
        </motion.div>
      </Box>
    </Box>

    <motion.div
      custom={3}
      variants={staggerChild}
      initial="hidden"
      animate="show"
      style={{ flex: 1 }}
    >
      {children}
    </motion.div>

    {!hideNav && (
      <motion.div custom={4} variants={staggerChild} initial="hidden" animate="show">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {backVisible && onBack ? (
            <InkButton
              palette={palette}
              typography={typography}
              onClick={onBack}
              variant="ghost"
            >
              ← Atrás
            </InkButton>
          ) : (
            <Box />
          )}
          {onNext && (
            <InkButton
              palette={palette}
              typography={typography}
              onClick={onNext}
              disabled={!canNext}
            >
              Siguiente »
            </InkButton>
          )}
        </Stack>
      </motion.div>
    )}
  </Box>
);

const StepName: React.FC<StepProps> = ({ config, formData, setFormData, goNext }) => {
  const { palette, typography, copy } = config;
  const canNext = !!formData.ownerName.trim();
  return (
    <StepShell
      palette={palette}
      typography={typography}
      kicker={copy.step1Kicker}
      title={copy.step1Title}
      subtitle={copy.step1Subtitle}
      backVisible={false}
      canNext={canNext}
      onNext={goNext}
    >
      <Box>
        <FieldLabel palette={palette} typography={typography}>
          Tu nombre
        </FieldLabel>
        <InkInput
          palette={palette}
          typography={typography}
          autoFocus
          value={formData.ownerName}
          onChange={(e) =>
            setFormData({ ...formData, ownerName: e.target.value })
          }
          placeholder="Camila"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canNext) goNext();
          }}
        />
      </Box>
    </StepShell>
  );
};

const StepQualification: React.FC<StepProps> = ({
  config,
  formData,
  setFormData,
  goNext,
  goBack,
}) => {
  const { palette, typography, copy, qualification } = config;
  const whoReady = !qualification.whoAreYou || !!formData.whoAreYou;
  const canNext =
    whoReady && !!formData.activity && !!formData.volume && !!formData.workMode;

  return (
    <StepShell
      palette={palette}
      typography={typography}
      kicker={copy.step2Kicker}
      title={copy.step2Title}
      subtitle={copy.step2Subtitle}
      canNext={canNext}
      onNext={goNext}
      onBack={goBack}
    >
      <Stack spacing={3}>
        {qualification.whoAreYou && (
          <Box>
            <FieldLabel palette={palette} typography={typography}>
              {qualification.whoAreYou.label}
            </FieldLabel>
            <Stack direction="row" spacing={0}>
              {qualification.whoAreYou.options.map((o, i) => {
                const active = formData.whoAreYou === o.value;
                return (
                  <Box
                    key={o.value}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setFormData({ ...formData, whoAreYou: o.value })
                    }
                    sx={{
                      flex: 1,
                      py: 1.4,
                      textAlign: 'center',
                      fontFamily: typography.mono,
                      fontSize: 11.5,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: active ? palette.primaryInk : palette.ink,
                      background: active ? palette.primary : 'transparent',
                      border: `1px solid ${
                        active ? palette.primary : palette.paperRule
                      }`,
                      cursor: 'pointer',
                      transition: 'all 180ms ease',
                      marginLeft: i === 0 ? 0 : '-1px',
                    }}
                  >
                    {o.label}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {[qualification.activity, qualification.volume, qualification.workMode].map(
          (q) => (
            <Box key={q.key}>
              <FieldLabel palette={palette} typography={typography}>
                {q.label}
              </FieldLabel>
              <InkSelect
                palette={palette}
                typography={typography}
                value={(formData as unknown as Record<string, string>)[q.key] ?? ''}
                onChange={(v) =>
                  setFormData(
                    (prev) =>
                      ({ ...prev, [q.key]: v } as unknown as OnboardingPayload)
                  )
                }
                options={q.options}
                placeholder={q.placeholder}
              />
            </Box>
          )
        )}
      </Stack>
    </StepShell>
  );
};

const StepBrand: React.FC<StepProps> = ({
  config,
  formData,
  setFormData,
  goNext,
  goBack,
}) => {
  const { palette, typography, copy, themePresets } = config;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    config.prefill?.avatarUrl ?? null
  );

  const onFile = (f: File | null) => {
    if (!f) return;
    setFormData({ ...formData, logoFile: f });
    const r = new FileReader();
    r.onload = () => setLogoPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const selectedPreset =
    themePresets.find((p) => p.code === formData.themeCode) ?? themePresets[0];

  return (
    <StepShell
      palette={palette}
      typography={typography}
      kicker={copy.step3Kicker}
      title={copy.step3Title}
      subtitle={copy.step3Subtitle}
      canNext
      onNext={goNext}
      onBack={goBack}
    >
      <Stack spacing={3.5}>
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Box
            onClick={() => fileRef.current?.click()}
            sx={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: `1px solid ${palette.paperRule}`,
              background: logoPreview
                ? `url(${logoPreview}) center/cover`
                : palette.paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'border-color 180ms ease',
              '&:hover': { borderColor: palette.ink },
            }}
          >
            {!logoPreview && (
              <Typography
                sx={{
                  fontFamily: typography.display,
                  fontSize: 40,
                  fontWeight: 400,
                  color: palette.inkFaint,
                }}
              >
                {(formData.ownerName || '·').trim().charAt(0).toUpperCase()}
              </Typography>
            )}
          </Box>
          <Box>
            <Box
              onClick={() => fileRef.current?.click()}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                fontFamily: typography.mono,
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: palette.ink,
                cursor: 'pointer',
                borderBottom: `1px solid ${palette.ink}`,
                pb: 0.4,
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 14 }} />
              Subir tu foto
            </Box>
            <Typography
              sx={{
                mt: 0.8,
                fontFamily: typography.body,
                fontSize: 12.5,
                color: palette.inkFaint,
              }}
            >
              Se puede cambiar después
            </Typography>
          </Box>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </Stack>

        <Box>
          <FieldLabel palette={palette} typography={typography}>
            Los colores de tu app
          </FieldLabel>
          <InkSelect
            palette={palette}
            typography={typography}
            value={formData.themeCode}
            onChange={(v) => {
              const preset = themePresets.find((p) => p.code === v);
              if (preset) {
                setFormData({
                  ...formData,
                  themeCode: preset.code,
                  primaryColor: preset.primary,
                  secondaryColor: preset.secondary,
                });
              }
            }}
            options={themePresets.map((p) => ({ value: p.code, label: p.label }))}
          />
        </Box>

        <Stack direction="row" spacing={2}>
          {[
            {
              label: 'Principal',
              color: formData.primaryColor || selectedPreset.primary,
            },
            {
              label: 'Secundario',
              color: formData.secondaryColor || selectedPreset.secondary,
            },
          ].map((s) => (
            <Box key={s.label} sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontFamily: typography.mono,
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: palette.inkFaint,
                  mb: 0.8,
                  textAlign: 'center',
                }}
              >
                {s.label}
              </Typography>
              <Box
                sx={{
                  height: 40,
                  background: s.color,
                  border: `1px solid ${palette.paperRule}`,
                }}
              />
            </Box>
          ))}
        </Stack>
      </Stack>
    </StepShell>
  );
};

const StepPersonal: React.FC<StepProps> = ({
  config,
  formData,
  setFormData,
  goNext,
  goBack,
}) => {
  const { palette, typography, copy } = config;
  const canNext = !!formData.ownerBirthday && !!formData.ownerPhone;
  return (
    <StepShell
      palette={palette}
      typography={typography}
      kicker={copy.step4Kicker}
      title={copy.step4Title}
      subtitle={copy.step4Subtitle}
      canNext={canNext}
      onNext={goNext}
      onBack={goBack}
    >
      <Stack spacing={3}>
        <Box>
          <FieldLabel palette={palette} typography={typography}>
            Tu cumpleaños
          </FieldLabel>
          <InkInput
            palette={palette}
            typography={typography}
            type="date"
            value={formData.ownerBirthday}
            onChange={(e) =>
              setFormData({ ...formData, ownerBirthday: e.target.value })
            }
          />
        </Box>
        <Box>
          <FieldLabel palette={palette} typography={typography}>
            Teléfono
          </FieldLabel>
          <InkInput
            palette={palette}
            typography={typography}
            type="tel"
            value={formData.ownerPhone}
            onChange={(e) =>
              setFormData({ ...formData, ownerPhone: e.target.value })
            }
            placeholder="+54 11 XXXX-XXXX"
          />
        </Box>

        <Box
          sx={{
            borderTop: `1px dashed ${palette.paperRule}`,
            pt: 2.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: typography.display,
              fontStyle: 'italic',
              fontSize: 14,
              color: palette.inkSoft,
              mb: 2,
            }}
          >
            Y si querés, te hacemos un poco publi ;)
          </Typography>
          <Stack spacing={3}>
            <Box>
              <FieldLabel palette={palette} typography={typography}>
                Instagram
              </FieldLabel>
              <InkInput
                palette={palette}
                typography={typography}
                value={formData.ownerInstagram ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ownerInstagram: e.target.value,
                  })
                }
                placeholder="@tuusuario"
              />
            </Box>
            <Box>
              <FieldLabel palette={palette} typography={typography}>
                Tu web
              </FieldLabel>
              <InkInput
                palette={palette}
                typography={typography}
                value={formData.ownerWeb ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, ownerWeb: e.target.value })
                }
                placeholder="www.tuweb.com"
              />
            </Box>
          </Stack>
        </Box>
      </Stack>
    </StepShell>
  );
};

const StepWelcome: React.FC<
  StepProps & { submitting: boolean; onSubmit: () => void }
> = ({ config, formData, submitting, onSubmit }) => {
  const { palette, typography, copy } = config;
  const firstName = formData.ownerName.trim().split(' ')[0] || '';
  const title = copy.step5TitleTemplate.replace('{name}', firstName);
  return (
    <StepShell
      palette={palette}
      typography={typography}
      kicker={copy.step5Kicker}
      title={title}
      subtitle={copy.step5Subtitle}
      hideNav
    >
      <Stack spacing={4} alignItems="flex-start">
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: palette.primary,
            color: palette.primaryInk,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <CheckIcon sx={{ fontSize: 36 }} />
        </Box>
        <InkButton
          palette={palette}
          typography={typography}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? 'Armando tu espacio…' : copy.step5Cta}
        </InkButton>
      </Stack>
    </StepShell>
  );
};

/* ==================================================================== */
/*  Main component                                                        */
/* ==================================================================== */

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  config,
  onComplete,
  onLogoUpload,
}) => {
  const { palette, typography, themePresets } = config;
  const reducedMotion = useReducedMotion();
  const { isMobile } = useViewport();

  const initialTheme = themePresets[0];

  const [formData, setFormData] = useState<OnboardingPayload>({
    ownerName: config.prefill?.name ?? '',
    activity: '',
    volume: '',
    workMode: '',
    themeCode: initialTheme.code,
    primaryColor: initialTheme.primary,
    secondaryColor: initialTheme.secondary,
    logoFile: null,
    ownerBirthday: '',
    ownerPhone: '',
    ownerInstagram: '',
    ownerWeb: '',
  });

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const TOTAL_STEPS = 5;

  const goNext = useCallback(() => {
    setDirection(1);
    setStepIndex((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);
  const goBack = useCallback(() => {
    setDirection(-1);
    setStepIndex((s) => Math.max(s - 1, 0));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (onLogoUpload && formData.logoFile) {
        await onLogoUpload(formData.logoFile);
      }
      await onComplete(formData);
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ?? 'Algo falló, intentá de nuevo.';
      setError(msg);
      setSubmitting(false);
    }
  }, [formData, onComplete, onLogoUpload]);

  const stepProps: StepProps = {
    config,
    formData,
    setFormData,
    goNext,
    goBack,
    stepIndex,
  };

  const steps: React.ReactNode[] = [
    <StepName key="name" {...stepProps} />,
    <StepQualification key="qualification" {...stepProps} />,
    <StepBrand key="brand" {...stepProps} />,
    <StepPersonal key="personal" {...stepProps} />,
    <StepWelcome
      key="welcome"
      {...stepProps}
      submitting={submitting}
      onSubmit={submit}
    />,
  ];

  /* ---- Mobile render ---- */
  if (isMobile) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: palette.paper,
          color: palette.ink,
          fontFamily: typography.body,
          px: 2.5,
          py: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          <Box
            component="img"
            src={config.logoUrl}
            alt={config.productName}
            sx={{ height: 28, filter: 'none' }}
          />
        </Stack>
        <ProgressBar
          step={stepIndex + 1}
          total={TOTAL_STEPS}
          palette={palette}
        />
        <Box sx={{ mt: 4, flex: 1 }}>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={stepIndex}
              custom={direction}
              variants={
                reducedMotion
                  ? {
                      enter: {},
                      center: { opacity: 1 },
                      exit: { opacity: 0 },
                    }
                  : slideVariants
              }
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: SLIDE_DURATION, ease: SLIDE_EASE }}
              style={{ height: '100%' }}
            >
              {steps[stepIndex]}
            </motion.div>
          </AnimatePresence>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 0 }}>
            {error}
          </Alert>
        )}
      </Box>
    );
  }

  /* ---- Desktop / tablet render ---- */
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: palette.ink,
        display: 'grid',
        placeItems: 'center',
        p: { md: 4, lg: 6 },
      }}
    >
      {/* Blurred background */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `url(${config.backgroundUrl}) center/cover no-repeat`,
          filter: 'blur(18px) saturate(85%)',
          transform: 'scale(1.1)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: palette.overlay,
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        style={{ position: 'absolute', top: 32, left: 40, zIndex: 2 }}
      >
        <Box
          component="img"
          src={config.logoUrl}
          alt={config.productName}
          sx={{
            height: { md: 36, lg: 44 },
            filter: 'brightness(0) invert(1)',
          }}
        />
      </motion.div>

      {/* Card modal */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1], delay: 0.15 }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(960px, 92vw)',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '1fr 1fr' },
            minHeight: 580,
            background: palette.paper,
            boxShadow: '0 40px 120px rgba(0,0,0,0.28)',
          }}
        >
          <StoryPanel stepIndex={stepIndex} config={config} />

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              p: { md: 4.5, lg: 6 },
              background: palette.paper,
              position: 'relative',
            }}
          >
            <Box sx={{ mb: 3 }}>
              <ProgressBar
                step={stepIndex + 1}
                total={TOTAL_STEPS}
                palette={palette}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={stepIndex}
                  custom={direction}
                  variants={
                    reducedMotion
                      ? {
                          enter: {},
                          center: { opacity: 1 },
                          exit: { opacity: 0 },
                        }
                      : slideVariants
                  }
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: SLIDE_DURATION, ease: SLIDE_EASE }}
                  style={{ height: '100%' }}
                >
                  {steps[stepIndex]}
                </motion.div>
              </AnimatePresence>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 0 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default OnboardingWizard;
