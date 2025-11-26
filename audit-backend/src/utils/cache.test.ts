import { CacheManager } from './cache';

describe('Cache Manager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    // Create a new cache instance with short TTL for testing
    cache = new CacheManager(1); // 1 second TTL
  });

  afterEach(() => {
    cache.flush();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      const setResult = cache.set(key, value);
      expect(setResult).toBe(true);

      const retrieved = cache.get(key);
      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cache.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should delete values', () => {
      const key = 'test-key';
      cache.set(key, 'test-value');

      const deleteCount = cache.del(key);
      expect(deleteCount).toBe(1);

      const retrieved = cache.get(key);
      expect(retrieved).toBeUndefined();
    });

    it('should check if key exists', () => {
      const key = 'test-key';
      cache.set(key, 'test-value');

      expect(cache.has(key)).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should flush all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.flush();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });

    it('should get all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('TTL Behavior', () => {
    it('should expire values after TTL', async () => {
      const key = 'expiring-key';
      cache.set(key, 'test-value');

      // Value should exist immediately
      expect(cache.get(key)).toBe('test-value');

      // Wait for TTL to expire (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Value should be expired
      expect(cache.get(key)).toBeUndefined();
    });

    it('should support custom TTL per key', () => {
      const key = 'custom-ttl-key';
      cache.set(key, 'test-value', 10); // 10 seconds TTL

      expect(cache.get(key)).toBe('test-value');
    });
  });

  describe('Statistics', () => {
    it('should provide cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('non-existent');

      const stats = cache.getStats();
      expect(stats.keys).toBe(2);
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('Complex Data Types', () => {
    it('should handle objects', () => {
      const key = 'object-key';
      const value = { name: 'test', count: 42, nested: { data: true } };

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should handle arrays', () => {
      const key = 'array-key';
      const value = [1, 2, 3, 'test', { nested: true }];

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should handle strings', () => {
      const key = 'string-key';
      const value = 'simple string value';

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
    });

    it('should handle numbers', () => {
      const key = 'number-key';
      const value = 12345;

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
    });
  });

  describe('Multiple Key Deletion', () => {
    it('should delete multiple keys at once', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const deleteCount = cache.del(['key1', 'key2']);
      expect(deleteCount).toBe(2);

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
    });
  });
});
