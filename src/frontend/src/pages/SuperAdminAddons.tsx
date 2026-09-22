import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, Refresh, AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { superAdminAddonsApi, SuperAdminAddonsRow } from '../services/api';

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

/**
 * Add-ons por negocio: quién tiene cada extra, hasta cuándo y cuánto factura. Desde acá el super
 * admin puede regalar meses (cortesía, prueba, compensación) o revocar sin tocar la base.
 */
const SuperAdminAddons: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SuperAdminAddonsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [grantRow, setGrantRow] = useState<SuperAdminAddonsRow | null>(null);
  const [grantCode, setGrantCode] = useState('');
  const [grantMonths, setGrantMonths] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await superAdminAddonsApi.tenants());
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudieron cargar los add-ons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const codes = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.addons.forEach((a) => map.set(a.code, a.name)));
    return Array.from(map.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.businessName.toLowerCase().includes(q) || r.subdomain.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => ({
    mrr: rows.reduce((s, r) => s + r.monthlyTotal, 0),
    byCode: codes.map(([code, name]) => ({
      code, name,
      active: rows.filter((r) => r.addons.find((a) => a.code === code)?.active).length,
    })),
  }), [rows, codes]);

  const openGrant = (row: SuperAdminAddonsRow, code: string) => {
    setGrantRow(row);
    setGrantCode(code);
    setGrantMonths(1);
  };

  const handleGrant = async () => {
    if (!grantRow || !grantCode) return;
    setSaving(true);
    try {
      await superAdminAddonsApi.grant(grantRow.tenantId, grantCode, grantMonths);
      setToast(`Add-on otorgado a ${grantRow.businessName} por ${grantMonths} mes(es).`);
      setGrantRow(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo otorgar el add-on.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (row: SuperAdminAddonsRow, code: string) => {
    try {
      await superAdminAddonsApi.revoke(row.tenantId, code);
      setToast(`Add-on revocado a ${row.businessName}.`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo revocar el add-on.');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/super-admin/dashboard')}>Volver</Button>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Add-ons por negocio</Typography>
        <Button startIcon={<Refresh />} onClick={load}>Actualizar</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">Facturación mensual por add-ons</Typography>
              <Typography variant="h5" fontWeight={700}>{money(totals.mrr)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {totals.byCode.map((c) => (
          <Grid item xs={12} md={4} key={c.code}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">{c.name}</Typography>
                <Typography variant="h5" fontWeight={700}>{c.active} <Typography component="span" variant="body2" color="text.secondary">negocios</Typography></Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TextField size="small" placeholder="Buscar negocio o subdominio…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2, minWidth: 320 }} />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Negocio</TableCell>
              <TableCell>Subdominio</TableCell>
              <TableCell>Estado</TableCell>
              {codes.map(([code, name]) => <TableCell key={code}>{name}</TableCell>)}
              <TableCell align="right">$/mes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.tenantId} hover>
                <TableCell>{row.businessName}</TableCell>
                <TableCell>{row.subdomain}</TableCell>
                <TableCell><Chip size="small" label={row.status} variant="outlined" /></TableCell>
                {codes.map(([code]) => {
                  const a = row.addons.find((x) => x.code === code);
                  return (
                    <TableCell key={code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {a?.active ? (
                          <>
                            <Chip
                              size="small"
                              color="success"
                              label={a.paidUntil ? new Date(a.paidUntil).toLocaleDateString('es-AR') : 'activo'}
                              title={a.source === 'manual' ? 'Otorgado a mano' : 'Pago del negocio'}
                            />
                            <Button size="small" color="error" onClick={() => handleRevoke(row, code)} startIcon={<RemoveCircleOutline />} sx={{ minWidth: 0 }}>{''}</Button>
                          </>
                        ) : (
                          <Button size="small" onClick={() => openGrant(row, code)} startIcon={<AddCircleOutline />}>Dar</Button>
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
                <TableCell align="right">{row.monthlyTotal > 0 ? money(row.monthlyTotal) : '—'}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={codes.length + 4} sx={{ textAlign: 'center', py: 4 }}>Sin resultados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!grantRow} onClose={() => !saving && setGrantRow(null)}>
        <DialogTitle>Otorgar add-on</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {grantRow?.businessName} · {codes.find(([c]) => c === grantCode)?.[1]}
          </Typography>
          <TextField select fullWidth label="Meses" value={grantMonths} onChange={(e) => setGrantMonths(Number(e.target.value))}>
            {[1, 2, 3, 6, 12].map((m) => <MenuItem key={m} value={m}>{m} mes{m > 1 ? 'es' : ''}</MenuItem>)}
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Queda marcado como otorgado a mano (no cobra Mercado Pago). Si ya tenía vigencia, se suma desde ahí.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantRow(null)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleGrant} disabled={saving}>{saving ? 'Guardando…' : 'Otorgar'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminAddons;
