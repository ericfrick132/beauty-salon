import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  CalendarMonth,
  DateRange,
  CheckCircle,
  Pending,
  Payment,
  Download,
  Print,
  AttachMoney,
  TrendingUp,
  Groups,
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useTenant } from '../contexts/TenantContext';

interface PayrollItem {
  employeeId: string;
  employeeName: string;
  employeeType: string;
  paymentMethod: string;
  servicesCount: number;
  fixedSalary: number;
  commissionPercentage: number;
  commissions: number;
  totalToPay: number;
  isPaid: boolean;
  paymentStatus: 'pending' | 'partial' | 'paid';
}

interface PayrollData {
  period: string;
  periodStart: string;
  periodEnd: string;
  employees: PayrollItem[];
  summary: {
    totalEmployees: number;
    totalFixedSalaries: number;
    totalCommissions: number;
    totalPayroll: number;
    pendingPayments: number;
    partialPayments: number;
    completedPayments: number;
  };
}

interface FinancialStats {
  totalRevenue: number;
  totalSalaries: number;
  totalCommissions: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenueGrowth: number;
  breakdown: {
    salariesPercentage: number;
    commissionsPercentage: number;
    netProfitPercentage: number;
  };
}

const Payroll: React.FC = () => {
  const { config, getTerm } = useTenant();
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollItem | null>(null);

  const primaryColor = config?.theme?.primaryColor || '#1976d2';
  const accentColor = config?.theme?.accentColor || '#ffc107';

  useEffect(() => {
    fetchPayrollData();
    fetchFinancialStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, selectedDate]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/payroll', {
        params: {
          period,
          date: selectedDate.toISOString(),
        },
      });
      setPayrollData(response.data);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialStats = async () => {
    try {
      let startDate, endDate;
      
      if (period === 'weekly') {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      }

      const response = await api.get('/dashboard/financial-stats', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      setFinancialStats(response.data);
    } catch (error) {
      console.error('Error fetching financial stats:', error);
    }
  };

  const handleMarkPaid = async (employee: PayrollItem) => {
    try {
      await api.post('/dashboard/payroll/mark-paid', {
        employeeId: employee.employeeId,
        amount: employee.totalToPay,
        period: `${period}_${selectedDate.toISOString()}`,
        paymentMethod: 'transfer',
      });
      
      fetchPayrollData();
      setPaymentDialog(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'fixed':
        return 'Sueldo Fijo';
      case 'percentage':
        return 'Comisión';
      case 'mixed':
        return 'Mixto';
      default:
        return method;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Sueldos y Comisiones
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(e, value) => value && setPeriod(value)}
            size="small"
          >
            <ToggleButton value="weekly">
              <DateRange sx={{ mr: 1 }} />
              Semanal
            </ToggleButton>
            <ToggleButton value="monthly">
              <CalendarMonth sx={{ mr: 1 }} />
              Mensual
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            type="month"
            value={format(selectedDate, 'yyyy-MM')}
            onChange={(e) => setSelectedDate(new Date(e.target.value + '-01'))}
            size="small"
            sx={{ minWidth: 200 }}
          />

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="outlined"
            startIcon={<Download />}
            sx={{ borderColor: primaryColor, color: primaryColor }}
          >
            Exportar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            sx={{ borderColor: primaryColor, color: primaryColor }}
          >
            Imprimir
          </Button>
        </Box>

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab label="Nómina a Pagar" />
          <Tab label="Métricas Financieras" />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {activeTab === 0 && payrollData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Groups sx={{ color: primaryColor, mr: 2 }} />
                    <Typography color="textSecondary" variant="body2">
                      Total Empleados
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {payrollData.summary.totalEmployees}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AttachMoney sx={{ color: primaryColor, mr: 2 }} />
                    <Typography color="textSecondary" variant="body2">
                      Sueldos Fijos
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(payrollData.summary.totalFixedSalaries)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ color: accentColor, mr: 2 }} />
                    <Typography color="textSecondary" variant="body2">
                      Comisiones
                    </Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(payrollData.summary.totalCommissions)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: primaryColor + '10' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Payment sx={{ color: primaryColor, mr: 2 }} />
                    <Typography color="textSecondary" variant="body2">
                      Total a Pagar
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: primaryColor }}>
                    {formatCurrency(payrollData.summary.totalPayroll)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Payroll Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Empleado</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Método de Pago</TableCell>
                  <TableCell align="center">Servicios</TableCell>
                  <TableCell align="right">Sueldo Fijo</TableCell>
                  <TableCell align="right">Comisiones</TableCell>
                  <TableCell align="right">Total a Pagar</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payrollData.employees.map((employee) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {employee.employeeName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={employee.employeeType === 'employee' ? 'Empleado' : 'Contratista'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPaymentMethodLabel(employee.paymentMethod)}
                        size="small"
                        color={employee.paymentMethod === 'mixed' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">{employee.servicesCount}</TableCell>
                    <TableCell align="right">
                      {employee.fixedSalary > 0 ? formatCurrency(employee.fixedSalary) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {employee.commissions > 0 ? (
                        <>
                          {formatCurrency(employee.commissions)}
                          <Typography variant="caption" display="block" color="textSecondary">
                            ({employee.commissionPercentage}%)
                          </Typography>
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color={primaryColor}>
                        {formatCurrency(employee.totalToPay)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={
                          employee.paymentStatus === 'paid'
                            ? 'Pagado'
                            : employee.paymentStatus === 'partial'
                            ? 'Parcial'
                            : 'Pendiente'
                        }
                        color={getStatusColor(employee.paymentStatus) as any}
                        size="small"
                        icon={
                          employee.paymentStatus === 'paid' ? (
                            <CheckCircle />
                          ) : (
                            <Pending />
                          )
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setPaymentDialog(true);
                        }}
                        disabled={employee.paymentStatus === 'paid'}
                        sx={{ bgcolor: primaryColor }}
                      >
                        Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {activeTab === 1 && financialStats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumen Financiero
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Facturación Total:</Typography>
                    <Typography fontWeight="bold">
                      {formatCurrency(financialStats.totalRevenue)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Sueldos Fijos:</Typography>
                    <Typography color="error">
                      -{formatCurrency(financialStats.totalSalaries)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Comisiones:</Typography>
                    <Typography color="error">
                      -{formatCurrency(financialStats.totalCommissions)}
                    </Typography>
                  </Box>
                  
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      pt: 2,
                      borderTop: 2,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="h6">Ganancia Neta:</Typography>
                    <Typography
                      variant="h6"
                      color={financialStats.netProfit >= 0 ? 'success.main' : 'error'}
                    >
                      {formatCurrency(financialStats.netProfit)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Indicadores Clave
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                      Margen de Ganancia
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4">
                        {financialStats.profitMargin.toFixed(1)}%
                      </Typography>
                      <Chip
                        label={financialStats.profitMargin >= 30 ? 'Saludable' : 'Mejorar'}
                        color={financialStats.profitMargin >= 30 ? 'success' : 'warning'}
                        size="small"
                        sx={{ ml: 2 }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                      Crecimiento vs Período Anterior
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4">
                        {financialStats.revenueGrowth > 0 ? '+' : ''}
                        {financialStats.revenueGrowth.toFixed(1)}%
                      </Typography>
                      <TrendingUp
                        sx={{
                          ml: 2,
                          color: financialStats.revenueGrowth >= 0 ? 'success.main' : 'error.main',
                          transform:
                            financialStats.revenueGrowth < 0 ? 'rotate(180deg)' : 'none',
                        }}
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Distribución de Gastos
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={`Sueldos: ${financialStats.breakdown.salariesPercentage.toFixed(1)}%`}
                        size="small"
                        color="primary"
                      />
                      <Chip
                        label={`Comisiones: ${financialStats.breakdown.commissionsPercentage.toFixed(1)}%`}
                        size="small"
                        color="secondary"
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)}>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Empleado: <strong>{selectedEmployee.employeeName}</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                Período: <strong>{period === 'monthly' ? 'Mensual' : 'Semanal'}</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                Monto a pagar:{' '}
                <strong>{formatCurrency(selectedEmployee.totalToPay)}</strong>
              </Typography>
              
              <TextField
                fullWidth
                select
                label="Método de Pago"
                defaultValue="transfer"
                sx={{ mt: 3 }}
              >
                <MenuItem value="transfer">Transferencia</MenuItem>
                <MenuItem value="cash">Efectivo</MenuItem>
                <MenuItem value="check">Cheque</MenuItem>
              </TextField>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas (opcional)"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => selectedEmployee && handleMarkPaid(selectedEmployee)}
            sx={{ bgcolor: primaryColor }}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Payroll;