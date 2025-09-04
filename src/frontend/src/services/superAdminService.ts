import api from './api';

export interface ImpersonationResult {
  token: string;
  tenantName: string;
  tenantSubdomain: string;
  adminEmail: string;
  adminName: string;
  redirectUrl: string;
}

export interface SuperAdminTenantListDto {
  id: string;
  businessName: string;
  subdomain: string;
  vertical: string;
  isActive: boolean;
  createdAt: string;
  adminCount: number;
  bookingCount: number;
  lastActivity?: string;
}

export class SuperAdminService {
  async impersonateTenant(tenantId: string): Promise<ImpersonationResult> {
    try {
      const response = await api.post(`/super-admin/tenants/${tenantId}/impersonate`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error al impersonar tenant');
    } catch (error: any) {
      console.error('Error impersonating tenant:', error);
      throw new Error(error.response?.data?.message || 'Error al impersonar tenant');
    }
  }

  async getTenantsForImpersonation(): Promise<SuperAdminTenantListDto[]> {
    try {
      const response = await api.get('/super-admin/tenants/list');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error al obtener la lista de tenants');
    } catch (error: any) {
      console.error('Error fetching tenants for impersonation:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener la lista de tenants');
    }
  }

  /**
   * Handles the complete impersonation flow
   */
  async handleImpersonateFlow(tenantId: string, tenantSubdomain: string): Promise<void> {
    try {
      // 1. Get impersonation token
      const impersonationData = await this.impersonateTenant(tenantId);

      // 2. Save current super admin token for return functionality
      const currentSuperAdminToken = localStorage.getItem('superAdminToken');
      if (currentSuperAdminToken) {
        sessionStorage.setItem('originalSuperAdminToken', currentSuperAdminToken);
      }

      // 3. Save impersonation context
      sessionStorage.setItem('impersonationContext', JSON.stringify({
        tenantId,
        tenantName: impersonationData.tenantName,
        adminEmail: impersonationData.adminEmail,
        adminName: impersonationData.adminName,
        impersonatedAt: new Date().toISOString()
      }));

      // 4. Redirect to tenant subdomain with impersonation token  
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const domain = isLocalDev ? 'localhost:3001' : 'turnos-pro.com';
      const redirectUrl = `https://${tenantSubdomain}.${domain}/dashboard?impersonationToken=${impersonationData.token}`;
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error in impersonation flow:', error);
      throw error;
    }
  }

  /**
   * Returns to super admin from impersonation
   */
  stopImpersonation(): void {
    try {
      // 1. Restore original super admin token
      const originalToken = sessionStorage.getItem('originalSuperAdminToken');
      if (originalToken) {
        localStorage.setItem('superAdminToken', originalToken);
      }

      // 2. Clean up impersonation data
      sessionStorage.removeItem('originalSuperAdminToken');
      sessionStorage.removeItem('impersonationContext');
      localStorage.removeItem('authToken'); // Remove impersonation token

      // 3. Redirect back to super admin
      const isLocalDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      const baseUrl = isLocalDev ? 'http://localhost:3001' : 'https://turnos-pro.com';
      window.location.href = `${baseUrl}/super-admin/dashboard`;
    } catch (error) {
      console.error('Error stopping impersonation:', error);
      // Force redirect anyway
      const isLocalDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      const baseUrl = isLocalDev ? 'http://localhost:3001' : 'https://turnos-pro.com';
      window.location.href = `${baseUrl}/super-admin/dashboard`;
    }
  }

  /**
   * Gets current impersonation context if available
   */
  getImpersonationContext(): any {
    try {
      const context = sessionStorage.getItem('impersonationContext');
      return context ? JSON.parse(context) : null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if currently in impersonation mode
   */
  isImpersonating(): boolean {
    const context = this.getImpersonationContext();
    const hasOriginalToken = sessionStorage.getItem('originalSuperAdminToken');
    return !!(context && hasOriginalToken);
  }
}

export const superAdminService = new SuperAdminService();