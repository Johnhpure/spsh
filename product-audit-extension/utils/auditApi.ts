import { storage } from 'wxt/storage';

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
}

interface ApiConfig {
  url: string;
  key?: string;
}

class AuditApiClient {
  private async getConfig(): Promise<ApiConfig> {
    const config = await storage.getItem<ApiConfig>('local:audit_api_config');
    return config || { url: 'http://localhost:3000/api' };
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storage.getItem<string>('local:auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async createRecord(record: AuditRecord, retryCount = 1): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig();
    const authHeaders = await this.getAuthHeaders();

    // Get current user info to attach if not present
    const userInfo = await storage.getItem<any>('local:user_info');
    if (userInfo && !record.userId) {
      record.userId = userInfo.id;
      record.username = userInfo.username;
    }

    const endpoint = `${config.url}/audit-records`;

    // Prepare the request body
    const requestBody = {
      ...record,
      submitTime: record.submitTime.toISOString()
    };

    let lastError: string = '';

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        console.log(`[AuditAPI] Sending record for product ${record.productId} (attempt ${attempt + 1}/${retryCount + 1})`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.key ? { 'X-API-Key': config.key } : {}),
            ...authHeaders
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[AuditAPI] Successfully created record for product ${record.productId}`, result);
          return { success: true };
        } else {
          const errorText = await response.text();
          lastError = `HTTP ${response.status}: ${errorText}`;
          console.error(`[AuditAPI] Failed to create record (attempt ${attempt + 1}):`, lastError);

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            break;
          }
        }
      } catch (error) {
        lastError = String(error);
        console.error(`[AuditAPI] Request failed (attempt ${attempt + 1}):`, error);
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
}

export const auditRecordAPI = new AuditApiClient();
