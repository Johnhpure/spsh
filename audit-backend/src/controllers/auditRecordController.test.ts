import request from 'supertest';
import express from 'express';
import auditRecordsRouter from '../routes/auditRecords';
import { errorHandler } from '../middleware/errorHandler';

// Mock the service
jest.mock('../services/auditRecordService', () => ({
  auditRecordService: {
    create: jest.fn(),
    findAll: jest.fn(),
    getStatistics: jest.fn(),
  },
}));

import { auditRecordService } from '../services/auditRecordService';

describe('Audit Record Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Set API key for testing
    process.env.API_KEYS = 'test-api-key';
    
    app.use('/api/audit-records', auditRecordsRouter);
    app.use(errorHandler);
    
    jest.clearAllMocks();
  });

  describe('POST /api/audit-records', () => {
    const validRecord = {
      productId: '12345',
      productTitle: 'Test Product',
      productImage: 'https://example.com/image.jpg',
      submitTime: '2024-01-01T10:00:00Z',
      aiProcessingTime: 1500,
      rejectionReason: '图片违规',
      auditStage: 'image',
    };

    it('should create a record with valid data and return 201', async () => {
      const mockCreatedRecord = {
        id: 'test-uuid',
        ...validRecord,
        submitTime: new Date(validRecord.submitTime),
        createdAt: new Date(),
      };

      (auditRecordService.create as jest.Mock).mockResolvedValue(mockCreatedRecord);

      const response = await request(app)
        .post('/api/audit-records')
        .set('X-API-Key', 'test-api-key')
        .send(validRecord);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('test-uuid');
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/audit-records')
        .send(validRecord);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 with missing required fields', async () => {
      const invalidRecord = {
        productId: '12345',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/audit-records')
        .set('X-API-Key', 'test-api-key')
        .send(invalidRecord);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 with invalid auditStage', async () => {
      const invalidRecord = {
        ...validRecord,
        auditStage: 'invalid-stage',
      };

      const response = await request(app)
        .post('/api/audit-records')
        .set('X-API-Key', 'test-api-key')
        .send(invalidRecord);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid date format', async () => {
      const invalidRecord = {
        ...validRecord,
        submitTime: 'not-a-date',
      };

      const response = await request(app)
        .post('/api/audit-records')
        .set('X-API-Key', 'test-api-key')
        .send(invalidRecord);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 with negative aiProcessingTime', async () => {
      const invalidRecord = {
        ...validRecord,
        aiProcessingTime: -100,
      };

      const response = await request(app)
        .post('/api/audit-records')
        .set('X-API-Key', 'test-api-key')
        .send(invalidRecord);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/audit-records', () => {
    const mockRecords = [
      {
        id: 'uuid-1',
        productId: '12345',
        productTitle: 'Test Product 1',
        productImage: 'https://example.com/image1.jpg',
        submitTime: new Date('2024-01-01T10:00:00Z'),
        aiProcessingTime: 1500,
        rejectionReason: '图片违规',
        auditStage: 'image' as const,
        createdAt: new Date(),
      },
      {
        id: 'uuid-2',
        productId: '67890',
        productTitle: 'Test Product 2',
        productImage: 'https://example.com/image2.jpg',
        submitTime: new Date('2024-01-02T10:00:00Z'),
        aiProcessingTime: 2000,
        rejectionReason: '文本违规',
        auditStage: 'text' as const,
        createdAt: new Date(),
      },
    ];

    it('should return paginated records with default pagination', async () => {
      const mockResult = {
        records: mockRecords,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.records).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(20);
    });

    it('should return 401 without API key', async () => {
      const response = await request(app).get('/api/audit-records');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should filter by productId', async () => {
      const mockResult = {
        records: [mockRecords[0]],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records')
        .query({ productId: '12345' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(auditRecordService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ productId: '12345' }),
        expect.any(Object)
      );
    });

    it('should filter by stage', async () => {
      const mockResult = {
        records: [mockRecords[0]],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records')
        .query({ stage: 'image' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(auditRecordService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'image' }),
        expect.any(Object)
      );
    });

    it('should filter by date range', async () => {
      const mockResult = {
        records: mockRecords,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(auditRecordService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
        expect.any(Object)
      );
    });

    it('should filter by keyword', async () => {
      const mockResult = {
        records: [mockRecords[0]],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records')
        .query({ keyword: '图片' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(auditRecordService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '图片' }),
        expect.any(Object)
      );
    });

    it('should support custom pagination', async () => {
      const mockResult = {
        records: [mockRecords[0]],
        pagination: {
          page: 2,
          limit: 10,
          total: 15,
          totalPages: 2,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records')
        .query({ page: '2', limit: '10' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(auditRecordService.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        { page: 2, limit: 10 }
      );
    });

    it('should return 400 with invalid stage value', async () => {
      const response = await request(app)
        .get('/api/audit-records')
        .query({ stage: 'invalid-stage' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 with invalid date format', async () => {
      const response = await request(app)
        .get('/api/audit-records')
        .query({ startDate: 'not-a-date' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid page number', async () => {
      const response = await request(app)
        .get('/api/audit-records')
        .query({ page: '0' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 with limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/audit-records')
        .query({ limit: '101' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/audit-records/export', () => {
    const mockRecords = [
      {
        id: 'uuid-1',
        productId: '12345',
        productTitle: 'Test Product 1',
        productImage: 'https://example.com/image1.jpg',
        submitTime: new Date('2024-01-01T10:00:00Z'),
        aiProcessingTime: 1500,
        rejectionReason: '图片违规',
        auditStage: 'image' as const,
        createdAt: new Date('2024-01-01T10:00:01Z'),
      },
      {
        id: 'uuid-2',
        productId: '67890',
        productTitle: 'Test Product 2',
        productImage: 'https://example.com/image2.jpg',
        submitTime: new Date('2024-01-02T10:00:00Z'),
        aiProcessingTime: 2000,
        rejectionReason: '文本违规',
        auditStage: 'text' as const,
        createdAt: new Date('2024-01-02T10:00:01Z'),
      },
    ];

    it('should export records as CSV with correct headers', async () => {
      const mockResult = {
        records: mockRecords,
        pagination: {
          page: 1,
          limit: 1000000,
          total: 2,
          totalPages: 1,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records/export')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toMatch(/audit-records-\d{4}-\d{2}-\d{2}\.csv/);
      
      // Check CSV content
      const csvLines = response.text.split('\n');
      expect(csvLines[0]).toContain('ID');
      expect(csvLines[0]).toContain('Product ID');
      expect(csvLines[0]).toContain('Rejection Reason');
      expect(csvLines.length).toBeGreaterThan(1); // Header + data rows
    });

    it('should return 401 without API key', async () => {
      const response = await request(app).get('/api/audit-records/export');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should export filtered records', async () => {
      const mockResult = {
        records: [mockRecords[0]],
        pagination: {
          page: 1,
          limit: 1000000,
          total: 1,
          totalPages: 1,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records/export')
        .query({ productId: '12345' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(auditRecordService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ productId: '12345' }),
        expect.objectContaining({ limit: 1000000 })
      );
    });

    it('should handle empty result set', async () => {
      const mockResult = {
        records: [],
        pagination: {
          page: 1,
          limit: 1000000,
          total: 0,
          totalPages: 0,
        },
      };

      (auditRecordService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit-records/export')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toBe('');
    });
  });

  describe('GET /api/audit-records/statistics', () => {
    const mockStatistics = {
      totalFailures: 100,
      byStage: {
        text: 20,
        image: 60,
        business_scope: 20,
      },
      byReason: {
        '图片违规': 40,
        '文本违规': 20,
        '经营范围不符': 20,
        '其他': 20,
      },
      trend: [
        { date: '2024-01-01', count: 50 },
        { date: '2024-01-02', count: 50 },
      ],
      avgProcessingTime: 1500,
    };

    it('should return statistics without time range', async () => {
      (auditRecordService.getStatistics as jest.Mock).mockResolvedValue(mockStatistics);

      const response = await request(app)
        .get('/api/audit-records/statistics')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatistics);
      expect(auditRecordService.getStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics with time range', async () => {
      (auditRecordService.getStatistics as jest.Mock).mockResolvedValue(mockStatistics);

      const response = await request(app)
        .get('/api/audit-records/statistics')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatistics);
      expect(auditRecordService.getStatistics).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });

    it('should return 401 without API key', async () => {
      const response = await request(app).get('/api/audit-records/statistics');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid startDate format', async () => {
      const response = await request(app)
        .get('/api/audit-records/statistics')
        .query({ startDate: 'not-a-date' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 with invalid endDate format', async () => {
      const response = await request(app)
        .get('/api/audit-records/statistics')
        .query({ endDate: 'not-a-date' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return statistics with only startDate', async () => {
      (auditRecordService.getStatistics as jest.Mock).mockResolvedValue(mockStatistics);

      const response = await request(app)
        .get('/api/audit-records/statistics')
        .query({ startDate: '2024-01-01T00:00:00Z' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // When only startDate is provided, timeRange should be undefined
      expect(auditRecordService.getStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics with only endDate', async () => {
      (auditRecordService.getStatistics as jest.Mock).mockResolvedValue(mockStatistics);

      const response = await request(app)
        .get('/api/audit-records/statistics')
        .query({ endDate: '2024-01-31T23:59:59Z' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // When only endDate is provided, timeRange should be undefined
      expect(auditRecordService.getStatistics).toHaveBeenCalledWith(undefined);
    });
  });
});
