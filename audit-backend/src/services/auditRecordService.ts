import { randomUUID } from 'crypto';
import { databaseManager } from '../utils/database';
import { cacheManager } from '../utils/cache';
import {
  AuditRecord,
  AuditRecordRow,
  QueryFilters,
  Pagination,
  PaginatedResult,
  TimeRange,
  Statistics,
} from '../models/auditRecord';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * 审核记录服务类
 */
class AuditRecordService {
  /**
   * 创建审核记录
   * 生成UUID，插入记录到数据库，返回完整记录
   */
  async create(record: AuditRecord): Promise<AuditRecord> {
    const id = randomUUID();

    const sql = `
      INSERT INTO audit_records (
        id, product_id, product_title, product_image, submit_time,
        ai_processing_time, rejection_reason, audit_stage, api_error,
        text_request, text_response, image_request, image_response,
        scope_request, scope_response, user_id, username,
        manual_status, price, shop_name, shop_id, category_name, category_image, images, audit_reason,
        category_audit_status, category_audit_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      record.productId,
      record.productTitle,
      record.productImage,
      record.submitTime,
      record.aiProcessingTime,
      record.rejectionReason,
      record.auditStage,
      record.apiError || null,
      record.textRequest || null,
      record.textResponse || null,
      record.imageRequest || null,
      record.imageResponse || null,
      record.scopeRequest || null,
      record.scopeResponse || null,
      record.userId || null,
      record.username || null,
      record.manualStatus || null,
      record.price || null,
      record.shopName || null,
      record.shopId || null,
      record.categoryName || null,
      record.categoryImage || null,
      record.images || null,
      record.auditReason || null,
      record.categoryAuditStatus || null,
      record.categoryAuditReason || null
    ];

    await databaseManager.query<ResultSetHeader>(sql, params);

    // 清除统计数据缓存，确保数据一致性
    this.clearStatisticsCache();

    // 查询并返回完整记录
    const createdRecord = await this.findById(id);
    if (!createdRecord) {
      throw new Error('Failed to retrieve created record');
    }

    return createdRecord;
  }

  /**
   * 根据ID查询单条记录
   */
  async findById(id: string): Promise<AuditRecord | null> {
    const sql = 'SELECT * FROM audit_records WHERE id = ?';
    const rows = await databaseManager.query<(AuditRecordRow & RowDataPacket)[]>(sql, [id]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToRecord(rows[0]);
  }

  /**
   * 查询所有记录，支持筛选和分页
   */
  async findAll(
    filters: QueryFilters = {},
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<AuditRecord>> {
    // 构建WHERE子句
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.productId) {
      whereClauses.push('product_id = ?');
      params.push(filters.productId);
    }

    if (filters.stage) {
      whereClauses.push('audit_stage = ?');
      params.push(filters.stage);
    }

    if (filters.startDate) {
      whereClauses.push('submit_time >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClauses.push('submit_time <= ?');
      params.push(filters.endDate);
    }

    if (filters.keyword) {
      whereClauses.push('MATCH(rejection_reason) AGAINST(? IN NATURAL LANGUAGE MODE)');
      params.push(filters.keyword);
    }

    if (filters.username) {
      whereClauses.push('username LIKE ?');
      params.push(`%${filters.username}%`);
    }

    if (filters.manualStatus) {
      whereClauses.push('manual_status = ?');
      params.push(filters.manualStatus);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM audit_records ${whereClause}`;
    const countResult = await databaseManager.query<(RowDataPacket & { total: number })[]>(
      countSql,
      params
    );
    const total = countResult[0].total;
    console.log(`[AuditRecordService] findAll query: ${JSON.stringify(filters)}, Total found: ${total}`);

    // 计算分页
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;

    // 查询记录
    const recordsSql = `
      SELECT * FROM audit_records 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const recordsParams = [...params, pagination.limit, offset];
    const rows = await databaseManager.query<(AuditRecordRow & RowDataPacket)[]>(
      recordsSql,
      recordsParams
    );

    const records = rows.map(row => this.mapRowToRecord(row));

    return {
      records,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 获取统计数据
   * 计算总数、按阶段分组、按原因分组、时间趋势、平均处理时间
   * 使用缓存优化性能
   */
  async getStatistics(timeRange?: TimeRange): Promise<Statistics> {
    // 生成缓存键
    const cacheKey = this.generateStatisticsCacheKey(timeRange);

    // 尝试从缓存获取
    const cachedStats = cacheManager.get<Statistics>(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    // 缓存未命中，执行数据库查询
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (timeRange) {
      whereClauses.push('submit_time >= ?');
      params.push(timeRange.startDate);
      whereClauses.push('submit_time <= ?');
      params.push(timeRange.endDate);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 使用单个优化的查询获取所有统计数据
    const combinedSql = `
      SELECT 
        COUNT(*) as total,
        AVG(ai_processing_time) as avg_time
      FROM audit_records 
      ${whereClause}
    `;
    const combinedResult = await databaseManager.query<
      (RowDataPacket & { total: number; avg_time: number | null })[]
    >(combinedSql, params);
    const totalFailures = combinedResult[0].total;
    const avgProcessingTime = combinedResult[0].avg_time || 0;

    // 按审核阶段分组（使用 COUNT 和 GROUP BY）
    const byStageSql = `
      SELECT audit_stage, COUNT(*) as count 
      FROM audit_records 
      ${whereClause}
      GROUP BY audit_stage
    `;
    const byStageResult = await databaseManager.query<
      (RowDataPacket & { audit_stage: string; count: number })[]
    >(byStageSql, params);
    const byStage: Record<string, number> = {};
    byStageResult.forEach(row => {
      byStage[row.audit_stage] = row.count;
    });

    // 按失败原因分组（使用 COUNT 和 GROUP BY）
    const byReasonSql = `
      SELECT rejection_reason, COUNT(*) as count 
      FROM audit_records 
      ${whereClause}
      GROUP BY rejection_reason
      ORDER BY count DESC
    `;
    const byReasonResult = await databaseManager.query<
      (RowDataPacket & { rejection_reason: string; count: number })[]
    >(byReasonSql, params);
    const byReason: Record<string, number> = {};
    byReasonResult.forEach(row => {
      byReason[row.rejection_reason] = row.count;
    });

    // 按审核员分组（使用 COUNT 和 GROUP BY）
    const byAuditorSql = `
      SELECT username, COUNT(*) as count 
      FROM audit_records 
      ${whereClause}
      GROUP BY username
      ORDER BY count DESC
    `;
    const byAuditorResult = await databaseManager.query<
      (RowDataPacket & { username: string; count: number })[]
    >(byAuditorSql, params);
    const byAuditor: Record<string, number> = {};
    byAuditorResult.forEach(row => {
      const name = row.username || 'Unknown';
      byAuditor[name] = row.count;
    });

    // 时间趋势（按日期分组，使用 COUNT 和 GROUP BY）
    const trendSql = `
      SELECT DATE(submit_time) as date, COUNT(*) as count 
      FROM audit_records 
      ${whereClause}
      GROUP BY DATE(submit_time)
      ORDER BY date ASC
    `;
    const trendResult = await databaseManager.query<
      (RowDataPacket & { date: Date; count: number })[]
    >(trendSql, params);
    const trend = trendResult.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: row.count,
    }));

    const statistics: Statistics = {
      totalFailures,
      byStage,
      byReason,
      byAuditor,
      trend,
      avgProcessingTime: Math.round(avgProcessingTime),
    };

    // 将结果存入缓存
    cacheManager.set(cacheKey, statistics);

    return statistics;
  }

  /**
   * 生成统计数据的缓存键
   */
  private generateStatisticsCacheKey(timeRange?: TimeRange): string {
    if (!timeRange) {
      return 'statistics:all';
    }
    const startDate = timeRange.startDate instanceof Date
      ? timeRange.startDate.toISOString()
      : timeRange.startDate;
    const endDate = timeRange.endDate instanceof Date
      ? timeRange.endDate.toISOString()
      : timeRange.endDate;
    return `statistics:${startDate}:${endDate}`;
  }

  /**
   * 清除统计数据缓存
   * 当创建新记录时调用，确保统计数据的一致性
   */
  private clearStatisticsCache(): void {
    const keys = cacheManager.keys();
    const statisticsKeys = keys.filter(key => key.startsWith('statistics:'));
    if (statisticsKeys.length > 0) {
      cacheManager.del(statisticsKeys);
    }
  }

  /**
   * 更新人工审核状态
   */
  async updateManualStatus(id: string, status: 'approved' | 'rejected', reason?: string): Promise<AuditRecord | null> {
    const sql = 'UPDATE audit_records SET manual_status = ?, rejection_reason = COALESCE(?, rejection_reason) WHERE id = ?';
    await databaseManager.query(sql, [status, reason || null, id]);

    this.clearStatisticsCache();
    return this.findById(id);
  }

  /**
   * 根据 Product ID 更新人工审核状态
   */
  async updateManualStatusByProductId(productId: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    const sql = 'UPDATE audit_records SET manual_status = ?, rejection_reason = COALESCE(?, rejection_reason) WHERE product_id = ?';
    await databaseManager.query(sql, [status, reason || null, productId]);
    this.clearStatisticsCache();
  }

  /**
   * 将数据库行映射为AuditRecord对象
   */
  private mapRowToRecord(row: AuditRecordRow): AuditRecord {
    return {
      id: row.id,
      productId: row.product_id,
      productTitle: row.product_title,
      productImage: row.product_image,
      submitTime: row.submit_time,
      aiProcessingTime: row.ai_processing_time,
      rejectionReason: row.rejection_reason,
      auditStage: row.audit_stage,
      apiError: row.api_error || undefined,
      textRequest: row.text_request || undefined,
      textResponse: row.text_response || undefined,
      imageRequest: row.image_request || undefined,
      imageResponse: row.image_response || undefined,
      scopeRequest: row.scope_request || undefined,
      scopeResponse: row.scope_response || undefined,
      userId: row.user_id || undefined,
      username: row.username || undefined,
      manualStatus: row.manual_status || undefined,
      price: row.price || undefined,
      shopName: row.shop_name || undefined,
      shopId: row.shop_id || undefined,
      categoryName: row.category_name || undefined,
      categoryImage: row.category_image || undefined,
      images: row.images || undefined,
      auditReason: row.audit_reason || undefined,
      categoryAuditStatus: row.category_audit_status || undefined,
      categoryAuditReason: row.category_audit_reason || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// 导出单例实例
export const auditRecordService = new AuditRecordService();
export default auditRecordService;
