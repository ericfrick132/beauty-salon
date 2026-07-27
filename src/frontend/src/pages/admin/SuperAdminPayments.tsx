import { useEffect, useState } from 'react';
import { Box, Container, Stack, Typography, Alert, Button, IconButton, Dialog, CircularProgress, TextField } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import api from '../../services/api';

type TokenSource = 'oauth' | 'manual' | 'legacydatabase' | 'appsettings' | 'none';

interface Provider {
  code: 'mercadopago' | 'stripe';
  label: string;
  connected: boolean;
  accountEmail?: string | null;
  externalAccountId?: string | null;
  connectedAt?: string | null;
  expiresAt?: string | null;
  mode?: string | null;
  tokenSource: TokenSource;
  canCharge: boolean;
  legacyFallback?: boolean;
  redirectUri?: string | null;
}

interface ConnectData { authUrl: string; qrCodeUrl: string; state: string; redirectUri: string }

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

const SOURCE_LABEL: Record<TokenSource, string> = {
  oauth: 'Vinculada por OAuth',
  manual: 'Access token cargado a mano',
  legacydatabase: 'Config vieja en base de datos',
  appsettings: 'Token del servidor (appsettings/env)',
  none: 'Sin cuenta: no se puede cobrar',
};

const outlinedBtn = {
  fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
  borderRadius: 0, border: `1px solid ${RULE}`, color: INK, px: 2, py: 1.2, '&:hover': { borderColor: INK },
};
const solidBtn = {
  fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
  borderRadius: 0, background: INK, color: PAPER, px: 3, py: 1.2, '&:hover': { background: '#7a1f07' },
};

