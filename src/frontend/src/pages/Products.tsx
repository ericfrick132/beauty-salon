import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  InputAdornment,
  Tooltip,
  Stack,
} from '@mui/material';
import { MoreVert, Add, Delete, Edit, Inventory, LocalOffer } from '@mui/icons-material';
import { inventoryApi } from '../services/api';

interface ProductDto {
  id: string;
  barcode: number;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  sku?: string;
  brand?: string;
  unit?: string;
  weight?: number;
  location?: string;
  taxRate: number;
  allowDiscount: boolean;
  maxDiscountPercentage?: number;
  isActive: boolean;
  trackInventory: boolean;
}

type ProductForm = {
  id?: string;
  barcode: string;
  name: string;
  description: string;
  costPrice: string;
  salePrice: string;
  initialStock: string;
  minStock: string;
  maxStock: string;
  sku: string;
  brand: string;
  unit: string;
  weight: string;
  location: string;
  taxRate: string;
  allowDiscount: boolean;
  maxDiscountPercentage: string;
  trackInventory: boolean;
  isActive: boolean;
};

const emptyForm: ProductForm = {
  barcode: '',
  name: '',
  description: '',
  costPrice: '',
  salePrice: '',
  initialStock: '0',
  minStock: '0',
  maxStock: '0',
  sku: '',
  brand: '',
  unit: '',
  weight: '',
  location: '',
  taxRate: '0',
  allowDiscount: true,
  maxDiscountPercentage: '',
  trackInventory: true,
  isActive: true,
};

