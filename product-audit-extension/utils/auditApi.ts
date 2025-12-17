import { storage } from 'wxt/storage';
import { browser } from 'wxt/browser';

export interface AuditRecord {
  productId: string;
  productTitle: string;
  productImage: string;
  submitTime: Date;
  aiProcessingTime: number;
  rejectionReason: string;
  auditStage: 'text' | 'image' | 'business_scope';
  apiError?: string;
  textRequest?: string;
  textResponse?: string;
  imageRequest?: string;
  imageResponse?: string;
  scopeRequest?: string;
  scopeResponse?: string;
  userId?: string;
  username?: string;
  // Manual Audit Fields
  manualStatus?: 'pending' | 'approved' | 'rejected';
  price?: number;
  shopName?: string;
  shopId?: string;
  categoryName?: string;
  categoryImage?: string;
  images?: string;
  auditReason?: string;
  categoryAuditStatus?: string;
  categoryAuditReason?: string;
}

export interface ApiConfig {
  url: string;
  key?: string;
}

class AuditApiClient {
  private async getConfig(): Promise<ApiConfig> {
    const config = await storage.getItem<ApiConfig>('local:audit_api_config');
    return config || { url: 'http://192.168.1.8:3002/api' };
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storage.getItem<string>('local:auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = await this.getConfig();
    const authHeaders = await this.getAuthHeaders();

    const url = `${config.url}${endpoint}`;

    const finalOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(config.key ? { 'X-API-Key': config.key } : {}),
        ...authHeaders,
        ...options.headers,
      },
    };

    try {
      // Use Background Proxy via WXT/Browser API
      const response = await browser.runtime.sendMessage({
        type: 'API_REQUEST',
        payload: {
          url,
          options: finalOptions
        }
      }) as { success: boolean; data?: any; error?: string };

      if (!response.success) {
        throw new Error(`${response.error || 'Unknown background error'} (URL: ${url})`);
      }

      return response.data;
    } catch (e) {
      console.error(`[AuditAPI] Request to ${endpoint} failed:`, e);
      const msg = String(e);
      if (!msg.includes(url)) {
        throw new Error(`${msg} (URL: ${url})`);
      }
      throw e;
    }
  }

  async createRecord(record: AuditRecord, retryCount = 1): Promise<{ success: boolean; error?: string }> {
    // Get current user info to attach if not present
    const userInfo = await storage.getItem<any>('local:user_info');
    if (userInfo && !record.userId) {
      record.userId = userInfo.id;
      record.username = userInfo.username;
    }

    const requestBody = {
      ...record,
      submitTime: record.submitTime.toISOString()
    };

    let lastError: string = '';

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        console.log(`[AuditAPI] Sending record for product ${record.productId} (attempt ${attempt + 1}/${retryCount + 1})`);

        const result = await this.request('/audit-records', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        console.log(`[AuditAPI] Successfully created record for product ${record.productId}`, result);
        return { success: true };

      } catch (error) {
        lastError = String(error);
        console.error(`[AuditAPI] Request failed (attempt ${attempt + 1}):`, error);

        // If it's a client error (e.g. 400), don't retry? 
        // The background script returns generic error strings for HTTP errors, so hard to distinguish status codes easily 
        // unless we parse the error string "HTTP 4xx".
        if (lastError.includes('HTTP 4')) {
          break;
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < retryCount) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[AuditAPI] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error(`[AuditAPI] All attempts failed for product ${record.productId}:`, lastError);
    return { success: false, error: lastError };
  }

  async login(credentials: { username: string; password: string }): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    try {
      const result = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (result.success) {
        return { success: true, token: result.token, user: result.user };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getStatistics(startDate?: Date, endDate?: Date): Promise<{ success: boolean; data?: any; error?: string }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    const queryString = params.toString();
    const endpoint = `/audit-records/statistics${queryString ? '?' + queryString : ''}`;

    try {
      const result = await this.request(endpoint, {
        method: 'GET'
      });
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getSystemSettings(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.request('/settings', {
        method: 'GET'
      });
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async checkProductExists(productId: string): Promise<boolean> {
    const url = `/audit-records?productId=${productId}&limit=1`;
    console.log(`[AuditAPI] Checking existence for ${productId} via ${url}`);

    const result = await this.request(url, {
      method: 'GET'
    });

    console.log(`[AuditAPI] Check result for ${productId}:`, JSON.stringify(result));

    const exists = result.success && result.data && result.data.records && result.data.records.length > 0;
    console.log(`[AuditAPI] Exists? ${exists}`);

    return exists;
  }

  async addManualAuditProduct(product: any): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.request('/manual-audit/add', {
        method: 'POST',
        body: JSON.stringify(product)
      });
      return { success: true };
    } catch (error) {
      console.error('[AuditAPI] Failed to add manual audit product:', error);
      return { success: false, error: String(error) };
    }
  }
}

export const auditRecordAPI = new AuditApiClient();
