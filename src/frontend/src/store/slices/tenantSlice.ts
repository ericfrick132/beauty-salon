import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TenantConfig } from '../../types';
import { tenantApi } from '../../services/api';

interface TenantState {
  config: TenantConfig | null;
  loading: boolean;
  error: string | null;
}

const initialState: TenantState = {
  config: null,
  loading: false,
  error: null,
};

export const fetchTenantConfig = createAsyncThunk(
  'tenant/fetchConfig',
  async () => {
    const config = await tenantApi.getConfig();
    return config;
  }
);

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    clearTenant: (state) => {
      state.config = null;
      state.error = null;
    },
    setTenantConfig: (state, action: PayloadAction<TenantConfig>) => {
      state.config = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.config = action.payload;
      })
      .addCase(fetchTenantConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tenant config';
      });
  },
});

export const { clearTenant, setTenantConfig } = tenantSlice.actions;
export default tenantSlice.reducer;