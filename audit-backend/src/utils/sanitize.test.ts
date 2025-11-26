import {
  stripHtmlTags,
  escapeSpecialChars,
  sanitizeInput,
  sanitizeObject,
} from './sanitize';

describe('Sanitize Utility', () => {
  describe('stripHtmlTags', () => {
    it('should remove HTML tags from string', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = stripHtmlTags(input);
      expect(result).toBe('alert("xss")Hello');
    });

    it('should remove multiple HTML tags', () => {
      const input = '<div><p>Hello</p><span>World</span></div>';
      const result = stripHtmlTags(input);
      expect(result).toBe('HelloWorld');
    });

    it('should handle strings without HTML tags', () => {
      const input = 'Plain text';
      const result = stripHtmlTags(input);
      expect(result).toBe('Plain text');
    });

    it('should handle empty strings', () => {
      const input = '';
      const result = stripHtmlTags(input);
      expect(result).toBe('');
    });
  });

  describe('escapeSpecialChars', () => {
    it('should escape special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeSpecialChars(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const result = escapeSpecialChars(input);
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      const input = `He said "Hello" and 'Goodbye'`;
      const result = escapeSpecialChars(input);
      expect(result).toBe('He said &quot;Hello&quot; and &#x27;Goodbye&#x27;');
    });

    it('should handle strings without special characters', () => {
      const input = 'Plain text';
      const result = escapeSpecialChars(input);
      expect(result).toBe('Plain text');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags and escape special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).toBe('alert(&quot;xss&quot;)');
    });

    it('should handle complex malicious input', () => {
      const input = '<img src="x" onerror="alert(\'xss\')">';
      const result = sanitizeInput(input);
      expect(result).toBe('');
    });

    it('should preserve safe text', () => {
      const input = 'This is safe text';
      const result = sanitizeInput(input);
      expect(result).toBe('This is safe text');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string fields in an object', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        description: 'Safe text',
        count: 42,
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('alert(&quot;xss&quot;)');
      expect(result.description).toBe('Safe text');
      expect(result.count).toBe(42);
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          email: 'john@example.com',
        },
        tags: ['<script>xss</script>', 'safe'],
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('John');
      expect(result.user.email).toBe('john@example.com');
      expect(result.tags[0]).toBe('xss');
      expect(result.tags[1]).toBe('safe');
    });

    it('should handle arrays', () => {
      const input = ['<script>xss</script>', 'safe', '<b>bold</b>'];
      const result = sanitizeObject(input);
      expect(result[0]).toBe('xss');
      expect(result[1]).toBe('safe');
      expect(result[2]).toBe('bold');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should preserve non-string types', () => {
      const input = {
        string: 'text',
        number: 123,
        boolean: true,
        date: new Date('2024-01-01'),
        nullValue: null,
      };
      const result = sanitizeObject(input);
      expect(result.string).toBe('text');
      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
      expect(result.date).toEqual(new Date('2024-01-01'));
      expect(result.nullValue).toBe(null);
    });
  });
});
