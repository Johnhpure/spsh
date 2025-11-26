/**
 * 输入清理工具函数
 * 用于防止XSS攻击和其他安全问题
 */

/**
 * 移除HTML标签
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function stripHtmlTags(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  // 移除所有HTML标签
  return input.replace(/<[^>]*>/g, '');
}

/**
 * 转义特殊字符
 * @param input 输入字符串
 * @returns 转义后的字符串
 */
export function escapeSpecialChars(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char);
}

/**
 * 清理输入数据（移除HTML标签和转义特殊字符）
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  
  // 先移除HTML标签，再转义特殊字符
  let cleaned = stripHtmlTags(input);
  cleaned = escapeSpecialChars(cleaned);
  
  return cleaned;
}

/**
 * 递归清理对象中的所有字符串字段
 * @param obj 输入对象
 * @returns 清理后的对象
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // 只清理字符串类型
  if (typeof obj === 'string') {
    return sanitizeInput(obj) as unknown as T;
  }
  
  // 对于非字符串的原始类型（number, boolean等），直接返回
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }
  
  // 处理Date对象和其他特殊对象，直接返回
  if (obj instanceof Date || obj instanceof RegExp) {
    return obj;
  }
  
  // 处理普通对象
  const sanitized: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}
