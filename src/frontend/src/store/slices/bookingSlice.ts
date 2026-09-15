import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { Booking, Employee, Service } from '../../types';
import { bookingApi } from '../../services/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  totalBookings?: number;
  lastBooking?: string;
  notes?: string;
}

interface BookingState {
  bookings: Booking[];
  employees: Employee[];
  services: Service[];
  customers: Customer[];
  selectedBooking: Booking | null;
  loading: boolean;
  error: string | null;
  filters: {
    date?: string;
    employeeId?: string;
    status?: string;
  };
}

const initialState: BookingState = {
  bookings: [],
  employees: [],
  services: [],
  customers: [],
  selectedBooking: null,
  loading: false,
  error: null,
  filters: {},
};

export const fetchBookings = createAsyncThunk(
  'booking/fetchBookings',
  async (filters?: { date?: string; employeeId?: string; status?: string }) => {
    const bookings = await bookingApi.getBookings(filters);
    return bookings;
  }
);

export const fetchEmployees = createAsyncThunk(
  'booking/fetchEmployees',
  async () => {
    const employees = await bookingApi.getEmployees();
    return employees;
  }
);

export const fetchServices = createAsyncThunk(
  'booking/fetchServices',
  async () => {
    const services = await bookingApi.getServices();
    return services;
  }
);

export const fetchCustomers = createAsyncThunk(
  'booking/fetchCustomers',
  async () => {
    const customers = await bookingApi.getCustomers();
    // API returns firstName/lastName separately; map to combined name
    return customers.map((c: any) => ({
      ...c,
      name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
    }));
  }
);

// createAsyncThunk serializa a { name, message, stack } cualquier error no
// capturado (miniSerializeError), descartando error.response.data — o sea el
// mensaje real que devuelve el backend en un 400 (ej. "el profesional no
// realiza este servicio"). Sin rejectWithValue, .unwrap() solo puede tirar ese
// mensaje genérico de axios ("Request failed with status code 400"). Por eso
// atrapamos el error acá y pasamos el payload del backend explícitamente.
export const createBooking = createAsyncThunk(
  'booking/createBooking',
  async (bookingData: Partial<Booking>, { rejectWithValue }) => {
    try {
      const booking = await bookingApi.createBooking(bookingData);
      return booking;
    } catch (err) {
      const error = err as AxiosError;
      return rejectWithValue(error.response?.data ?? { message: error.message });
    }
  }
);

export const updateBooking = createAsyncThunk(
  'booking/updateBooking',
  async ({ id, updates }: { id: string; updates: Partial<Booking> }, { rejectWithValue }) => {
    try {
      const booking = await bookingApi.updateBooking(id, updates);
      return booking;
    } catch (err) {
      const error = err as AxiosError;
      return rejectWithValue(error.response?.data ?? { message: error.message });
    }
  }
);

export const deleteBooking = createAsyncThunk(
  'booking/deleteBooking',
  async (id: string, { rejectWithValue }) => {
    try {
      await bookingApi.deleteBooking(id);
      return id;
    } catch (err) {
      const error = err as AxiosError;
      return rejectWithValue(error.response?.data ?? { message: error.message });
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = action.payload;
    },
    setSelectedBooking: (state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    },
    clearBookings: (state) => {
      state.bookings = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch bookings
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch bookings';
      })
      // Fetch employees
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.employees = action.payload;
      })
      // Fetch services
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.services = action.payload;
      })
      // Fetch customers
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.customers = action.payload;
      })
      // Create booking
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.push(action.payload);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message?: string } | undefined;
        state.error = payload?.message || action.error.message || 'Failed to create booking';
      })
      // Update booking
      .addCase(updateBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message?: string } | undefined;
        state.error = payload?.message || action.error.message || 'Failed to update booking';
      })
      // Delete booking
      .addCase(deleteBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = state.bookings.filter(b => b.id !== action.payload);
      })
      .addCase(deleteBooking.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message?: string } | undefined;
        state.error = payload?.message || action.error.message || 'Failed to delete booking';
      });
  },
});

export const { 
  setFilters, 
  setSelectedBooking, 
  clearBookings, 
  clearError 
} = bookingSlice.actions;

export default bookingSlice.reducer;