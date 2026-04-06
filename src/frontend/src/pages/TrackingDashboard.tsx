import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, CardHeader, Grid, Typography, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  ToggleButton, ToggleButtonGroup, Chip
} from '@mui/material';
import {
  Visibility as ViewsIcon,
  PersonAdd as LeadIcon,
  ShoppingCart as CheckoutIcon,
  CheckCircle as RegIcon,
  TrendingUp as TrendIcon
} from '@mui/icons-material';
import api from '../services/api';

interface DailyStats {
  date: string;
  pageViews: number;
  leads: number;
  checkouts: number;
  registrations: number;
}

interface CampaignStats {
  campaign: string;
  pageViews: number;
  leads: number;
  checkouts: number;
  registrations: number;
}

interface SourceStats {
  source: string;
  pageViews: number;
  registrations: number;
}

interface RecentLead {
  id: number;
  eventType: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  planName: string | null;
  campaign: string | null;
  source: string | null;
  device: string | null;
  createdAt: string;
}

interface TrackingData {
  totals: {
    pageViews: number;
    leads: number;
    checkouts: number;
    registrations: number;
  };
  daily: DailyStats[];
  byCampaign: CampaignStats[];
  bySource: SourceStats[];
  recentLeads: RecentLead[];
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: `${color}15`, borderRadius: 2, p: 1.5, display: 'flex' }}>
          {React.cloneElement(icon as React.ReactElement, { sx: { color, fontSize: 28 } })}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TrackingDashboard() {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/tracking/stats?days=${days}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  if (!data) return <Typography color="error">Error cargando datos de tracking</Typography>;

  const convRate = data.totals.pageViews > 0
    ? ((data.totals.registrations / data.totals.pageViews) * 100).toFixed(1)
    : '0';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Marketing & Tracking</Typography>
        <ToggleButtonGroup value={days} exclusive onChange={(_, v) => v && setDays(v)} size="small">
          <ToggleButton value={7}>7d</ToggleButton>
          <ToggleButton value={14}>14d</ToggleButton>
          <ToggleButton value={30}>30d</ToggleButton>
          <ToggleButton value={90}>90d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <StatCard title="Visitas" value={data.totals.pageViews} icon={<ViewsIcon />} color="#2563EB" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Leads" value={data.totals.leads} icon={<LeadIcon />} color="#7C3AED" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Checkouts" value={data.totals.checkouts} icon={<CheckoutIcon />} color="#F59E0B" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Registros" value={data.totals.registrations} icon={<RegIcon />} color="#10B981" />
        </Grid>
      </Grid>

      {/* Conversion rate */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrendIcon sx={{ color: '#10B981' }} />
          <Typography>
            Tasa de conversión: <strong>{convRate}%</strong> (visitas → registros)
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Daily breakdown */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title="Por día" />
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Visitas</TableCell>
                    <TableCell align="right">Leads</TableCell>
                    <TableCell align="right">Checkouts</TableCell>
                    <TableCell align="right">Registros</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.daily.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{new Date(d.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</TableCell>
                      <TableCell align="right">{d.pageViews}</TableCell>
                      <TableCell align="right">{d.leads || '-'}</TableCell>
                      <TableCell align="right">{d.checkouts || '-'}</TableCell>
                      <TableCell align="right">
                        {d.registrations > 0 ? <Chip label={d.registrations} color="success" size="small" /> : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.daily.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">Sin datos aún</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* By campaign */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Por campaña" />
            <TableContainer sx={{ maxHeight: 200 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campaña</TableCell>
                    <TableCell align="right">Visitas</TableCell>
                    <TableCell align="right">Registros</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.byCampaign.map((c) => (
                    <TableRow key={c.campaign}>
                      <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.campaign}
                      </TableCell>
                      <TableCell align="right">{c.pageViews}</TableCell>
                      <TableCell align="right">
                        {c.registrations > 0 ? <Chip label={c.registrations} color="success" size="small" /> : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.byCampaign.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">Sin datos de campaña</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card>
            <CardHeader title="Por fuente" />
            <TableContainer sx={{ maxHeight: 200 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fuente</TableCell>
                    <TableCell align="right">Visitas</TableCell>
                    <TableCell align="right">Registros</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.bySource.map((s) => (
                    <TableRow key={s.source}>
                      <TableCell>{s.source}</TableCell>
                      <TableCell align="right">{s.pageViews}</TableCell>
                      <TableCell align="right">
                        {s.registrations > 0 ? <Chip label={s.registrations} color="success" size="small" /> : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.bySource.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">Sin datos de fuente</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Recent leads/registrations */}
      <Card sx={{ mt: 3 }}>
        <CardHeader title="Leads y Registros recientes" />
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Campaña</TableCell>
                <TableCell>Dispositivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentLeads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(l.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(l.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={l.eventType === 'CompleteRegistration' ? 'Registro' : l.eventType === 'InitiateCheckout' ? 'Checkout' : 'Lead'}
                      color={l.eventType === 'CompleteRegistration' ? 'success' : l.eventType === 'InitiateCheckout' ? 'warning' : 'info'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{l.name || '—'}</TableCell>
                  <TableCell>{l.email || '—'}</TableCell>
                  <TableCell>{l.phone || '—'}</TableCell>
                  <TableCell>{l.planName || '—'}</TableCell>
                  <TableCell>{l.campaign || 'orgánico'}</TableCell>
                  <TableCell>{l.device || '—'}</TableCell>
                </TableRow>
              ))}
              {data.recentLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">Sin leads aún</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
