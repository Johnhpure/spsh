/**
 * 审核记录数据模型
 */

export type AuditStage = 'text' | 'image' | 'business_scope';

/**
 * 审核记录接口
 */
export interface AuditRecord {
  id?: string;
  productId: string;
  productTitle: string;
  productImage: string;
  submitTime: Date;
  aiProcessingTime: number; // 毫秒
  rejectionReason: string;
  auditStage: AuditStage;
  apiError?: string;
  textRequest?: string;
  textResponse?: string;
  imageRequest?: string;
  imageResponse?: string;
  scopeRequest?: string;
  scopeResponse?: string;
  userId?: string;
  username?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 查询筛选器
 */
export interface QueryFilters {
  productId?: string;
  stage?: AuditStage;
  startDate?: Date;
  endDate?: Date;
  keyword?: string;
}

/**
 * 分页参数
 */
export interface Pagination {
  page: number;
  limit: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  records: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 时间范围
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * 统计数据
 */
export interface Statistics {
  totalFailures: number;
  byStage: Record<string, number>;
  byReason: Record<string, number>;
  trend: Array<{ date: string; count: number }>;
  avgProcessingTime: number;
}

/**
 * 数据库行类型（从数据库查询返回的原始数据）
 */
export interface AuditRecordRow {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string;
  submit_time: Date;
  ai_processing_time: number;
  rejection_reason: string;
  audit_stage: AuditStage;
  api_error?: string;
  text_request?: string;
  text_response?: string;
  image_request?: string;
  image_response?: string;
  scope_request?: string;
  scope_response?: string;
  user_id?: string;
  username?: string;
  created_at: Date;
  updated_at: Date;
}
