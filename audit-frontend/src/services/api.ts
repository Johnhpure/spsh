import axiosInstance from '../utils/axios';
import type { AxiosResponse } from 'axios';

// 类型定义
export interface AuditRecord {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  submitTime: string;
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
  createdAt: string;
  updatedAt?: string;
  username?: string;
}

export interface QueryFilters {
  productId?: string;
  stage?: 'text' | 'image' | 'business_scope';
  startDate?: string;
  endDate?: string;
  keyword?: string;
  username?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  records: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Statistics {
  totalFailures: number;
  byStage: Record<string, number>;
  byReason: Record<string, number>;
  byAuditor: Record<string, number>;
  trend: Array<{ date: string; count: number }>;
  avgProcessingTime: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: any;
}

// API接口类
class AuditRecordAPI {
  /**
   * 创建审核记录
   */
  async createRecord(record: Omit<AuditRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditRecord> {
    const response: AxiosResponse<ApiResponse<AuditRecord>> = await axiosInstance.post(
      '/audit-records',
      record
    );
    return response.data.data;
  }

  /**
   * 查询审核记录列表
   */
  async getRecords(
    filters?: QueryFilters,
    pagination?: Pagination
  ): Promise<PaginatedResult<AuditRecord>> {
    const params = {
      ...filters,
      ...pagination
    };

    const response: AxiosResponse<ApiResponse<PaginatedResult<AuditRecord>>> = await axiosInstance.get(
      '/audit-records',
      { params }
    );
    return response.data.data;
  }

  /**
   * 根据ID获取单条审核记录
   */
  async getRecordById(id: string): Promise<AuditRecord> {
    const response: AxiosResponse<ApiResponse<AuditRecord>> = await axiosInstance.get(
      `/audit-records/${id}`
    );
    return response.data.data;
  }

  /**
   * 获取统计数据
   */
  async getStatistics(startDate?: string, endDate?: string): Promise<Statistics> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response: AxiosResponse<ApiResponse<Statistics>> = await axiosInstance.get(
      '/audit-records/statistics',
      { params }
    );
    return response.data.data;
  }

  /**
   * 导出审核记录为CSV
   */
  async exportRecords(filters?: QueryFilters): Promise<Blob> {
    const params = { ...filters, format: 'csv' };

    const response: AxiosResponse<Blob> = await axiosInstance.get(
      '/audit-records/export',
      {
        params,
        responseType: 'blob'
      }
    );
    return response.data;
  }
}

// 导出API实例
export const auditRecordAPI = new AuditRecordAPI();
