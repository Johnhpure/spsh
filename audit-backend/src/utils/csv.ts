import { AuditRecord } from '../models/auditRecord';

/**
 * 将记录数组转换为CSV格式
 * 包含所有关键字段信息
 */
export function convertToCSV(records: AuditRecord[]): string {
  if (records.length === 0) {
    return '';
  }

  // 定义CSV列头
  const headers = [
    'ID',
    'Product ID',
    'Product Title',
    'Product Image',
    'Submit Time',
    'AI Processing Time (ms)',
    'Rejection Reason',
    'Audit Stage',
    'API Error',
    'Created At',
  ];

  // 转义CSV字段中的特殊字符
  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) {
      return '';
    }

    const stringValue = String(field);
    
    // 如果字段包含逗号、双引号或换行符，需要用双引号包裹
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      // 双引号需要转义为两个双引号
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  // 构建CSV行
  const rows: string[] = [];
  
  // 添加表头
  rows.push(headers.map(escapeCSVField).join(','));

  // 添加数据行
  for (const record of records) {
    const row = [
      record.id || '',
      record.productId,
      record.productTitle,
      record.productImage,
      record.submitTime instanceof Date ? record.submitTime.toISOString() : record.submitTime,
      record.aiProcessingTime,
      record.rejectionReason,
      record.auditStage,
      record.apiError || '',
      record.createdAt instanceof Date ? record.createdAt.toISOString() : (record.createdAt || ''),
    ];

    rows.push(row.map(escapeCSVField).join(','));
  }

  return rows.join('\n');
}

/**
 * 生成CSV文件名
 * 格式: audit-records-YYYY-MM-DD.csv
 */
export function generateCSVFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `audit-records-${year}-${month}-${day}.csv`;
}
