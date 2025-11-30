<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Lock, Key, Cpu } from '@element-plus/icons-vue';
import { API_BASE_URL } from '../config/api';

const loading = ref(false);
const saving = ref(false);

const form = ref({
  aliyunAccessKeyId: '',
  aliyunAccessKeySecret: '',
  deepSeekApiKey: '',
});

const fetchSettings = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (data.success) {
      form.value = {
        aliyunAccessKeyId: data.data.aliyunAccessKeyId || '',
        aliyunAccessKeySecret: data.data.aliyunAccessKeySecret || '',
        deepSeekApiKey: data.data.deepSeekApiKey || '',
      };
    } else {
      ElMessage.error(data.error || '获取设置失败');
    }
  } catch (error) {
    ElMessage.error('连接服务器失败');
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  saving.value = true;
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    });
    const data = await response.json();
    if (data.success) {
      ElMessage.success('设置已保存');
    } else {
      ElMessage.error(data.error || '保存设置失败');
    }
  } catch (error) {
    ElMessage.error('连接服务器失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <div class="settings-view">
    <el-card class="settings-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>

      <el-form :model="form" label-position="top">
        <el-divider content-position="left">阿里云配置 (Aliyun)</el-divider>
        
        <el-form-item label="AccessKey ID">
          <el-input v-model="form.aliyunAccessKeyId" placeholder="请输入 Aliyun AccessKey ID" :prefix-icon="Key" />
        </el-form-item>
        
        <el-form-item label="AccessKey Secret">
          <el-input v-model="form.aliyunAccessKeySecret" type="password" placeholder="请输入 Aliyun AccessKey Secret" :prefix-icon="Lock" show-password />
        </el-form-item>

        <el-divider content-position="left">DeepSeek 配置</el-divider>

        <el-form-item label="API Key">
          <el-input v-model="form.deepSeekApiKey" type="password" placeholder="请输入 DeepSeek API Key" :prefix-icon="Cpu" show-password />
        </el-form-item>

        <div class="form-actions">
          <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.settings-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}

.form-actions {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
}
</style>
