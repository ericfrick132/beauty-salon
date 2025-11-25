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
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from '@mui/material';
import { MoreVert, Add, Delete, Edit, Inventory, LocalOffer, Category } from '@mui/icons-material';
import { inventoryApi, productCategoryApi } from '../services/api';

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

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

type ProductForm = {
  id?: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
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
  categoryId: '',
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
  const [categoryFilter, setCategoryFilter] = useState('all');
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
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id?: string; name: string; description: string; displayOrder: number; isActive: boolean }>({
    id: undefined,
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

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

  const loadCategories = async (includeInactive = true) => {
    setCategoriesLoading(true);
    try {
      const data = await productCategoryApi.list(includeInactive);
      setCategories(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Error al cargar categorías' });
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    load(showInactive);
    loadCategories(true);
  }, [showInactive]);

  const filteredItems = useMemo(() => {
    const term = filter.toLowerCase();
    return items.filter(p => {
      const matches = p.name.toLowerCase().includes(term) || p.barcode.toString().includes(term) || (p.brand || '').toLowerCase().includes(term);
      const visible = showInactive ? true : p.isActive;
      const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      return matches && visible && matchesCategory;
    });
  }, [items, filter, showInactive, categoryFilter]);

  const selectProduct = (product: ProductDto) => {
    setForm({
      id: product.id,
      barcode: product.barcode.toString(),
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || '',
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

  const openCategoryDialog = (category?: ProductCategory) => {
    setCategoryForm({
      id: category?.id,
      name: category?.name || '',
      description: category?.description || '',
      displayOrder: category?.displayOrder || 0,
      isActive: category?.isActive ?? true,
    });
    setCategoryError(null);
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setCategoryForm({ id: undefined, name: '', description: '', displayOrder: 0, isActive: true });
    setCategoryError(null);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setCategoryError('El nombre es requerido');
      return;
    }

    setCategoryActionLoading(true);
    try {
      if (categoryForm.id) {
        await productCategoryApi.update(categoryForm.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description?.trim() || undefined,
          displayOrder: categoryForm.displayOrder,
          isActive: categoryForm.isActive,
        });
        setMessage({ type: 'success', text: 'Categoría actualizada' });
      } else {
        const created = await productCategoryApi.create({
          name: categoryForm.name.trim(),
          description: categoryForm.description?.trim() || undefined,
          displayOrder: categoryForm.displayOrder,
          isActive: categoryForm.isActive,
        });
        setMessage({ type: 'success', text: 'Categoría creada' });
        if (created?.id) {
          setForm(prev => ({ ...prev, categoryId: created.id }));
        }
      }
      await loadCategories(true);
      closeCategoryDialog();
    } catch (err: any) {
      const text = err?.response?.data?.error || 'No se pudo guardar la categoría';
      setCategoryError(text);
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setCategoryActionLoading(true);
    try {
      await productCategoryApi.remove(categoryToDelete.id);
      setMessage({ type: 'success', text: 'Categoría eliminada' });
      await loadCategories(true);
      if (form.categoryId === categoryToDelete.id) {
        setForm(prev => ({ ...prev, categoryId: '' }));
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'No se pudo eliminar la categoría' });
    } finally {
      setCategoryActionLoading(false);
      setCategoryToDelete(null);
    }
  };

  const activeCategories = useMemo(() => categories.filter(c => c.isActive), [categories]);

  const handleSubmit = async () => {
    const payload = {
      barcode: Number(form.barcode),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      categoryId: form.categoryId || null,
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
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por nombre o código"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Categoría"
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="all">Todas</MenuItem>
                    {categories.map(c => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name} {c.isActive ? '' : '(inactiva)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                      {p.categoryName && (
                        <Chip label={p.categoryName} size="small" variant="outlined" />
                      )}
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

          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category fontSize="small" />
                  <Typography variant="subtitle1">Categorías de productos</Typography>
                </Box>
                <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => openCategoryDialog()}>
                  Nueva categoría
                </Button>
              </Box>
              {categoriesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : categories.length === 0 ? (
                <Alert severity="info">No hay categorías creadas.</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {categories.map((cat) => (
                    <Box key={cat.id} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">{cat.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {cat.description || 'Sin descripción'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip size="small" label={cat.isActive ? 'Activa' : 'Inactiva'} color={cat.isActive ? 'success' : 'default'} />
                          <Chip size="small" label={`${cat.productCount ?? 0} productos`} variant="outlined" />
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openCategoryDialog(cat)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setCategoryToDelete(cat)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
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
                  <FormControl fullWidth>
                    <InputLabel>Categoría</InputLabel>
                    <Select
                      value={form.categoryId}
                      label="Categoría"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '__new__') {
                          openCategoryDialog();
                          return;
                        }
                        setForm({ ...form, categoryId: value });
                      }}
                    >
                      <MenuItem value="">Sin categoría</MenuItem>
                      {activeCategories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                      <MenuItem value="__new__">+ Nueva categoría</MenuItem>
                    </Select>
                  </FormControl>
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

      <Dialog
        open={categoryDialogOpen}
        onClose={() => {
          if (!categoryActionLoading) closeCategoryDialog();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{categoryForm.id ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              autoFocus
              disabled={categoryActionLoading}
            />
            <TextField
              label="Descripción (opcional)"
              multiline
              rows={2}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
              disabled={categoryActionLoading}
            />
            <TextField
              label="Orden"
              type="number"
              value={categoryForm.displayOrder}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
              disabled={categoryActionLoading}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  disabled={categoryActionLoading}
                />
              }
              label="Categoría activa"
            />
            {categoryError && <Alert severity="error">{categoryError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCategoryDialog} disabled={categoryActionLoading}>Cancelar</Button>
          <Button variant="contained" onClick={saveCategory} disabled={categoryActionLoading}>
            {categoryForm.id ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!categoryToDelete}
        onClose={() => {
          if (!categoryActionLoading) setCategoryToDelete(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Eliminar categoría</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro querés eliminar la categoría "{categoryToDelete?.name}"? Los productos no se borran, solo se quitará la categoría.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryToDelete(null)} disabled={categoryActionLoading}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDeleteCategory} disabled={categoryActionLoading}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

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