export default function SuperAdminPayments({ embedded = false }: { embedded?: boolean }) {
  loadFonts();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [dialog, setDialog] = useState<{ provider: Provider; data: ConnectData } | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualPublicKey, setManualPublicKey] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/super-admin/payments/providers'); setProviders(r.data); }
    catch { setBanner({ tone: 'error', text: 'No pudimos cargar los proveedores' }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('mp') === 'connected') setBanner({ tone: 'success', text: 'Mercado Pago vinculado. Los cobros caen a esta cuenta.' });
    if (p.get('mp') === 'error') setBanner({ tone: 'error', text: `No pudimos vincular MP${p.get('reason') ? ` (${p.get('reason')})` : ''}.` });
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

  const saveManual = async () => {
    setSavingManual(true);
    try {
      const r = await api.post('/super-admin/payments/mercadopago/manual', {
        accessToken: manualToken.trim(),
        publicKey: manualPublicKey.trim() || undefined,
      });
      setManualOpen(false); setManualToken(''); setManualPublicKey('');
      setBanner({ tone: 'success', text: `Cuenta guardada${r.data?.accountEmail ? `: ${r.data.accountEmail}` : ''}. Ya se puede cobrar.` });
      await load();
    } catch (e: any) {
      setBanner({ tone: 'error', text: e.response?.data?.error || 'No pudimos guardar el token' });
    } finally { setSavingManual(false); }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const r = await api.post('/super-admin/payments/mercadopago/test');
      const who = r.data?.email || r.data?.nickname || r.data?.userId;
      setBanner({ tone: 'success', text: `Conexión OK — cobra la cuenta ${who} (${SOURCE_LABEL[r.data?.source as TokenSource] || r.data?.source}).` });
    } catch (e: any) {
      setBanner({ tone: 'error', text: e.response?.data?.error || 'La conexión falló' });
    } finally { setTesting(false); }
  };

  const disconnect = async (code: string) => {
    if (!window.confirm(`Desvincular ${code}? La plataforma deja de poder cobrar con esa cuenta.`)) return;
    try { await api.post(`/super-admin/payments/${code}/disconnect`); await load(); }
    catch { setBanner({ tone: 'error', text: 'Error al desvincular' }); }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setBanner({ tone: 'success', text: 'Copiado al portapapeles' });
  };

  const mp = providers.find(p => p.code === 'mercadopago');

  return (
    <Box sx={{ minHeight: embedded ? 'auto' : '100vh', background: PAPER, color: INK }}>
      <Container maxWidth="md" sx={{ py: embedded ? { xs: 4, md: 6 } : { xs: 6, md: 10 } }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: MUTED }}>
            Cuenta de cobro · Plataforma
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: MUTED }}>
            BookingPro · Payments
          </Typography>
        </Stack>

        <Typography sx={{ fontFamily: SERIF, fontWeight: 340, fontVariationSettings: '"opsz" 144, "SOFT" 40', fontSize: embedded ? { xs: 40, md: 62 } : { xs: 48, md: 84 }, lineHeight: 0.95, letterSpacing: '-0.035em', mb: 2 }}>
          Dónde cae el <em style={{ fontStyle: 'italic', color: ACCENT }}>dinero</em><br />
          de los negocios.
        </Typography>
        <Box sx={{ width: 90, height: '2px', background: INK, mb: 3 }} />
        <Typography sx={{ fontFamily: SERIF, fontSize: 18, color: '#4a4540', maxWidth: 560, lineHeight: 1.55, fontWeight: 350 }}>
          Vinculá una cuenta MP o Stripe para que las suscripciones mensuales de barberías, salones y
          centros de estética caigan directo ahí. Se configura una sola vez.
        </Typography>

        {!loading && mp && !mp.canCharge && (
          <Alert severity="error" sx={{ mt: 4, borderRadius: 0, border: `1px solid ${ACCENT}`, background: 'rgba(193,58,22,0.06)' }}>
            No hay ninguna cuenta de MercadoPago configurada: hoy la plataforma <strong>no puede cobrarle a los tenants</strong>.
            Vinculá una cuenta o pegá un access token acá abajo.
          </Alert>
        )}

        {!loading && mp?.canCharge && !mp.connected && (
          <Alert severity="warning" sx={{ mt: 4, borderRadius: 0 }}>
            Se está cobrando con el token del servidor ({SOURCE_LABEL[mp.tokenSource]}). Vinculá la cuenta acá
            para poder rotarla sin redeploy.
          </Alert>
        )}

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
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.2, py: 0.35, border: `1px solid ${p.canCharge ? SUCCESS : RULE}`, background: p.canCharge ? 'rgba(62,110,79,0.08)' : 'transparent' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: p.canCharge ? SUCCESS : MUTED }} />
                    <Typography sx={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.canCharge ? SUCCESS : MUTED }}>
                      {p.connected ? 'Autorizado' : p.canCharge ? 'Token del servidor' : 'Sin vincular'}
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
                <Typography sx={{ mt: 2, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: p.canCharge ? MUTED : ACCENT }}>
                  Cobra con · {SOURCE_LABEL[p.tokenSource]}
                </Typography>
              </Box>
              <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                {p.connected ? (
                  <Button onClick={() => disconnect(p.code)} sx={outlinedBtn}>Desvincular</Button>
                ) : (
                  <Button onClick={() => openConnect(p)} disabled={generating === p.code} sx={solidBtn}>
                    {generating === p.code ? 'Generando…' : 'Vincular cuenta'}
                  </Button>
                )}
                {p.code === 'mercadopago' && (
                  <>
                    <Button onClick={() => setManualOpen(true)} sx={outlinedBtn}>
                      {p.connected ? 'Cambiar token' : 'Pegar access token'}
                    </Button>
                    <Button onClick={testConnection} disabled={testing || !p.canCharge} sx={outlinedBtn}>
                      {testing ? 'Probando…' : 'Probar conexión'}
                    </Button>
                  </>
                )}
              </Stack>
            </Box>
            {idx < providers.length - 1 && <Box sx={{ height: '1px', background: RULE }} />}
          </Box>
        ))}
      </Container>

      {/* OAuth por QR */}
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
                <Button href={dialog.data.authUrl} target="_blank" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ ...solidBtn, mt: 3 }}>
                  Abrir en este navegador
                </Button>
                {dialog.data.redirectUri && (
                  <Box sx={{ mt: 3, borderTop: `1px solid ${RULE}`, pt: 2 }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: MUTED, mb: 0.5 }}>
                      Redirect URI de la autorización
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ fontFamily: MONO, fontSize: 11.5, wordBreak: 'break-all' }}>{dialog.data.redirectUri}</Typography>
                      <IconButton size="small" onClick={() => copy(dialog.data.redirectUri)} sx={{ color: INK }}><ContentCopyIcon sx={{ fontSize: 14 }} /></IconButton>
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: '#4a4540', mt: 1 }}>
                      Es la misma que ya está dada de alta en tu aplicación de MercadoPago. Si MP rechaza la
                      autorización, verificá que figure igual en Desarrolladores → Tus integraciones → Redirect URIs.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Dialog>

      {/* Access token manual */}
      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: PAPER, borderRadius: 0, border: `1px solid ${INK}` } }}>
        <Box sx={{ p: { xs: 3, md: 5 }, position: 'relative' }}>
          <IconButton onClick={() => setManualOpen(false)} sx={{ position: 'absolute', top: 12, right: 12, color: INK }} size="small"><CloseIcon fontSize="small" /></IconButton>
          <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase', mb: 1 }}>
            Alta manual · Mercado Pago
          </Typography>
          <Typography sx={{ fontFamily: SERIF, fontWeight: 340, fontSize: { xs: 30, md: 42 }, lineHeight: 1.05, letterSpacing: '-0.03em', mb: 2 }}>
            Pegá el <em style={{ color: ACCENT, fontStyle: 'italic' }}>access token</em>
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#4a4540', mb: 3 }}>
            Está en Mercado Pago → Desarrolladores → Tus integraciones → Credenciales de producción.
            Lo validamos contra MP antes de guardarlo.
          </Typography>
          <TextField
            fullWidth label="Access token" value={manualToken} onChange={e => setManualToken(e.target.value)}
            placeholder="APP_USR-..." size="small" sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Public key (opcional)" value={manualPublicKey} onChange={e => setManualPublicKey(e.target.value)}
            placeholder="APP_USR-..." size="small" sx={{ mb: 3 }}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => setManualOpen(false)} sx={outlinedBtn}>Cancelar</Button>
            <Button onClick={saveManual} disabled={savingManual || !manualToken.trim()} sx={solidBtn}>
              {savingManual ? 'Validando…' : 'Guardar y activar'}
            </Button>
          </Stack>
        </Box>
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
