import { configureStore } from '@reduxjs/toolkit';
import bookingReducer, { createBooking, updateBooking, deleteBooking } from './bookingSlice';
import { bookingApi } from '../../services/api';

jest.mock('../../services/api', () => ({
  bookingApi: {
    createBooking: jest.fn(),
    updateBooking: jest.fn(),
    deleteBooking: jest.fn(),
  },
}));

const mockedBookingApi = bookingApi as jest.Mocked<typeof bookingApi>;

// Un error de axios "real": el backend respondió 400 con un mensaje útil en
// `response.data.message`, pero axios igual arma su propio `error.message`
// genérico ("Request failed with status code 400"). Antes del fix, ese
// mensaje genérico era el único que sobrevivía hasta la UI.
function makeAxiosError(status: number, data: any) {
  const error: any = new Error(`Request failed with status code ${status}`);
  error.isAxiosError = true;
  error.response = { status, data };
  return error;
}

const buildStore = () => configureStore({ reducer: { booking: bookingReducer } });

describe('bookingSlice async thunks — propagación de errores del backend', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('createBooking: unwrap() tira el mensaje real del backend, no el genérico de axios', async () => {
    mockedBookingApi.createBooking.mockRejectedValueOnce(
      makeAxiosError(400, { message: 'El profesional no realiza este servicio' })
    );

    const store = buildStore();

    await expect(
      store.dispatch(createBooking({ serviceId: 's1', employeeId: 'e1' }) as any).unwrap()
    ).rejects.toMatchObject({ message: 'El profesional no realiza este servicio' });
  });

  it('createBooking: state.error guarda el mensaje del backend, no "Request failed with status code 400"', async () => {
    mockedBookingApi.createBooking.mockRejectedValueOnce(
      makeAxiosError(400, { message: 'El profesional no realiza este servicio' })
    );

    const store = buildStore();
    await store.dispatch(createBooking({ serviceId: 's1', employeeId: 'e1' }) as any);

    const { error, loading } = store.getState().booking;
    expect(error).toBe('El profesional no realiza este servicio');
    expect(error).not.toMatch(/Request failed with status code/);
    expect(loading).toBe(false);
  });

  it('createBooking: soporta el formato ProblemDetails (errors: { Field: [msg] })', async () => {
    mockedBookingApi.createBooking.mockRejectedValueOnce(
      makeAxiosError(400, { errors: { StartTime: ['El horario ya está ocupado'] } })
    );

    const store = buildStore();
    await expect(
      store.dispatch(createBooking({ serviceId: 's1', employeeId: 'e1' }) as any).unwrap()
    ).rejects.toMatchObject({ errors: { StartTime: ['El horario ya está ocupado'] } });
  });

  it('createBooking: si no hay response (error de red), cae al mensaje de axios', async () => {
    const networkError: any = new Error('Network Error');
    networkError.isAxiosError = true;
    mockedBookingApi.createBooking.mockRejectedValueOnce(networkError);

    const store = buildStore();
    await expect(
      store.dispatch(createBooking({ serviceId: 's1', employeeId: 'e1' }) as any).unwrap()
    ).rejects.toMatchObject({ message: 'Network Error' });
  });

  it('createBooking: en éxito, agrega la reserva creada al estado', async () => {
    const booking = { id: 'b1', serviceId: 's1', employeeId: 'e1' };
    mockedBookingApi.createBooking.mockResolvedValueOnce(booking as any);

    const store = buildStore();
    await store.dispatch(createBooking({ serviceId: 's1', employeeId: 'e1' }) as any);

    const state = store.getState().booking;
    expect(state.bookings).toContainEqual(booking);
    expect(state.error).toBeNull();
  });

  it('updateBooking: propaga el mensaje real del backend en vez del genérico de axios', async () => {
    mockedBookingApi.updateBooking.mockRejectedValueOnce(
      makeAxiosError(400, { message: 'No se puede modificar una reserva completada' })
    );

    const store = buildStore();
    await expect(
      store.dispatch(updateBooking({ id: 'b1', updates: { status: 'cancelled' } }) as any).unwrap()
    ).rejects.toMatchObject({ message: 'No se puede modificar una reserva completada' });
  });

  it('deleteBooking: propaga el mensaje real del backend en vez del genérico de axios', async () => {
    mockedBookingApi.deleteBooking.mockRejectedValueOnce(
      makeAxiosError(400, { message: 'No se puede eliminar una reserva con pago registrado' })
    );

    const store = buildStore();
    await expect(
      store.dispatch(deleteBooking('b1') as any).unwrap()
    ).rejects.toMatchObject({ message: 'No se puede eliminar una reserva con pago registrado' });
  });
});
