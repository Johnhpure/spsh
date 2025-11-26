import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';

// 创建axios实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加API密钥
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 错误处理
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;

    // 网络错误重试逻辑（最多3次）
    if (!config || !('_retryCount' in config)) {
      (config as any)._retryCount = 0;
    }

    const retryCount = (config as any)._retryCount as number;

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      !error.response
    ) {
      if (retryCount < 3) {
        (config as any)._retryCount = retryCount + 1;
        ElMessage.warning(`正在重试... (${retryCount + 1}/3)`);
        
        // 指数退避
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return axiosInstance(config!);
      } else {
        ElMessage.error('网络连接失败，请检查网络后重试');
      }
    }

    // 处理不同的HTTP错误状态
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case 400:
          ElMessage.error('请求参数错误');
          break;
        case 401:
          ElMessage.error('未授权，请检查API密钥');
          break;
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
        case 500:
          ElMessage.error('服务器内部错误');
          break;
        case 503:
          ElMessage.error('服务暂时不可用，请稍后重试');
          break;
        default:
          ElMessage.error(`请求失败: ${status}`);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