const Products: React.FC = () => {
  const [items, setItems] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductDto | null>(null);
  const [stockDialog, setStockDialog] = useState<{ open: boolean; product: ProductDto | null; qty: string; reason: string; movement: 'In' | 'Out' | 'Adjustment' }>({
    open: false,
    product: null,
    qty: '',
    reason: '',
    movement: 'In',
  });

  const isEditing = Boolean(form.id);

  const load = async (includeInactive = false) => {
    setLoading(true);
    try {
      const resp = await inventoryApi.getProducts(includeInactive);
      setItems(resp);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Error al cargar productos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(showInactive);
  }, [showInactive]);

  const filteredItems = useMemo(() => {
    const term = filter.toLowerCase();
    return items.filter(p => {
      const matches = p.name.toLowerCase().includes(term) || p.barcode.toString().includes(term) || (p.brand || '').toLowerCase().includes(term);
      const visible = showInactive ? true : p.isActive;
      return matches && visible;
    });
  }, [items, filter, showInactive]);

  const selectProduct = (product: ProductDto) => {
    setForm({
      id: product.id,
      barcode: product.barcode.toString(),
      name: product.name,
      description: product.description || '',
      costPrice: product.costPrice.toString(),
      salePrice: product.salePrice.toString(),
      initialStock: '0',
      minStock: product.minStock?.toString() || '0',
      maxStock: product.maxStock?.toString() || '0',
      sku: product.sku || '',
      brand: product.brand || '',
      unit: product.unit || '',
      weight: product.weight?.toString() || '',
      location: product.location || '',
      taxRate: product.taxRate?.toString() || '0',
      allowDiscount: product.allowDiscount,
      maxDiscountPercentage: product.maxDiscountPercentage?.toString() || '',
      trackInventory: product.trackInventory,
      isActive: product.isActive,
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    const payload = {
      barcode: Number(form.barcode),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      costPrice: Number(form.costPrice),
      salePrice: Number(form.salePrice),
      minStock: Number(form.minStock || '0'),
      maxStock: Number(form.maxStock || '0'),
      sku: form.sku.trim() || undefined,
      brand: form.brand.trim() || undefined,
      unit: form.unit.trim() || undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      location: form.location.trim() || undefined,
      taxRate: Number(form.taxRate || '0'),
      allowDiscount: form.allowDiscount,
      maxDiscountPercentage: form.allowDiscount && form.maxDiscountPercentage
        ? Number(form.maxDiscountPercentage)
        : undefined,
      trackInventory: form.trackInventory,
      isActive: form.isActive,
    };

    if (!payload.barcode || !payload.name || payload.costPrice < 0 || payload.salePrice <= 0) {
      setMessage({ type: 'error', text: 'Completa nombre, código, costo y venta con valores válidos' });
      return;
    }

    setLoading(true);
    try {
      if (isEditing && form.id) {
        await inventoryApi.updateProduct(form.id, payload);
        setMessage({ type: 'success', text: 'Producto actualizado' });
      } else {
        const createPayload = { ...payload, initialStock: Number(form.initialStock || '0') };
        await inventoryApi.createProduct(createPayload);
        setMessage({ type: 'success', text: 'Producto creado' });
      }
      await load(showInactive);
      resetForm();
    } catch (err: any) {
      const text = err?.response?.data?.error || 'No se pudo guardar el producto';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await inventoryApi.deleteProduct(deleteTarget.id);
      setMessage({ type: 'success', text: 'Producto eliminado' });
      await load(showInactive);
      if (form.id === deleteTarget.id) resetForm();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'No se pudo eliminar' });
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  const saveStock = async () => {
    if (!stockDialog.product) return;
    const qty = Number(stockDialog.qty);
    if (!qty || isNaN(qty)) {
      setMessage({ type: 'error', text: 'Cantidad inválida' });
      return;
    }
    setLoading(true);
    try {
      await inventoryApi.updateStock(stockDialog.product.id, {
        quantity: qty,
        movementType: stockDialog.movement,
        reason: stockDialog.reason || undefined,
      });
      setMessage({ type: 'success', text: 'Stock actualizado' });
      await load(showInactive);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'No se pudo actualizar el stock' });
    } finally {
      setLoading(false);
      setStockDialog({ open: false, product: null, qty: '', reason: '', movement: 'In' });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory /> Gestión de Productos
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={resetForm}>
          Nuevo producto
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por nombre o código"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <FormControlLabel
                  control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
                  label="Ver inactivos"
                />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Venta</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((p) => (
                    <TableRow key={p.id} hover selected={form.id === p.id}>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary">#{p.barcode}</Typography>
                          <Stack direction="row" spacing={0.5}>
                            <Chip
                              label={p.isActive ? 'Activo' : 'Inactivo'}
                              size="small"
                              color={p.isActive ? 'success' : 'default'}
                            />
                            {p.trackInventory && p.currentStock <= p.minStock ? (
                              <Chip label="Bajo stock" size="small" color="warning" />
                            ) : null}
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{p.trackInventory ? p.currentStock : '—'}</TableCell>
                      <TableCell align="right">${p.salePrice.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={(e) => setMenuAnchor({ id: p.id, anchor: e.currentTarget })}>
                          <MoreVert />
                        </IconButton>
                        <Menu
                          anchorEl={menuAnchor?.anchor}
                          open={menuAnchor?.id === p.id}
                          onClose={() => setMenuAnchor(null)}
                        >
                          <MenuItem
                            onClick={() => {
                              selectProduct(p);
                              setMenuAnchor(null);
                            }}
                          >
                            <Edit fontSize="small" style={{ marginRight: 8 }} /> Editar
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              setStockDialog({ open: true, product: p, qty: '', reason: '', movement: 'In' });
                              setMenuAnchor(null);
                            }}
                          >
                            <LocalOffer fontSize="small" style={{ marginRight: 8 }} /> Ajustar stock
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              setDeleteTarget(p);
                              setMenuAnchor(null);
                            }}
                          >
                            <Delete fontSize="small" style={{ marginRight: 8 }} /> Eliminar
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary" align="center">
                          No hay productos para mostrar
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{isEditing ? 'Editar producto' : 'Nuevo producto'}</Typography>
                {isEditing && (
                  <Button size="small" onClick={resetForm}>Limpiar</Button>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Código de barras"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value.replace(/[^0-9]/g, '') })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descripción"
                    multiline
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Precio de costo"
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Precio de venta"
                    type="number"
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                </Grid>
                {!isEditing && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Stock inicial"
                      type="number"
                      value={form.initialStock}
                      onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                      disabled={!form.trackInventory}
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Stock mínimo"
                    type="number"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    disabled={!form.trackInventory}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Stock máximo"
                    type="number"
                    value={form.maxStock}
                    onChange={(e) => setForm({ ...form, maxStock: e.target.value })}
                    disabled={!form.trackInventory}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SKU"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Marca"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Unidad"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Peso"
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ubicación"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Impuesto (%)"
                    type="number"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.allowDiscount}
                        onChange={(e) => setForm({ ...form, allowDiscount: e.target.checked })}
                      />
                    }
                    label="Permitir descuentos"
                  />
                </Grid>
                {form.allowDiscount && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Descuento máximo (%)"
                      type="number"
                      value={form.maxDiscountPercentage}
                      onChange={(e) => setForm({ ...form, maxDiscountPercentage: e.target.value })}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.trackInventory}
                        onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                      />
                    }
                    label="Controlar inventario"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      />
                    }
                    label="Producto activo"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                    <Button onClick={resetForm} disabled={loading}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                      {isEditing ? 'Guardar cambios' : 'Crear producto'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminar producto</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro querés eliminar "{deleteTarget?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={loading}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={loading}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={stockDialog.open} onClose={() => setStockDialog({ open: false, product: null, qty: '', reason: '', movement: 'In' })} maxWidth="xs" fullWidth>
        <DialogTitle>Ajustar stock</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {stockDialog.product?.name} (stock actual: {stockDialog.product?.currentStock})
          </Typography>
          <TextField
            label="Cantidad"
            type="number"
            fullWidth
            value={stockDialog.qty}
            onChange={(e) => setStockDialog(prev => ({ ...prev, qty: e.target.value }))}
            sx={{ mt: 1 }}
          />
          <TextField
            label="Motivo (opcional)"
            fullWidth
            value={stockDialog.reason}
            onChange={(e) => setStockDialog(prev => ({ ...prev, reason: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant={stockDialog.movement === 'In' ? 'contained' : 'outlined'}
              onClick={() => setStockDialog(prev => ({ ...prev, movement: 'In' }))}
            >
              Entrada
            </Button>
            <Button
              variant={stockDialog.movement === 'Out' ? 'contained' : 'outlined'}
              onClick={() => setStockDialog(prev => ({ ...prev, movement: 'Out' }))}
            >
              Salida
            </Button>
            <Tooltip title="Ajuste directo al stock (usa cantidad exacta)">
              <Button
                variant={stockDialog.movement === 'Adjustment' ? 'contained' : 'outlined'}
                onClick={() => setStockDialog(prev => ({ ...prev, movement: 'Adjustment' }))}
              >
                Ajuste
              </Button>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog({ open: false, product: null, qty: '', reason: '', movement: 'In' })} disabled={loading}>Cancelar</Button>
          <Button variant="contained" onClick={saveStock} disabled={loading}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Products;
