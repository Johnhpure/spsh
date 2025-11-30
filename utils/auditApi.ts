import { storage } from 'wxt/storage';
import { getAuthToken } from './auth';

interface AuditRecordData {
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
}

interface ApiConfig {
  apiUrl: string;
}

class AuditApiClient {
  private async getConfig(): Promise<ApiConfig | null> {
    try {
      const stored = await storage.getItem<{ apiUrl: string }>('local:audit_api_config');
      
      // Fallback to environment variables if not in storage
      const apiUrl = stored?.apiUrl || import.meta.env.VITE_API_URL;
      
      if (!apiUrl) {
        console.warn('[AuditAPI] API URL is missing');
        return null;
      }
      
      return { apiUrl };
    } catch (error) {
      console.error('[AuditAPI] Failed to get config:', error);
      return null;
    }
  }

  async createRecord(data: AuditRecordData, retryCount = 1): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig();
    
    if (!config) {
      console.warn('[AuditAPI] Skipping API call - configuration missing');
      return { success: false, error: 'API configuration missing' };
    }

    const token = await getAuthToken();
    if (!token) {
      console.warn('[AuditAPI] No authentication token found');
      return { success: false, error: 'Authentication required' };
    }

    const endpoint = `${config.apiUrl}/api/audit-records`;
    
    // Prepare the request body
    const requestBody = {
      productId: data.productId,
      productTitle: data.productTitle,
      productImage: data.productImage,
      submitTime: data.submitTime.toISOString(),
      aiProcessingTime: data.aiProcessingTime,
      rejectionReason: data.rejectionReason,
      auditStage: data.auditStage,
      apiError: data.apiError,
      textRequest: data.textRequest,
      textResponse: data.textResponse,
      imageRequest: data.imageRequest,
      imageResponse: data.imageResponse,
      scopeRequest: data.scopeRequest,
      scopeResponse: data.scopeResponse
    };

    let lastError: string = '';

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        console.log(`[AuditAPI] Sending record for product ${data.productId} (attempt ${attempt + 1}/${retryCount + 1})`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[AuditAPI] Successfully created record for product ${data.productId}`, result);
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

    console.error(`[AuditAPI] All attempts failed for product ${data.productId}:`, lastError);
    return { success: false, error: lastError };
  }
}

export const auditApi = new AuditApiClient();
