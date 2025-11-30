import { storage } from 'wxt/storage';

export interface UserInfo {
  id: string;
  username: string;
  role: string;
}

/**
 * 检查用户是否已登录（简单检查 token 是否存在）
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await storage.getItem<string>('local:auth_token');
  return !!token;
}

/**
 * 验证 token 是否有效（可选的严格验证）
 */
export async function verifyToken(): Promise<boolean> {
  const token = await storage.getItem<string>('local:auth_token');
  if (!token) {
    return false;
  }

  try {
    const config = await storage.getItem<{ apiUrl: string }>('local:audit_api_config');
    const apiUrl = config?.apiUrl || 'http://localhost:3000';
    
    const response = await fetch(`${apiUrl}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Token 无效，清除认证信息
      await logout();
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    // 网络错误时返回 false，但不清除 token
    return false;
  }
}

/**
 * 获取认证 token
 */
export async function getAuthToken(): Promise<string | null> {
  return await storage.getItem<string>('local:auth_token');
}

/**
 * 获取用户信息
 */
export async function getUserInfo(): Promise<UserInfo | null> {
  return await storage.getItem<UserInfo>('local:user_info');
}

/**
 * 退出登录
 */
export async function logout(): Promise<void> {
  await storage.removeItem('local:auth_token');
  await storage.removeItem('local:user_info');
}

/**
 * 获取带认证头的 fetch 配置
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}
