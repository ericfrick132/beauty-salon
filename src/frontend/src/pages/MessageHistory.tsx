import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Pagination, Select, MenuItem,
  FormControl, InputLabel, Alert, CircularProgress,
} from '@mui/material';
import { CheckCircle, Error, Schedule, Send } from '@mui/icons-material';
import { messagingApi } from '../services/api';

interface MessageItem {
  id: string;
  to: string;
  body: string;
  messageType: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
}

interface Stats {
  totalSent: number;
  sentThisMonth: number;
  delivered: number;
  failed: number;
}

const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  sent: 'success',
  delivered: 'success',
  queued: 'warning',
  failed: 'error',
};

const statusIcon: Record<string, React.ReactNode> = {
  sent: <Send sx={{ fontSize: 14 }} />,
  delivered: <CheckCircle sx={{ fontSize: 14 }} />,
  queued: <Schedule sx={{ fontSize: 14 }} />,
  failed: <Error sx={{ fontSize: 14 }} />,
};

const MessageHistory: React.FC = () => {
  const [items, setItems] = useState<MessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [histData, statsData] = await Promise.all([
        messagingApi.getHistory(page, 20, statusFilter || undefined),
        messagingApi.getStats(),
      ]);
      setItems(histData.items);
      setTotal(histData.total);
      setStats(statsData);
      setError(null);
    } catch {
      setError('No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const totalPages = Math.ceil(total / 20);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Historial de Mensajes</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Enviados (total)', value: stats.totalSent, color: '#25D366' },
            { label: 'Este mes', value: stats.sentThisMonth, color: '#1976d2' },
            { label: 'Entregados', value: stats.delivered, color: '#4caf50' },
            { label: 'Fallidos', value: stats.failed, color: '#f44336' },
          ].map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filter */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            value={statusFilter}
            label="Estado"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="sent">Enviados</MenuItem>
            <MenuItem value="delivered">Entregados</MenuItem>
            <MenuItem value="failed">Fallidos</MenuItem>
            <MenuItem value="queued">En cola</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {total} mensaje{total !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No hay mensajes para mostrar.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Destinatario</TableCell>
                  <TableCell>Mensaje</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{m.to}</TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.body}
                    </TableCell>
                    <TableCell>
                      <Chip label={m.messageType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusIcon[m.status] as any}
                        label={m.status}
                        size="small"
                        color={statusColor[m.status] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(m.createdAt).toLocaleString('es-AR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default MessageHistory;
