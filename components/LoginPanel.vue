<script setup lang="ts">
import { ref } from 'vue';
import { storage } from 'wxt/storage';

const emit = defineEmits<{
  loginSuccess: [];
}>();

const username = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const apiUrl = ref('http://localhost:3000'); // 默认值

const loadApiUrl = async () => {
  try {
    const config = await storage.getItem<{ apiUrl: string }>('local:audit_api_config');
    if (config?.apiUrl) {
      apiUrl.value = config.apiUrl;
    }
    console.log('[Login] API URL:', apiUrl.value);
  } catch (error) {
    console.error('[Login] Failed to load API URL:', error);
  }
};

loadApiUrl();

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    console.log('[Login] Attempting login to:', `${apiUrl.value}/api/auth/login`);
    const response = await fetch(`${apiUrl.value}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });

    console.log('[Login] Response status:', response.status);
    const data = await response.json();
    console.log('[Login] Response data:', data);

    if (!response.ok || !data.success) {
      errorMessage.value = data.error || '登录失败';
      return;
    }

    // 保存 token 和用户信息
    await storage.setItem('local:auth_token', data.token);
    await storage.setItem('local:user_info', {
      id: data.user.id,
      username: data.user.username,
      role: data.user.role,
    });

    console.log('[Login] Login successful, token saved');
    emit('loginSuccess');
  } catch (error) {
    console.error('[Login] Login error:', error);
    errorMessage.value = '网络错误，请检查后端服务是否运行';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-panel">
    <div class="login-card">
      <div class="login-header">
        <div class="login-icon">🛡️</div>
        <h2>商品审核助手</h2>
        <p>请登录以继续</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            :disabled="isLoading"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            :disabled="isLoading"
            autocomplete="current-password"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="login-btn" :disabled="isLoading">
          <span v-if="isLoading">登录中...</span>
          <span v-else>登录</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.login-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 40px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.login-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1C1C1E;
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: #8E8E93;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #1C1C1E;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #E5E5EA;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: all 0.2s;
  background: #F2F2F7;
}

.form-group input:focus {
  border-color: #007AFF;
  background: #ffffff;
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
  border-radius: 12px;
  font-size: 14px;
  text-align: center;
}

.login-btn {
  padding: 14px;
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.login-btn:hover:not(:disabled) {
  background: #0051D5;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
