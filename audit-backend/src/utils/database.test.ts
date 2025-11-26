import * as fc from 'fast-check';
import { DatabaseManager } from './database';

/**
 * Feature: audit-backend-system, Property 1: 数据库连接建立
 * 
 * 对于任何有效的数据库配置，当系统启动时，应该能够成功建立与MySQL数据库的连接。
 * 
 * Validates: Requirements 1.1
 */

describe('Database Connection Property Tests', () => {
  let testDbManager: DatabaseManager;

  beforeEach(() => {
    testDbManager = new DatabaseManager();
  });

  afterEach(async () => {
    try {
      await testDbManager.disconnect();
    } catch (error) {
      // Ignore disconnect errors in cleanup
    }
  });

  /**
   * Property 1: 数据库连接建立
   * 
   * 对于任何有效的数据库配置，系统应该能够成功建立数据库连接。
   * 这个测试验证连接建立后，连接状态应该为true，并且能够执行基本的数据库操作。
   */
  test('Property 1: Database connection establishment - valid config should establish connection', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成有效的数据库配置
        fc.record({
          host: fc.constant(process.env.DB_HOST || 'rm-bp1s2o0qzqdwdif9nko.mysql.rds.aliyuncs.com'),
          port: fc.constant(parseInt(process.env.DB_PORT || '3306')),
          user: fc.constant(process.env.DB_USER || 'spsh'),
          password: fc.constant(process.env.DB_PASSWORD || 'Chenbang!@198859'),
          database: fc.constant(process.env.DB_NAME || 'spsh'),
          connectionLimit: fc.integer({ min: 1, max: 20 })
        }),
        async (config) => {
          // 创建新的DatabaseManager实例用于测试
          const dbManager = new DatabaseManager();
          
          try {
            // 尝试连接数据库
            await dbManager.connect(config, 1); // 只尝试一次，避免测试时间过长
            
            // 验证连接状态
            expect(dbManager.getConnectionStatus()).toBe(true);
            
            // 验证可以执行基本查询
            const result = await dbManager.query<any>('SELECT 1 as test');
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].test).toBe(1);
            
            // 清理连接
            await dbManager.disconnect();
            expect(dbManager.getConnectionStatus()).toBe(false);
          } catch (error) {
            // 如果连接失败，确保是预期的错误类型
            expect(error).toBeInstanceOf(Error);
            throw error;
          }
        }
      ),
      {
        numRuns: 5, // 运行5次以验证连接的稳定性，而不是100次（避免过多数据库连接）
        timeout: 30000, // 30秒超时
      }
    );
  }, 60000); // Jest测试超时60秒

  /**
   * 补充测试：验证连接失败时的错误处理
   * 这不是属性测试，但验证了需求1.4（连接失败时记录错误并重试）
   */
  test('Connection failure should throw error after retries', async () => {
    const invalidConfig = {
      host: 'invalid-host-that-does-not-exist.com',
      port: 3306,
      user: 'invalid',
      password: 'invalid',
      database: 'invalid',
      connectionLimit: 10
    };

    const dbManager = new DatabaseManager();
    
    await expect(dbManager.connect(invalidConfig, 2)).rejects.toThrow(
      /Failed to connect to database after 2 attempts/
    );
    
    expect(dbManager.getConnectionStatus()).toBe(false);
  }, 30000);

  /**
   * 补充测试：验证连接池管理
   * 验证需求1.2（使用连接池管理连接资源）
   */
  test('Connection pool should be properly managed', async () => {
    const config = {
      host: process.env.DB_HOST || 'rm-bp1s2o0qzqdwdif9nko.mysql.rds.aliyuncs.com',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'spsh',
      password: process.env.DB_PASSWORD || 'Chenbang!@198859',
      database: process.env.DB_NAME || 'spsh',
      connectionLimit: 5
    };

    const dbManager = new DatabaseManager();
    
    try {
      await dbManager.connect(config, 1);
      
      // 执行多个并发查询以测试连接池
      const queries = Array(3).fill(null).map(() => 
        dbManager.query<any>('SELECT 1 as test')
      );
      
      const results = await Promise.all(queries);
      
      // 验证所有查询都成功
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result[0].test).toBe(1);
      });
      
      await dbManager.disconnect();
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  }, 30000);
});
