import { sanitizeSensitiveData } from './logger';

describe('Logger Utility', () => {
  describe('sanitizeSensitiveData', () => {
    it('should sanitize password fields', () => {
      const data = {
        username: 'testuser',
        password: 'secretpassword123',
        email: 'test@example.com',
      };

      const sanitized = sanitizeSensitiveData(data);

      expect(sanitized.username).toBe('testuser');
      expect(sanitized.password).toBe('se****23');
      expect(sanitized.email).toBe('test@example.com');
    });

    it('should sanitize API key fields', () => {
      const data = {
        apiKey: 'sk-1234567890abcdef',
        'x-api-key': 'key-abcdefghijklmnop',
        data: 'normal data',
      };

      const sanitized = sanitizeSensitiveData(data);

      expect(sanitized.apiKey).toBe('sk****ef');
      expect(sanitized['x-api-key']).toBe('ke****op');
      expect(sanitized.data).toBe('normal data');
    });

    it('should sanitize short sensitive values', () => {
      const data = {
        password: 'abc',
        token: 'xy',
      };

      const sanitized = sanitizeSensitiveData(data);

      expect(sanitized.password).toBe('****');
      expect(sanitized.token).toBe('****');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'mypassword',
            apiKey: 'secret-key-123',
          },
        },
        config: {
          timeout: 5000,
        },
      };

      const sanitized = sanitizeSensitiveData(data);

      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.password).toBe('my****rd');
      expect(sanitized.user.credentials.apiKey).toBe('se****23');
      expect(sanitized.config.timeout).toBe(5000);
    });

    it('should handle arrays', () => {
      const data = [
        { username: 'user1', password: 'pass1234' },
        { username: 'user2', password: 'pass5678' },
      ];

      const sanitized = sanitizeSensitiveData(data);

      expect(sanitized[0].username).toBe('user1');
      expect(sanitized[0].password).toBe('pa****34');
      expect(sanitized[1].username).toBe('user2');
      expect(sanitized[1].password).toBe('pa****78');
    });

    it('should handle non-object values', () => {
      expect(sanitizeSensitiveData('string')).toBe('string');
      expect(sanitizeSensitiveData(123)).toBe(123);
      expect(sanitizeSensitiveData(true)).toBe(true);
      expect(sanitizeSensitiveData(null)).toBe(null);
      expect(sanitizeSensitiveData(undefined)).toBe(undefined);
    });

    it('should not modify original data', () => {
      const original = {
        username: 'testuser',
        password: 'secretpassword',
      };

      const sanitized = sanitizeSensitiveData(original);

      expect(original.password).toBe('secretpassword');
      expect(sanitized.password).toBe('se****rd');
    });

    it('should sanitize case-insensitive field names', () => {
      const data = {
        PASSWORD: 'test1234',
        ApiKey: 'key-abcdef',
        SECRET: 'mysecret',
        Authorization: 'Bearer token123',
      };

      const sanitized = sanitizeSensitiveData(data);

      expect(sanitized.PASSWORD).toBe('te****34');
      expect(sanitized.ApiKey).toBe('ke****ef');
      expect(sanitized.SECRET).toBe('my****et');
      expect(sanitized.Authorization).toBe('Be****23');
    });

    it('should handle complex nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              password: 'deeppassword',
              normalField: 'value',
            },
          },
          apiKey: 'key123456',
        },
        array: [
          {
            token: 'token1234',
            data: 'data',
          },
        ],
      };

      const sanitized = sanitizeSensitiveData(data);

      expect(sanitized.level1.level2.level3.password).toBe('de****rd');
      expect(sanitized.level1.level2.level3.normalField).toBe('value');
      expect(sanitized.level1.apiKey).toBe('ke****56');
      expect(sanitized.array[0].token).toBe('to****34');
      expect(sanitized.array[0].data).toBe('data');
    });
  });
});
