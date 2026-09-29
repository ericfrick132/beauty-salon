import React, { useEffect, useState } from 'react';
import { Autocomplete, Box, IconButton, TextField, Typography } from '@mui/material';
import { Add, Delete, Remove, ShoppingBagOutlined } from '@mui/icons-material';
import { inventoryApi } from '../../services/api';

interface ProductOption {
  id: string;
  name: string;
  salePrice: number;
  currentStock: number;
  taxRate: number;
  trackInventory: boolean;
}

export interface ProductLine {
  productId: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  currentStock: number;
  trackInventory: boolean;
}

// Mismo cálculo que InventoryService.CreateSaleAsync (precio + IVA del producto)
export const productLinesTotal = (lines: ProductLine[]) =>
  lines.reduce((acc, l) => acc + l.unitPrice * l.quantity * (1 + (l.taxRate || 0) / 100), 0);

interface Props {
  value: ProductLine[];
  onChange: (lines: ProductLine[]) => void;
}

const ProductLinesPicker: React.FC<Props> = ({ value, onChange }) => {
  const [options, setOptions] = useState<ProductOption[]>([]);

  useEffect(() => {
    inventoryApi.getProducts(false).then(setOptions).catch(() => setOptions([]));
  }, []);

  const maxQty = (l: ProductLine) => (l.trackInventory ? l.currentStock : Infinity);

  const add = (p: ProductOption | null) => {
    if (!p) return;
    const existing = value.find((l) => l.productId === p.id);
    if (existing) {
      setQty(p.id, existing.quantity + 1);
      return;
    }
    if (p.trackInventory && p.currentStock <= 0) return;
    onChange([
      ...value,
      {
        productId: p.id,
        name: p.name,
        unitPrice: p.salePrice,
        taxRate: p.taxRate,
        quantity: 1,
        currentStock: p.currentStock,
        trackInventory: p.trackInventory,
      },
    ]);
  };

  const setQty = (productId: string, qty: number) => {
    onChange(
      value
        .map((l) => (l.productId === productId ? { ...l, quantity: Math.min(qty, maxQty(l)) } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  if (options.length === 0 && value.length === 0) return null;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <ShoppingBagOutlined fontSize="small" /> Sumar productos
      </Typography>
      <Autocomplete
        size="small"
        options={options}
        value={null}
        blurOnSelect
        onChange={(_, p) => add(p)}
        getOptionLabel={(o) => o.name}
        getOptionDisabled={(o) => o.trackInventory && o.currentStock <= 0}
        renderOption={(props, o) => (
          <li {...props} key={o.id}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
              <span>{o.name}</span>
              <Typography variant="body2" color="text.secondary">
                ${o.salePrice.toLocaleString()}
                {o.trackInventory && ` · stock ${o.currentStock}`}
              </Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => <TextField {...params} placeholder="Buscar producto..." />}
      />
      {value.map((l) => (
        <Box key={l.productId} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {l.name}
          </Typography>
          <IconButton size="small" onClick={() => setQty(l.productId, l.quantity - 1)}>
            <Remove fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
            {l.quantity}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setQty(l.productId, l.quantity + 1)}
            disabled={l.quantity >= maxQty(l)}
          >
            <Add fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right' }}>
            ${(l.unitPrice * l.quantity * (1 + (l.taxRate || 0) / 100)).toLocaleString()}
          </Typography>
          <IconButton size="small" onClick={() => setQty(l.productId, 0)}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      {value.length > 0 && (
        <Typography variant="body2" sx={{ textAlign: 'right', mt: 1, fontWeight: 600 }}>
          Productos: ${productLinesTotal(value).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

export default ProductLinesPicker;
