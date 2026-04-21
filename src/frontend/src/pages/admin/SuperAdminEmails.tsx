import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Typography,
  Alert,
  Button,
  IconButton,
  Dialog,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import api from '../../services/api';

// Shared aesthetic with SuperAdminPayments
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=JetBrains+Mono:wght@400;500&display=swap';
function loadFonts() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = FONT_HREF;
  document.head.appendChild(l);
}

const INK = '#1a1612';
const PAPER = '#f4efe6';
const ACCENT = '#c13a16';
const RULE = 'rgba(26,22,18,0.14)';
const SUCCESS = '#3e6e4f';
const MUTED = '#8a847d';
const SERIF = '"Fraunces", serif';
const MONO = '"JetBrains Mono", monospace';

interface EmailLogRow {
  id: string;
  toEmail: string;
  subject: string;
  templateKey: string;
  status: string;
  errorMessage: string | null;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: string;
}

const TEMPLATE_OPTIONS = [
  { value: '', label: 'Todos los templates' },
  { value: 'welcome', label: 'welcome' },
  { value: 'booking_confirmation', label: 'booking_confirmation' },
  { value: 'payment_succeeded', label: 'payment_succeeded' },
  { value: 'payment_failed', label: 'payment_failed' },
  { value: 'trial_ending_2d', label: 'trial_ending_2d' },
  { value: 'trial_expired', label: 'trial_expired' },
  { value: 'test', label: 'test' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'sent', label: 'sent' },
  { value: 'failed', label: 'failed' },
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SuperAdminEmails() {
  loadFonts();
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (status) params.status = status;
      if (templateKey) params.templateKey = templateKey;
      const r = await api.get('/super-admin/emails', { params });
      setRows(r.data as EmailLogRow[]);
    } catch (e: any) {
      setBanner({ tone: 'error', text: e.response?.data?.error || 'No pudimos cargar los emails' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, templateKey]);

  const sendTest = async () => {
    if (!testEmail.trim()) {
      setBanner({ tone: 'error', text: 'Ingresá una dirección de email' });
      return;
    }
    setSending(true);
    try {
      await api.post('/super-admin/emails/test', { toEmail: testEmail.trim() });
      setBanner({ tone: 'success', text: `Email de prueba enviado a ${testEmail.trim()}` });
      setTestOpen(false);
      setTestEmail('');
      await load();
    } catch (e: any) {
      setBanner({ tone: 'error', text: e.response?.data?.error || 'Error enviando email de prueba' });
    } finally {
      setSending(false);
    }
  };

  const sentCount = rows.filter((r) => r.status === 'sent').length;
  const failedCount = rows.filter((r) => r.status === 'failed').length;

  return (
    <Box sx={{ minHeight: '100vh', background: PAPER, color: INK }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            Verificación · Emails
          </Typography>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            BookingPro · Super Admin
          </Typography>
        </Stack>

        <Typography
          sx={{
            fontFamily: SERIF,
            fontWeight: 340,
            fontVariationSettings: '"opsz" 144, "SOFT" 40',
            fontSize: { xs: 48, md: 84 },
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            mb: 2,
          }}
        >
          Qué <em style={{ fontStyle: 'italic', color: ACCENT }}>emails</em>
          <br />
          salieron hoy.
        </Typography>
        <Box sx={{ width: 90, height: '2px', background: INK, mb: 3 }} />
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: 18,
            color: '#4a4540',
            maxWidth: 560,
            lineHeight: 1.55,
            fontWeight: 350,
          }}
        >
          Cada email que sale de la plataforma queda registrado acá — bienvenidas, confirmaciones de
          turno, webhooks de MercadoPago y avisos de trial. Sirve para confirmar qué llegó y qué no.
        </Typography>

        {banner && (
          <Alert
            severity={banner.tone}
            onClose={() => setBanner(null)}
            sx={{
              mt: 4,
              borderRadius: 0,
              border: `1px solid ${banner.tone === 'success' ? SUCCESS : ACCENT}`,
              background: banner.tone === 'success' ? 'rgba(62,110,79,0.08)' : 'rgba(193,58,22,0.06)',
            }}
          >
            {banner.text}
          </Alert>
        )}

        {/* Meta + filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 6 }}>
          <Box sx={{ flex: 1, height: '1px', background: RULE }} />
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.24em',
              color: MUTED,
              textTransform: 'uppercase',
            }}
          >
            {sentCount} enviados · {failedCount} fallidos · {rows.length} total
          </Typography>
          <Box sx={{ flex: 1, height: '1px', background: RULE }} />
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ mb: 4 }}
        >
          <FormControl sx={{ minWidth: 200 }} size="small">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              displayEmpty
              sx={{
                fontFamily: MONO,
                fontSize: 13,
                borderRadius: 0,
                background: '#fff',
                border: `1px solid ${RULE}`,
                '& fieldset': { border: 'none' },
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontFamily: MONO, fontSize: 13 }}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 240 }} size="small">
            <Select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              displayEmpty
              sx={{
                fontFamily: MONO,
                fontSize: 13,
                borderRadius: 0,
                background: '#fff',
                border: `1px solid ${RULE}`,
                '& fieldset': { border: 'none' },
              }}
            >
              {TEMPLATE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontFamily: MONO, fontSize: 13 }}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Button
            onClick={load}
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              borderRadius: 0,
              border: `1px solid ${RULE}`,
              color: INK,
              px: 2,
              py: 1.1,
              '&:hover': { borderColor: INK },
            }}
          >
            Refrescar
          </Button>
          <Button
            onClick={() => setTestOpen(true)}
            startIcon={<SendIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              borderRadius: 0,
              background: INK,
              color: PAPER,
              px: 2.5,
              py: 1.1,
              '&:hover': { background: '#7a1f07' },
            }}
          >
            Email de prueba
          </Button>
        </Stack>

        {/* Table */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <CircularProgress size={28} sx={{ color: INK }} />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: 20, color: MUTED, fontStyle: 'italic' }}>
              No hay emails que coincidan con los filtros.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              border: `1px solid ${RULE}`,
              background: '#fff',
              overflow: 'auto',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(140px,1fr) minmax(200px,1.5fr) minmax(220px,2fr) minmax(140px,1fr) 90px minmax(160px,1.2fr) minmax(160px,1.5fr)',
                px: 2.5,
                py: 1.6,
                borderBottom: `1px solid ${RULE}`,
                background: '#faf6ee',
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: MUTED,
                gap: 1.5,
              }}
            >
              <Box>Fecha</Box>
              <Box>Para</Box>
              <Box>Asunto</Box>
              <Box>Template</Box>
              <Box>Estado</Box>
              <Box>Tenant</Box>
              <Box>Error</Box>
            </Box>

            {rows.map((r, idx) => (
              <Box
                key={r.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(140px,1fr) minmax(200px,1.5fr) minmax(220px,2fr) minmax(140px,1fr) 90px minmax(160px,1.2fr) minmax(160px,1.5fr)',
                  px: 2.5,
                  py: 1.8,
                  borderBottom: idx < rows.length - 1 ? `1px solid ${RULE}` : 'none',
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ fontFamily: MONO, fontSize: 12, color: INK }}>
                  {formatDate(r.createdAt)}
                </Typography>
                <Typography sx={{ fontFamily: SERIF, fontSize: 13.5, color: INK, wordBreak: 'break-all' }}>
                  {r.toEmail}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 14,
                    color: INK,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.subject}
                >
                  {r.subject}
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 11.5, color: '#4a4540' }}>
                  {r.templateKey}
                </Typography>
                <Chip
                  size="small"
                  label={r.status}
                  sx={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    borderRadius: 0,
                    height: 22,
                    background: r.status === 'sent' ? 'rgba(62,110,79,0.08)' : 'rgba(193,58,22,0.08)',
                    border: `1px solid ${r.status === 'sent' ? SUCCESS : ACCENT}`,
                    color: r.status === 'sent' ? SUCCESS : ACCENT,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 13,
                    color: r.tenantName ? INK : MUTED,
                    fontStyle: r.tenantName ? 'normal' : 'italic',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.tenantName ?? r.tenantId ?? '—'}
                >
                  {r.tenantName ?? (r.tenantId ? r.tenantId.slice(0, 8) + '…' : '—')}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: r.errorMessage ? ACCENT : MUTED,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.errorMessage ?? ''}
                >
                  {r.errorMessage ?? '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Container>

      {/* Test email dialog */}
      <Dialog
        open={testOpen}
        onClose={() => (sending ? null : setTestOpen(false))}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { background: PAPER, borderRadius: 0, border: `1px solid ${INK}` } }}
      >
        <Box sx={{ p: { xs: 4, md: 5 }, position: 'relative' }}>
          <IconButton
            onClick={() => setTestOpen(false)}
            disabled={sending}
            sx={{ position: 'absolute', top: 12, right: 12, color: INK }}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.28em',
              color: MUTED,
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            Verificación SMTP
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontWeight: 340,
              fontSize: { xs: 32, md: 44 },
              lineHeight: 1,
              letterSpacing: '-0.03em',
              mb: 2,
            }}
          >
            Enviar email
            <br />
            de <em style={{ color: ACCENT, fontStyle: 'italic' }}>prueba</em>.
          </Typography>
          <Box sx={{ width: 60, height: '2px', background: INK, my: 3 }} />

          <Typography sx={{ fontFamily: SERIF, fontSize: 15, color: '#4a4540', mb: 3, lineHeight: 1.55 }}>
            Dispara un email simple contra la dirección que elijas. Queda registrado como
            template <code style={{ fontFamily: MONO }}>test</code> en esta misma tabla.
          </Typography>

          <TextField
            fullWidth
            placeholder="tu-email@ejemplo.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            disabled={sending}
            InputProps={{
              sx: {
                fontFamily: MONO,
                fontSize: 14,
                borderRadius: 0,
                background: '#fff',
                border: `1px solid ${INK}`,
                '& fieldset': { border: 'none' },
              },
            }}
            sx={{ mb: 3 }}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              onClick={() => setTestOpen(false)}
              disabled={sending}
              sx={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                borderRadius: 0,
                border: `1px solid ${RULE}`,
                color: INK,
                px: 2.5,
                py: 1.1,
                '&:hover': { borderColor: INK },
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={sendTest}
              disabled={sending}
              startIcon={
                sending ? (
                  <CircularProgress size={14} sx={{ color: PAPER }} />
                ) : (
                  <SendIcon sx={{ fontSize: 16 }} />
                )
              }
              sx={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                borderRadius: 0,
                background: INK,
                color: PAPER,
                px: 3,
                py: 1.1,
                '&:hover': { background: '#7a1f07' },
              }}
            >
              {sending ? 'Enviando…' : 'Enviar'}
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}
