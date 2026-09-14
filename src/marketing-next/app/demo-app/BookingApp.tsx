'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { AccessTime, ArrowBack, ArrowForward, Check, Search, TrendingUp } from '@mui/icons-material';
import { adminTheme, mono, ui } from '../demo-admin/adminTheme';
import {
  BUSINESS,
  DAYS,
  DAYS_SHORT,
  MONTHS,
  PROS,
  SERVICES,
  addDays,
  addMinutes,
  atTime,
  buildBookings,
  buildCustomers,
  fmtShort,
  fmtTime,
  money,
  sameDay,
  serviceById,
  type Service,
} from '../demo-admin/data';

// Réplica de la página pública de reservas (src/frontend/src/pages/public/BookingPage.tsx) dentro de un celular.

const BASE_STEPS = ['Servicio', 'Profesional', 'Fecha y Hora', 'Tus Datos'];

type Chat = { from: 'business' | 'client'; text: string };

export default function BookingApp({ today }: { today: Date }) {
  const taken = useMemo(() => buildBookings(buildCustomers(today), today), [today]);
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [service, setService] = useState<Service | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 12 }, (_, i) => addDays(today, i)).filter((d) => d.getDay() !== 0).slice(0, 9), [today]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<Date | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<string | null>(null);
  const [paying, setPaying] = useState<'idle' | 'redirect'>('idle');
  const [code, setCode] = useState('');
  const [notif, setNotif] = useState(false);
  const [chat, setChat] = useState<Chat[] | null>(null);

  const steps = service?.deposit ? [...BASE_STEPS, 'Pago', 'Confirmación'] : [...BASE_STEPS, 'Confirmación'];
  const lastStep = steps.length - 1;
  const day = days[dayIdx];
  const pro = PROS.find((p) => p.id === proId);

  const slots = useMemo(() => {
    if (!service || !proId) return [];
    const busy = taken.filter((b) => b.proId === proId && sameDay(b.start, day) && b.status !== 'cancelled');
    const close = day.getDay() === 6 ? 15 : 20;
    const out: Date[] = [];
    for (let t = atTime(day, 9); addMinutes(t, service.duration).getHours() + addMinutes(t, service.duration).getMinutes() / 60 <= close; t = addMinutes(t, 30)) {
      const end = addMinutes(t, service.duration);
      if (t.getTime() < Date.now() + 30 * 60_000) continue;
      if (!busy.some((b) => t < addMinutes(b.start, serviceById(b.serviceId).duration) && end > b.start)) out.push(t);
    }
    return out;
  }, [taken, service, proId, day]);

  useEffect(() => { setSlot(null); }, [dayIdx, proId, service]);

  // Después de confirmar llega el recordatorio del bot, como en la vida real (acá en segundos).
  useEffect(() => {
    if (step !== lastStep || !code) return;
    const t = window.setTimeout(() => setNotif(true), 2600);
    return () => window.clearTimeout(t);
  }, [step, lastStep, code]);

  const firstName = name.trim().split(' ')[0] || 'Camila';
  const confirmBooking = () => {
    setCode(`TP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
    setStep(lastStep);
  };

  const next = () => {
    setErrors(null);
    if (step === 2 && !slot) return setErrors('Por favor selecciona un horario');
    if (step === 3) {
      if (!name.trim()) return setErrors('Por favor ingresa tu nombre');
      if (!phone.trim()) return setErrors('Por favor ingresa tu teléfono');
      if (!/\S+@\S+\.\S+/.test(email)) return setErrors(email.trim() ? 'Email inválido' : 'Por favor ingresa tu email');
      if (!service?.deposit) return confirmBooking();
    }
    setStep((s) => s + 1);
  };

  const reset = () => {
    setStep(0); setService(null); setProId(null); setSlot(null); setDayIdx(0); setCode(''); setNotif(false); setChat(null); setErrors(null);
  };

  const filtered = SERVICES.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()));

  const summary: Array<[string, string]> = service && pro && slot ? [
    ['Servicio:', service.name],
    ['Profesional:', pro.name],
    ['Fecha y hora:', `${DAYS[slot.getDay()]} ${slot.getDate()} de ${MONTHS[slot.getMonth()]} · ${fmtTime(slot)}`],
    ['Duración:', `${service.duration} min`],
    ['Precio:', money(service.price)],
  ] : [];

  return (
    <ThemeProvider theme={adminTheme}>
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: ui.paper, color: ui.ink, fontFamily: adminTheme.typography.fontFamily }}>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.75, pt: 6.5, pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Typography component="h1" sx={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 500, color: ui.ink, fontSize: '2.1rem', lineHeight: 0.98, letterSpacing: '-0.035em', textAlign: 'center', mb: 2 }}>
            {BUSINESS}
          </Typography>

          <Box sx={{ p: 1, mb: 1.5, border: `1px solid ${ui.rule}`, borderRadius: 2 }}>
            <Stepper
              activeStep={step}
              alternativeLabel
              sx={{
                '& .MuiStepConnector-line': { borderColor: ui.rule },
                '& .MuiStepIcon-root': { color: 'rgba(23,20,16,0.08)', fontSize: 20, '& text': { fill: ui.inkSoft } },
                '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { color: ui.primary },
                '& .MuiStepIcon-root.Mui-active text': { fill: '#fff' },
                '& .MuiStepLabel-label': { fontSize: '0.58rem', mt: '4px !important', color: ui.inkMute, '&.Mui-active': { color: ui.ink, fontWeight: 600 } },
                '& .MuiStepConnector-root': { top: 10 },
              }}
            >
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
          </Box>

          <Box key={step} sx={{ p: 1.75, bgcolor: ui.paperSurface, border: `1px solid ${ui.rule}`, borderRadius: 2, animation: 'tpStep 260ms ease', '@keyframes tpStep': { from: { opacity: 0, transform: 'translateX(10px)' } } }}>
            {step === 0 && (
              <>
                <StepHeading title="Elegí el servicio" />
                <TextField
                  fullWidth size="small" placeholder="Buscar servicio..." value={query} onChange={(e) => setQuery(e.target.value)} sx={{ mb: 1.5 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                />
                <Typography variant="body2" sx={{ color: ui.inkSoft, mb: 1 }}>Servicios más populares</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {filtered.map((s) => (
                    <Box
                      key={s.id}
                      component="button"
                      type="button"
                      onClick={() => { setService(s); window.setTimeout(() => setStep(1), 250); }}
                      sx={{ textAlign: 'left', p: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid', borderColor: service?.id === s.id ? ui.primary : ui.rule, boxShadow: service?.id === s.id ? `inset 0 0 0 1px ${ui.primary}` : 'none', cursor: 'pointer', fontFamily: 'inherit', color: ui.ink, '&:hover': { borderColor: ui.primary } }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{s.name}</Typography>
                        {s.popular && <Chip icon={<TrendingUp sx={{ fontSize: 14 }} />} label="Popular" size="small" variant="outlined" sx={{ borderColor: ui.primary, color: ui.primary, height: 22, '& .MuiChip-icon': { color: ui.primary } }} />}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: ui.inkSoft }}>{s.duration} min - {money(s.price)}</Typography>
                        <Typography variant="caption" sx={{ color: ui.inkMute }}>{s.deposit ? `Seña ${money(s.deposit)}` : s.category}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {step === 1 && (
              <>
                <StepHeading title="¿Con quién?" hint={service ? `${service.name} · ${service.duration} min` : undefined} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {PROS.map((p) => (
                    <Box
                      key={p.id}
                      component="button"
                      type="button"
                      onClick={() => { setProId(p.id); window.setTimeout(() => setStep(2), 250); }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid', borderColor: proId === p.id ? ui.primary : ui.rule, cursor: 'pointer', fontFamily: 'inherit', color: ui.ink, textAlign: 'left', '&:hover': { borderColor: ui.primary } }}
                    >
                      <Avatar sx={{ bgcolor: p.color, width: 42, height: 42 }}>{p.name[0]}</Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{p.name}</Typography>
                        <Typography variant="caption" sx={{ color: ui.inkSoft }}>{p.role}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {step === 2 && (
              <>
                <StepHeading title="Elegí día y horario" hint={pro ? `con ${pro.name.split(' ')[0]}` : undefined} />
                <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 1.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                  {days.map((d, i) => (
                    <Box
                      key={d.toISOString()}
                      component="button"
                      type="button"
                      onClick={() => setDayIdx(i)}
                      sx={{ flexShrink: 0, width: 50, py: 0.75, borderRadius: 2, border: `1px solid ${i === dayIdx ? ui.primary : ui.rule}`, bgcolor: i === dayIdx ? ui.primary : '#fff', color: i === dayIdx ? '#fff' : ui.ink, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Box sx={{ fontSize: 10.5, textTransform: 'uppercase', opacity: 0.8 }}>{sameDay(d, today) ? 'Hoy' : DAYS_SHORT[d.getDay()]}</Box>
                      <Box sx={{ fontWeight: 700, fontSize: 16 }}>{d.getDate()}</Box>
                    </Box>
                  ))}
                </Box>
                <Typography variant="body2" sx={{ color: ui.inkSoft, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}><AccessTime sx={{ fontSize: 16 }} /> Horarios disponibles</Typography>
                {slots.length === 0 ? (
                  <Typography variant="body2" sx={{ color: ui.inkMute, py: 2 }}>No hay horarios disponibles para esta fecha</Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
                    {slots.slice(0, 15).map((t) => {
                      const active = slot?.getTime() === t.getTime();
                      return (
                        <Box key={t.toISOString()} component="button" type="button" onClick={() => setSlot(t)} sx={{ py: 1, borderRadius: 2, border: `1px solid ${active ? ui.primary : ui.rule}`, bgcolor: active ? ui.primary : '#fff', color: active ? '#fff' : ui.ink, fontFamily: mono, fontSize: 14, cursor: 'pointer' }}>
                          {fmtTime(t)}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <StepHeading title="Tus Datos" hint="Te mandamos la confirmación por WhatsApp y email." />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <TextField size="small" label="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} />
                  <TextField size="small" label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} inputProps={{ inputMode: 'tel' }} />
                  <TextField size="small" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} inputProps={{ inputMode: 'email' }} />
                  <TextField size="small" label="Notas adicionales (opcional)" multiline minRows={2} />
                  <Button size="small" onClick={() => { setName('Camila Romero'); setPhone('+54 9 11 5678-1234'); setEmail('camila.romero@gmail.com'); setErrors(null); }} sx={{ alignSelf: 'flex-start', px: 0, '&:hover': { transform: 'none', boxShadow: 'none', background: 'transparent' } }}>
                    Completar con datos de ejemplo
                  </Button>
                </Box>
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${ui.rule}` }}>
                  {summary.map(([k, v]) => (
                    <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.35, fontSize: 13 }}>
                      <Box component="span" sx={{ color: ui.inkMute }}>{k}</Box>
                      <Box component="span" sx={{ fontWeight: 600, textAlign: 'right' }}>{v}</Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {step === 4 && service?.deposit ? (
              <>
                <StepHeading title="Pago de la seña" hint="Generá el pago y completalo para dejar el turno confirmado." />
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography sx={{ color: ui.inkMute, fontSize: 13 }}>Seña: {money(service.deposit)}</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '2.2rem', fontWeight: 500 }}>{money(service.deposit)}</Typography>
                  <Typography variant="caption" sx={{ color: ui.inkSoft, display: 'block', mb: 2 }}>El resto ({money(service.price - service.deposit)}) lo pagás en el local.</Typography>
                  <Button fullWidth variant="contained" size="large" onClick={() => { setPaying('redirect'); window.setTimeout(() => { setPaying('idle'); confirmBooking(); }, 1800); }} sx={{ bgcolor: '#009EE3', '&:hover': { bgcolor: '#0086c3' } }}>
                    Pagar ahora con MercadoPago
                  </Button>
                  <Typography variant="caption" sx={{ color: ui.inkMute, display: 'block', mt: 1 }}>
                    Luego de pagar, volveremos a esta pantalla y confirmaremos tu reserva automáticamente.
                  </Typography>
                </Box>
              </>
            ) : null}

            {step === lastStep && code && (
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: ui.primary, mx: 'auto', mb: 2 }}><Check /></Avatar>
                <Typography sx={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '1.7rem', fontWeight: 500, lineHeight: 1.05 }}>Turno confirmado</Typography>
                <Typography variant="body2" sx={{ color: ui.inkSoft, mt: 1 }}>
                  {service?.name} con {pro?.name.split(' ')[0]} · {slot ? `${DAYS[slot.getDay()]} ${fmtShort(slot)} a las ${fmtTime(slot)}` : ''}
                </Typography>
                <Box sx={{ my: 2, py: 1.5, borderTop: `1px solid ${ui.rule}`, borderBottom: `1px solid ${ui.rule}` }}>
                  <Typography sx={{ fontSize: '0.75rem', color: ui.inkMute, mb: 0.5 }}>Código de confirmación</Typography>
                  <Typography sx={{ fontFamily: mono, fontSize: '1.5rem', fontWeight: 600, letterSpacing: '0.12em', color: ui.primary }}>{code}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.85rem', color: ui.inkSoft }}>Te mandamos los detalles a {email || 'tu email'}</Typography>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={reset}>Reservar otro turno</Button>
              </Box>
            )}

            {errors && <Typography sx={{ color: ui.error, fontSize: 13, mt: 1.5 }}>{errors}</Typography>}
          </Box>

          {step > 0 && step < lastStep && step !== 4 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
              <Button startIcon={<ArrowBack />} onClick={() => { setErrors(null); setStep((s) => s - 1); }} sx={{ color: ui.inkSoft }}>Anterior</Button>
              {step >= 2 && (
                <Button variant="contained" endIcon={<ArrowForward />} onClick={next}>
                  {step === 3 && !service?.deposit ? 'Confirmar Reserva' : 'Siguiente'}
                </Button>
              )}
            </Box>
          )}
          {step === 4 && service?.deposit ? (
            <Button startIcon={<ArrowBack />} onClick={() => setStep(3)} sx={{ color: ui.inkSoft, mt: 1.5 }}>Anterior</Button>
          ) : null}
        </Box>

        {paying === 'redirect' && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 20, bgcolor: 'rgba(244,239,230,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, px: 3, textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#009EE3' }} />
            <Typography sx={{ fontWeight: 600 }}>Generando pago...</Typography>
            <Typography variant="caption" sx={{ color: ui.inkSoft }}>En tu negocio real se abre el checkout de MercadoPago y la seña se acredita sola.</Typography>
          </Box>
        )}

        {notif && !chat && (
          <Box
            component="button"
            type="button"
            onClick={() => {
              setChat([{
                from: 'business',
                text: `¡Hola ${firstName}! 👋 Te escribimos de ${BUSINESS} para confirmar tu turno de ${service?.name.toLowerCase()} el ${slot ? `${DAYS[slot.getDay()]} a las ${fmtTime(slot)}` : ''}.\n\nRespondé SI para confirmar o NO si no podés venir.`,
              }]);
            }}
            sx={{
              position: 'absolute', top: 44, left: 8, right: 8, zIndex: 15, display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.25,
              borderRadius: '16px', border: 0, bgcolor: 'rgba(255,255,255,0.97)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              animation: 'tpNotif 420ms cubic-bezier(.2,.9,.3,1.2)', '@keyframes tpNotif': { from: { transform: 'translateY(-120%)', opacity: 0 } },
            }}
          >
            <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#25d366', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 700 }}>W</Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>{BUSINESS} · WhatsApp</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#333', lineHeight: 1.3 }}>¿Confirmás tu turno? Respondé SI o NO. Tocá para responder</Typography>
            </Box>
          </Box>
        )}

        {chat && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 18, display: 'flex', flexDirection: 'column', bgcolor: '#efeae2', animation: 'tpChat 260ms ease', '@keyframes tpChat': { from: { transform: 'translateY(30px)', opacity: 0 } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pt: 5.5, pb: 1.25, bgcolor: ui.whatsappDeep, color: '#fff' }}>
              <Box component="button" type="button" onClick={() => setChat(null)} sx={{ border: 0, bgcolor: 'transparent', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', p: 0.5 }} aria-label="Volver"><ArrowBack fontSize="small" /></Box>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#fff', color: ui.whatsappDeep, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>EN</Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{BUSINESS}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>cuenta de empresa</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {chat.map((m, i) => (
                <Box key={i} sx={{ alignSelf: m.from === 'client' ? 'flex-end' : 'flex-start', maxWidth: '85%', px: 1.25, py: 0.75, bgcolor: m.from === 'client' ? '#d9fdd3' : '#fff', borderRadius: m.from === 'client' ? '10px 0 10px 10px' : '0 10px 10px 10px', boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)', fontSize: 14, color: '#111b21', whiteSpace: 'pre-line', animation: 'tpPop 240ms ease', '@keyframes tpPop': { from: { opacity: 0, transform: 'translateY(6px)' } } }}>
                  {m.text}
                </Box>
              ))}
            </Box>
            <Box sx={{ p: 1.25, bgcolor: '#f0f2f5', display: 'flex', gap: 1 }}>
              {chat.length === 1 ? (
                <>
                  <Button fullWidth variant="contained" sx={{ bgcolor: '#25d366', '&:hover': { bgcolor: '#1ebe5b' } }} onClick={() => setChat((c) => [...(c ?? []), { from: 'client', text: 'Si' }, { from: 'business', text: `¡Gracias ${firstName}! Tu turno del ${slot ? DAYS[slot.getDay()] : ''} a las ${slot ? fmtTime(slot) : ''} quedó confirmado. Te esperamos 😊` }])}>
                    Responder SI
                  </Button>
                  <Button fullWidth variant="outlined" sx={{ bgcolor: '#fff' }} onClick={() => setChat((c) => [...(c ?? []), { from: 'client', text: 'No voy a poder' }, { from: 'business', text: `Listo ${firstName}, cancelamos tu turno del ${slot ? DAYS[slot.getDay()] : ''} a las ${slot ? fmtTime(slot) : ''}. ¡Te esperamos la próxima! 🙌` }])}>
                    Responder NO
                  </Button>
                </>
              ) : (
                <Button fullWidth variant="outlined" sx={{ bgcolor: '#fff' }} onClick={reset}>Reservar otro turno</Button>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}

function StepHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 500, fontSize: '1.3rem', letterSpacing: '-0.02em', color: ui.ink, lineHeight: 1.1 }}>{title}</Typography>
      {hint && <Typography variant="body2" sx={{ color: ui.inkSoft, mt: 0.25 }}>{hint}</Typography>}
    </Box>
  );
}
