import { useEffect, useState } from 'react';
import { Box, Container, Stack, Typography, Alert, Button, IconButton, Dialog, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../services/api';

interface Provider {
  code: 'mercadopago' | 'stripe';
  label: string;
  connected: boolean;
  accountEmail?: string | null;
  externalAccountId?: string | null;
  connectedAt?: string | null;
  expiresAt?: string | null;
  legacyFallback?: boolean;
}

interface ConnectData { authUrl: string; qrCodeUrl: string; state: string }

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=JetBrains+Mono:wght@400;500&display=swap';
function loadFonts() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = FONT_HREF;
  document.head.appendChild(l);
}

const INK = '#1a1612', PAPER = '#f4efe6', ACCENT = '#c13a16', RULE = 'rgba(26,22,18,0.14)', SUCCESS = '#3e6e4f', MUTED = '#8a847d';
const SERIF = '"Fraunces", serif', MONO = '"JetBrains Mono", monospace';

export default function SuperAdminPayments() {
  loadFonts();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [dialog, setDialog] = useState<{ provider: Provider; data: ConnectData } | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/super-admin/payments/providers'); setProviders(r.data); }
    catch { setBanner({ tone: 'error', text: 'No pudimos cargar los proveedores' }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('mp') === 'connected') setBanner({ tone: 'success', text: 'Mercado Pago vinculado. Los cobros caen a esta cuenta.' });
    if (p.get('mp') === 'error') setBanner({ tone: 'error', text: 'No pudimos vincular MP.' });
    if (p.get('mp')) {
      const url = new URL(window.location.href); url.searchParams.delete('mp'); url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
    load();
  }, []);

  const openConnect = async (p: Provider) => {
    if (p.code === 'stripe') { setBanner({ tone: 'error', text: 'Stripe Connect próximamente.' }); return; }
    setGenerating(p.code);
    try { const r = await api.get(`/super-admin/payments/${p.code}/connect-url`); setDialog({ provider: p, data: r.data }); }
    catch (e: any) { setBanner({ tone: 'error', text: e.response?.data?.error || 'Error' }); }
    finally { setGenerating(null); }
  };

  const disconnect = async (code: string) => {
    if (!confirm(`Desvincular ${code}?`)) return;
    try { await api.post(`/super-admin/payments/${code}/disconnect`); await load(); }
    catch { setBanner({ tone: 'error', text: 'Error al desvincular' }); }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: PAPER, color: INK }}>
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: MUTED }}>
            Cuenta de cobro · Plataforma
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: MUTED }}>
            BookingPro · Payments
          </Typography>
        </Stack>

        <Typography sx={{ fontFamily: SERIF, fontWeight: 340, fontVariationSettings: '"opsz" 144, "SOFT" 40', fontSize: { xs: 48, md: 84 }, lineHeight: 0.95, letterSpacing: '-0.035em', mb: 2 }}>
          Dónde cae el <em style={{ fontStyle: 'italic', color: ACCENT }}>dinero</em><br />
          de los negocios.
        </Typography>
        <Box sx={{ width: 90, height: '2px', background: INK, mb: 3 }} />
        <Typography sx={{ fontFamily: SERIF, fontSize: 18, color: '#4a4540', maxWidth: 560, lineHeight: 1.55, fontWeight: 350 }}>
          Vinculá una cuenta MP o Stripe para que las suscripciones mensuales de barberías, salones y
          centros de estética caigan directo ahí. Se configura una sola vez.
        </Typography>

        {banner && (
          <Alert severity={banner.tone} onClose={() => setBanner(null)} sx={{ mt: 4, borderRadius: 0, border: `1px solid ${banner.tone === 'success' ? SUCCESS : ACCENT}`, background: banner.tone === 'success' ? 'rgba(62,110,79,0.08)' : 'rgba(193,58,22,0.06)' }}>
            {banner.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 7 }}>
          <Box sx={{ flex: 1, height: '1px', background: RULE }} />
          <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.24em', color: MUTED, textTransform: 'uppercase' }}>
            {providers.filter(p => p.connected).length} de {providers.length} activos
          </Typography>
          <Box sx={{ flex: 1, height: '1px', background: RULE }} />
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress size={28} sx={{ color: INK }} /></Box>
        ) : providers.map((p, idx) => (
          <Box key={p.code}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '60px 1fr 240px' }, gap: { xs: 2, md: 6 }, py: 6 }}>
              <Typography sx={{ fontFamily: SERIF, fontWeight: 300, fontSize: 42, color: MUTED, lineHeight: 1 }}>0{idx + 1}</Typography>
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontFamily: SERIF, fontWeight: 360, fontSize: { xs: 34, md: 48 }, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {p.label}
                  </Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.2, py: 0.35, border: `1px solid ${p.connected ? SUCCESS : RULE}`, background: p.connected ? 'rgba(62,110,79,0.08)' : 'transparent' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: p.connected ? SUCCESS : MUTED }} />
                    <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.connected ? SUCCESS : MUTED }}>
                      {p.connected ? 'Autorizado' : 'Sin vincular'}
                    </Typography>
                  </Box>
                </Stack>
                <Typography sx={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: '#4a4540', maxWidth: 520, mb: 2 }}>
                  {p.code === 'mercadopago' ? 'Cobros recurrentes en ARS para Argentina y LATAM.' : 'Suscripciones en USD/EUR para fuera de LATAM.'}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, borderTop: `1px solid ${RULE}`, pt: 2, maxWidth: 500 }}>
                  <Detail label="Cuenta" value={p.accountEmail || '—'} />
                  <Detail label="ID" value={p.externalAccountId || '—'} mono />
                  <Detail label="Desde" value={p.connectedAt ? new Date(p.connectedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                </Box>
                {p.legacyFallback && (
                  <Typography sx={{ mt: 2, fontFamily: MONO, fontSize: 11, color: ACCENT }}>
                    Token legacy en appsettings — conectá por OAuth para refresh automático.
                  </Typography>
                )}
              </Box>
              <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                {p.connected ? (
                  <Button onClick={() => disconnect(p.code)} sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 0, border: `1px solid ${RULE}`, color: INK, px: 2, py: 1.2, '&:hover': { borderColor: INK } }}>
                    Desvincular
                  </Button>
                ) : (
                  <Button onClick={() => openConnect(p)} disabled={generating === p.code}
                    sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 0, background: INK, color: PAPER, px: 3, py: 1.2, '&:hover': { background: '#7a1f07' } }}>
                    {generating === p.code ? 'Generando…' : 'Vincular cuenta'}
                  </Button>
                )}
              </Stack>
            </Box>
            {idx < providers.length - 1 && <Box sx={{ height: '1px', background: RULE }} />}
          </Box>
        ))}
      </Container>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="md" PaperProps={{ sx: { background: PAPER, borderRadius: 0, border: `1px solid ${INK}` } }}>
        {dialog && (
          <Box sx={{ p: { xs: 4, md: 6 }, position: 'relative' }}>
            <IconButton onClick={() => setDialog(null)} sx={{ position: 'absolute', top: 12, right: 12, color: INK }} size="small"><CloseIcon fontSize="small" /></IconButton>
            <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase', mb: 1 }}>
              Autorización · {dialog.provider.label}
            </Typography>
            <Typography sx={{ fontFamily: SERIF, fontWeight: 340, fontSize: { xs: 36, md: 52 }, lineHeight: 1, letterSpacing: '-0.03em', mb: 2 }}>
              Vinculá tu cuenta<br />con un <em style={{ color: ACCENT, fontStyle: 'italic' }}>QR</em>.
            </Typography>
            <Box sx={{ width: 80, height: '2px', background: INK, my: 3 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 5 }}>
              <Box sx={{ p: 2.5, background: '#fff', border: `1px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}>
                <Box component="img" src={dialog.data.qrCodeUrl} sx={{ width: '100%', display: 'block' }} />
                <Typography sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.28em', color: MUTED, mt: 1.5, textAlign: 'center', textTransform: 'uppercase' }}>
                  State · {dialog.data.state.slice(0, 12)}…
                </Typography>
              </Box>
              <Box>
                <Ritual n="01" title="Abrí Mercado Pago" body="Cualquier celular con sesión abierta." />
                <Ritual n="02" title="Escaneá el QR" body="Autorizás la app." />
                <Ritual n="03" title="Volvés acá" body="Los cobros caen a esa cuenta." />
                <Button href={dialog.data.authUrl} target="_blank" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ mt: 3, fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', background: INK, color: PAPER, borderRadius: 0, px: 3, py: 1.2, '&:hover': { background: '#7a1f07' } }}>
                  Abrir en este navegador
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.26em', textTransform: 'uppercase', color: MUTED, mb: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontFamily: mono ? MONO : SERIF, fontSize: 13.5, color: INK, wordBreak: 'break-all' }}>{value}</Typography>
    </Box>
  );
}

function Ritual({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <Stack direction="row" spacing={2.5} sx={{ mb: 2 }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: 26, color: ACCENT, minWidth: 46, lineHeight: 1 }}>{n}</Typography>
      <Box>
        <Typography sx={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16, mb: 0.4 }}>{title}</Typography>
        <Typography sx={{ fontSize: 13, color: '#4a4540', lineHeight: 1.5 }}>{body}</Typography>
      </Box>
    </Stack>
  );
}
