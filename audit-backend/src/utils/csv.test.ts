import { convertToCSV, generateCSVFilename } from './csv';
import { AuditRecord } from '../models/auditRecord';

describe('CSV Utility Functions', () => {
  describe('convertToCSV', () => {
    it('should convert records to CSV format with headers', () => {
      const records: AuditRecord[] = [
        {
          id: 'uuid-1',
          productId: '12345',
          productTitle: 'Test Product',
          productImage: 'https://example.com/image.jpg',
          submitTime: new Date('2024-01-01T10:00:00Z'),
          aiProcessingTime: 1500,
          rejectionReason: '图片违规',
          auditStage: 'image',
          createdAt: new Date('2024-01-01T10:00:01Z'),
        },
      ];

      const csv = convertToCSV(records);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Product ID');
      expect(lines[0]).toContain('Rejection Reason');
      expect(lines.length).toBe(2); // Header + 1 data row
    });

    it('should handle empty array', () => {
      const csv = convertToCSV([]);
      expect(csv).toBe('');
    });

    it('should escape fields with commas', () => {
      const records: AuditRecord[] = [
        {
          id: 'uuid-1',
          productId: '12345',
          productTitle: 'Test, Product',
          productImage: 'https://example.com/image.jpg',
          submitTime: new Date('2024-01-01T10:00:00Z'),
          aiProcessingTime: 1500,
          rejectionReason: '图片违规',
          auditStage: 'image',
          createdAt: new Date('2024-01-01T10:00:01Z'),
        },
      ];

      const csv = convertToCSV(records);
      expect(csv).toContain('"Test, Product"');
    });

    it('should escape fields with double quotes', () => {
      const records: AuditRecord[] = [
        {
          id: 'uuid-1',
          productId: '12345',
          productTitle: 'Test "Product"',
          productImage: 'https://example.com/image.jpg',
          submitTime: new Date('2024-01-01T10:00:00Z'),
          aiProcessingTime: 1500,
          rejectionReason: '图片违规',
          auditStage: 'image',
          createdAt: new Date('2024-01-01T10:00:01Z'),
        },
      ];

      const csv = convertToCSV(records);
      expect(csv).toContain('"Test ""Product"""');
    });

    it('should handle optional fields', () => {
      const records: AuditRecord[] = [
        {
          id: 'uuid-1',
          productId: '12345',
          productTitle: 'Test Product',
          productImage: 'https://example.com/image.jpg',
          submitTime: new Date('2024-01-01T10:00:00Z'),
          aiProcessingTime: 1500,
          rejectionReason: '图片违规',
          auditStage: 'image',
          apiError: 'Some error',
          createdAt: new Date('2024-01-01T10:00:01Z'),
        },
      ];

      const csv = convertToCSV(records);
      expect(csv).toContain('Some error');
    });

    it('should handle multiple records', () => {
      const records: AuditRecord[] = [
        {
          id: 'uuid-1',
          productId: '12345',
          productTitle: 'Test Product 1',
          productImage: 'https://example.com/image1.jpg',
          submitTime: new Date('2024-01-01T10:00:00Z'),
          aiProcessingTime: 1500,
          rejectionReason: '图片违规',
          auditStage: 'image',
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
          auditStage: 'text',
          createdAt: new Date('2024-01-02T10:00:01Z'),
        },
      ];

      const csv = convertToCSV(records);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // Header + 2 data rows
      expect(lines[1]).toContain('uuid-1');
      expect(lines[2]).toContain('uuid-2');
    });
  });

  describe('generateCSVFilename', () => {
    it('should generate filename with current date', () => {
      const filename = generateCSVFilename();
      expect(filename).toMatch(/^audit-records-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should include .csv extension', () => {
      const filename = generateCSVFilename();
      expect(filename.endsWith('.csv')).toBe(true);
    });

    it('should start with audit-records prefix', () => {
      const filename = generateCSVFilename();
      expect(filename.startsWith('audit-records-')).toBe(true);
    });
  });
});
