import api from './api';

export interface PlatformWhatsAppStatus {
  status: string; // disconnected, connecting, open, close
  connectedPhone?: string;
  profileName?: string;
  instanceName?: string;
  connectedAt?: string;
}

export interface PlatformWhatsAppConnectResult {
  success: boolean;
  qrCodeBase64?: string;
  status?: string;
  error?: string;
}

/**
 * Manages the platform-level WhatsApp connection — the number that sends the
 * signup/login OTP codes. Talks to the super-admin endpoints.
 */
class PlatformWhatsappService {
  async getStatus(): Promise<PlatformWhatsAppStatus> {
    const res = await api.get('/super-admin/whatsapp/status');
    return res.data.data;
  }

  async connect(): Promise<PlatformWhatsAppConnectResult> {
    const res = await api.post('/super-admin/whatsapp/connect');
    return res.data.data;
  }

  async refreshQr(): Promise<PlatformWhatsAppConnectResult> {
    const res = await api.post('/super-admin/whatsapp/refresh-qr');
    return res.data.data;
  }

  async disconnect(): Promise<{ success: boolean; message?: string }> {
    const res = await api.post('/super-admin/whatsapp/disconnect');
    return res.data;
  }
}

export const platformWhatsappService = new PlatformWhatsappService();
