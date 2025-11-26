import { Request, Response, NextFunction } from 'express';
import { auditRecordService } from '../services/auditRecordService';
import { AuditRecord } from '../models/auditRecord';
import { convertToCSV, generateCSVFilename } from '../utils/csv';

/**
 * 审核记录控制器
 */
class AuditRecordController {
  /**
   * 创建审核记录
   * 调用service.create，返回201和创建的记录
   */
  async createRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordData: AuditRecord = {
        productId: req.body.productId,
        productTitle: req.body.productTitle,
        productImage: req.body.productImage,
        submitTime: new Date(req.body.submitTime),
        aiProcessingTime: req.body.aiProcessingTime,
        rejectionReason: req.body.rejectionReason,
        auditStage: req.body.auditStage,
        apiError: req.body.apiError,
        textRequest: req.body.textRequest,
        textResponse: req.body.textResponse,
        imageRequest: req.body.imageRequest,
        imageResponse: req.body.imageResponse,
        scopeRequest: req.body.scopeRequest,
        scopeResponse: req.body.scopeResponse,
      };

      const createdRecord = await auditRecordService.create(recordData);

      res.status(201).json({
        success: true,
        data: createdRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取单条审核记录详情
   * 根据ID获取记录，如果不存在返回404
   */
  async getRecordById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const record = await auditRecordService.findById(id);

      if (!record) {
        res.status(404).json({
          success: false,
          error: 'Record not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 查询审核记录
   * 从query参数解析筛选条件和分页参数，调用service.findAll，返回分页结果
   */
  async getRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 解析筛选条件
      const filters: any = {};
      
      if (req.query.productId) {
        filters.productId = req.query.productId as string;
      }
      
      if (req.query.stage) {
        filters.stage = req.query.stage as string;
      }
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.keyword) {
        filters.keyword = req.query.keyword as string;
      }

      // 解析分页参数
      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      // 调用service.findAll
      const result = await auditRecordService.findAll(filters, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取统计数据
   * 从query参数解析时间范围，调用service.getStatistics，返回统计数据
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 解析时间范围
      let timeRange;
      
      if (req.query.startDate && req.query.endDate) {
        timeRange = {
          startDate: new Date(req.query.startDate as string),
          endDate: new Date(req.query.endDate as string),
        };
      }

      // 调用service.getStatistics
      const statistics = await auditRecordService.getStatistics(timeRange);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 导出审核记录为CSV
   * 复用查询逻辑获取筛选后的记录（不分页，获取所有匹配记录）
   */
  async exportRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 解析筛选条件（与getRecords相同）
      const filters: any = {};
      
      if (req.query.productId) {
        filters.productId = req.query.productId as string;
      }
      
      if (req.query.stage) {
        filters.stage = req.query.stage as string;
      }
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.keyword) {
        filters.keyword = req.query.keyword as string;
      }

      // 获取所有匹配记录（不分页）
      // 使用一个很大的limit值来获取所有记录
      const pagination = {
        page: 1,
        limit: 1000000, // 足够大的数字来获取所有记录
      };

      const result = await auditRecordService.findAll(filters, pagination);

      // 转换为CSV格式
      const csvContent = convertToCSV(result.records);

      // 设置响应头
      const filename = generateCSVFilename();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // 发送CSV内容
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}

// 导出单例实例
export const auditRecordController = new AuditRecordController();
export default auditRecordController;
