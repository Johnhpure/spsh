import NodeCache from 'node-cache';
import { logger } from './logger';

/**
 * 缓存管理器类
 * 封装 node-cache 实例，提供统一的缓存接口
 */
class CacheManager {
  private cache: NodeCache;
  private defaultTTL: number;

  constructor(ttlSeconds: number = 300) {
    this.defaultTTL = ttlSeconds;
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2, // 检查过期键的周期
      useClones: false, // 不克隆对象以提高性能
    });

    // 监听缓存事件
    this.cache.on('set', (key) => {
      logger.debug(`Cache set: ${key}`);
    });

    this.cache.on('del', (key) => {
      logger.debug(`Cache deleted: ${key}`);
    });

    this.cache.on('expired', (key) => {
      logger.debug(`Cache expired: ${key}`);
    });

    logger.info(`Cache manager initialized with TTL: ${ttlSeconds} seconds`);
  }

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        logger.debug(`Cache hit: ${key}`);
      } else {
        logger.debug(`Cache miss: ${key}`);
      }
      return value;
    } catch (error) {
      const err = error as Error;
      logger.error({
        type: 'cache_get_error',
        message: 'Error getting value from cache',
        key,
        error: err.message,
      });
      return undefined;
    }
  }

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = this.cache.set(key, value, ttl || this.defaultTTL);
      if (success) {
        logger.debug(`Cache set successfully: ${key}`);
      } else {
        logger.warn(`Failed to set cache: ${key}`);
      }
      return success;
    } catch (error) {
      const err = error as Error;
      logger.error({
        type: 'cache_set_error',
        message: 'Error setting value in cache',
        key,
        error: err.message,
      });
      return false;
    }
  }

  /**
   * 删除缓存值
   */
  del(key: string | string[]): number {
    try {
      const count = this.cache.del(key);
      logger.debug(`Cache deleted ${count} key(s)`);
      return count;
    } catch (error) {
      const err = error as Error;
      logger.error({
        type: 'cache_del_error',
        message: 'Error deleting value from cache',
        key,
        error: err.message,
      });
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  flush(): void {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed successfully');
    } catch (error) {
      const err = error as Error;
      logger.error({
        type: 'cache_flush_error',
        message: 'Error flushing cache',
        error: err.message,
      });
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return this.cache.keys();
  }
}

// 从环境变量读取 TTL，默认 300 秒（5分钟）
const cacheTTL = parseInt(process.env.CACHE_TTL || '300', 10);

// 导出类和单例实例
export { CacheManager };
export const cacheManager = new CacheManager(cacheTTL);
export default cacheManager;
