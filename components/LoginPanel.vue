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
const showSettings = ref(false);
const settingsApiUrl = ref('');

const loadApiUrl = async () => {
  try {
    const config = await storage.getItem<{ apiUrl: string }>('local:audit_api_config');
    if (config?.apiUrl) {
      apiUrl.value = config.apiUrl;
    }
    settingsApiUrl.value = apiUrl.value;
    console.log('[Login] API URL:', apiUrl.value);
  } catch (error) {
    console.error('[Login] Failed to load API URL:', error);
  }
};

loadApiUrl();

const openSettings = () => {
  settingsApiUrl.value = apiUrl.value;
  showSettings.value = true;
};

const closeSettings = () => {
  showSettings.value = false;
};

const saveSettings = async () => {
  const url = settingsApiUrl.value.trim().replace(/\/$/, ''); // Remove trailing slash
  if (!url) {
    alert('请输入有效的 API 地址');
    return;
  }
  
  apiUrl.value = url;
  await storage.setItem('local:audit_api_config', { apiUrl: url });
  showSettings.value = false;
  console.log('[Login] Updated API URL:', apiUrl.value);
};

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
        <div class="header-actions">
           <button class="icon-btn settings-btn" @click="openSettings" title="设置后端地址">
            ⚙️
          </button>
        </div>
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

     <!-- Settings Overlay -->
    <div class="settings-overlay" v-if="showSettings">
      <div class="settings-content">
        <h4>配置后端服务</h4>
        <div class="form-group">
          <label>API 地址</label>
          <input 
            type="text" 
            v-model="settingsApiUrl" 
            placeholder="例如: http://localhost:3000" 
          />
          <p class="hint">请输入后端服务的完整地址</p>
        </div>

        <div class="settings-actions">
          <button class="action-btn secondary" @click="closeSettings">取消</button>
          <button class="action-btn primary" @click="saveSettings">保存</button>
        </div>
      </div>
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
  position: relative; /* Ensure absolute children are relative to this */
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

.header-actions {
  position: absolute;
  top: 20px;
  right: 20px;
}

.icon-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover {
  background: rgba(0,0,0,0.05);
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

/* Settings Overlay Styles */
.settings-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
}

.settings-content {
  background: white;
  padding: 24px;
  border-radius: 20px;
  width: 90%;
  max-width: 320px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  animation: scaleIn 0.2s ease-out;
}

.settings-content h4 {
  margin: 0 0 20px 0;
  text-align: center;
  font-size: 18px;
  color: #1C1C1E;
}

.hint {
  font-size: 12px;
  color: #8E8E93;
  margin-top: 4px;
}

.settings-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.action-btn.primary {
  background: #007AFF;
  color: white;
}
.action-btn.secondary {
  background: #F2F2F7;
  color: #1C1C1E;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
