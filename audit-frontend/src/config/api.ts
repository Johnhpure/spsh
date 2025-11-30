/**
 * API 配置
 * 统一管理 API 基础地址
 */

// API 基础地址，从环境变量读取，默认为 /api（开发环境通过 Vite 代理）
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// API 服务器基础地址（不含 /api 路径）
// 如果是相对路径（开发环境），直接返回空字符串，让浏览器使用当前域名
export const API_SERVER_URL = API_BASE_URL.startsWith('http') 
  ? API_BASE_URL.replace(/\/api$/, '') 
  : '';
