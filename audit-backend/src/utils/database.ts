import mysql from 'mysql2/promise';
import { logger, logDatabaseOperation } from './logger';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

class DatabaseManager {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;

  /**
   * 连接到数据库，使用指数退避重试机制
   */
  async connect(config: DatabaseConfig, maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting to connect to database (attempt ${attempt}/${maxRetries})...`, {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
        });
        
        this.pool = mysql.createPool({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          connectionLimit: config.connectionLimit,
          waitForConnections: true,
          queueLimit: 0,
        });

        // 测试连接
        const connection = await this.pool.getConnection();
        await connection.ping();
        connection.release();

        this.isConnected = true;
        logger.info('Database connected successfully', {
          host: config.host,
          database: config.database,
        });
        
        // 初始化数据库表
        await this.initializeDatabase();
        
        return;
      } catch (error) {
        lastError = error as Error;
        logger.error({
          type: 'database_connection_error',
          message: `Database connection attempt ${attempt} failed`,
          error: lastError.message,
          stack: lastError.stack,
          attempt,
          maxRetries,
          host: config.host,
          database: config.database,
        });

        // 如果不是最后一次尝试，等待后重试（指数退避）
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2秒, 4秒, 8秒
          logger.info(`Retrying database connection in ${waitTime / 1000} seconds...`);
          await this.sleep(waitTime);
        }
      }
    }

    const errorMessage = `Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`;
    logger.error({
      type: 'database_connection_failed',
      message: errorMessage,
      maxRetries,
    });
    throw new Error(errorMessage);
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        logger.info('Database disconnected successfully');
      } catch (error) {
        const err = error as Error;
        logger.error({
          type: 'database_disconnect_error',
          message: 'Error disconnecting from database',
          error: err.message,
          stack: err.stack,
        });
        throw error;
      }
    }
  }

  /**
   * 执行查询
   */
  async query<T>(sql: string, params?: any[]): Promise<T> {
    if (!this.pool || !this.isConnected) {
      const error = new Error('Database not connected');
      logDatabaseOperation('query', sql, params, error);
      throw error;
    }

    try {
      logDatabaseOperation('query', sql, params);
      const [rows] = await this.pool.execute(sql, params);
      return rows as T;
    } catch (error) {
      const err = error as Error;
      logDatabaseOperation('query', sql, params, err);
      throw error;
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    if (!this.pool || !this.isConnected) {
      const error = new Error('Database not connected');
      logger.error({
        type: 'database_transaction_error',
        message: error.message,
      });
      throw error;
    }

    const connection = await this.pool.getConnection();
    
    try {
      logger.debug('Starting database transaction');
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      logger.debug('Database transaction committed successfully');
      return result;
    } catch (error) {
      await connection.rollback();
      const err = error as Error;
      logger.error({
        type: 'database_transaction_error',
        message: 'Transaction rolled back due to error',
        error: err.message,
        stack: err.stack,
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 初始化数据库表结构
   */
  private async initializeDatabase(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS audit_records (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        product_title VARCHAR(500) NOT NULL,
        product_image VARCHAR(1000),
        submit_time DATETIME NOT NULL,
        ai_processing_time INT NOT NULL COMMENT '毫秒',
        rejection_reason VARCHAR(500) NOT NULL,
        audit_stage ENUM('text', 'image', 'business_scope') NOT NULL,
        api_error TEXT,
        text_request TEXT,
        text_response TEXT,
        image_request TEXT,
        image_response TEXT,
        scope_request TEXT,
        scope_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_product_id (product_id),
        INDEX idx_submit_time (submit_time),
        INDEX idx_audit_stage (audit_stage),
        INDEX idx_created_at (created_at),
        FULLTEXT INDEX idx_rejection_reason (rejection_reason)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      logger.info('Initializing database tables...');
      await this.query(createTableSQL);
      logger.info('Database tables initialized successfully');
    } catch (error) {
      const err = error as Error;
      logger.error({
        type: 'database_initialization_error',
        message: 'Error initializing database tables',
        error: err.message,
        stack: err.stack,
      });
      throw error;
    }
  }

  /**
   * 辅助方法：延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 导出类和单例实例
export { DatabaseManager };
export const databaseManager = new DatabaseManager();
export default databaseManager;
