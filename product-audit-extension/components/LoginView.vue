<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo">
        <span class="logo-icon">🛡️</span>
        <h2>商品审核助手</h2>
      </div>
      
      <el-form :model="form" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" show-password />
        </el-form-item>
        
        <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
        
        <div v-if="error" class="error-msg">{{ error }}</div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storage } from 'wxt/storage';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';

const emit = defineEmits(['login-success']);

const form = ref({
  username: '',
  password: ''
});
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  if (!form.value.username || !form.value.password) {
    error.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // Get API URL from storage or default
    const storedApiUrl = await storage.getItem<string>('local:audit_api_url');
    const apiUrl = storedApiUrl || 'http://localhost:3000/api';

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });

    const data = await response.json();

    if (data.success) {
      // Save token and user info
      await storage.setItem('local:auth_token', data.token);
      await storage.setItem('local:user_info', data.user);
      
      ElMessage.success('登录成功');
      emit('login-success');
    } else {
      error.value = data.error || '登录失败';
    }
  } catch (e) {
    error.value = '连接服务器失败';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f5f7fa;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 320px;
}

.logo {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.logo h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
}

.login-btn {
  width: 100%;
  margin-top: 16px;
  height: 40px;
  border-radius: 20px;
}

.error-msg {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 12px;
  text-align: center;
}
</style>
