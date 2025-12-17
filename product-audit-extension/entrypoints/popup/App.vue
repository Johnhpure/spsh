<template>
  <div class="settings-container">
    <h2>API 接口设置</h2>
    
    <el-form :model="form" label-width="100px" label-position="top">
      <el-form-item label="API 地址">
        <el-input 
          v-model="form.apiUrl" 
          placeholder="http://192.168.1.8:3000/api"
          clearable
        />
        <div class="hint">请输入完整的 API 地址，包括协议和端口</div>
      </el-form-item>

      <el-form-item>
        <el-space>
          <el-button type="primary" @click="saveConfig" :loading="saving">
            保存配置
          </el-button>
          <el-button @click="testConnection" :loading="testing">
            测试连接
          </el-button>
          <el-button @click="resetDefault">
            恢复默认
          </el-button>
        </el-space>
      </el-form-item>
    </el-form>

    <el-divider />

    <div class="info">
      <p><strong>当前配置：</strong>{{ currentConfig }}</p>
      <p><strong>默认地址：</strong>http://192.168.1.8:3000/api</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { storage } from 'wxt/storage';
import { browser } from 'wxt/browser';

interface ApiConfig {
  url: string;
  key?: string;
}

const DEFAULT_URL = 'http://192.168.1.8:3000/api';

const form = ref({
  apiUrl: DEFAULT_URL
});

const currentConfig = ref(DEFAULT_URL);
const saving = ref(false);
const testing = ref(false);

// 加载配置
onMounted(async () => {
  const config = await storage.getItem<ApiConfig>('local:audit_api_config');
  if (config?.url) {
    form.value.apiUrl = config.url;
    currentConfig.value = config.url;
  }
});

// 保存配置
const saveConfig = async () => {
  if (!form.value.apiUrl) {
    ElMessage.warning('请输入 API 地址');
    return;
  }

  saving.value = true;
  try {
    await storage.setItem('local:audit_api_config', {
      url: form.value.apiUrl
    });
    currentConfig.value = form.value.apiUrl;
    ElMessage.success('配置保存成功');
  } catch (error) {
    ElMessage.error('保存失败：' + error);
  } finally {
    saving.value = false;
  }
};

// 测试连接
const testConnection = async () => {
  if (!form.value.apiUrl) {
    ElMessage.warning('请输入 API 地址');
    return;
  }

  testing.value = true;
  try {
    const baseUrl = form.value.apiUrl.replace(/\/api$/, '');
    const healthUrl = `${baseUrl}/health`;

    const response = await browser.runtime.sendMessage({
      type: 'API_REQUEST',
      payload: {
        url: healthUrl,
        options: { method: 'GET' }
      }
    });

    if (response.success) {
      ElMessage.success('连接成功！服务器响应正常');
    } else {
      ElMessage.error('连接失败：' + response.error);
    }
  } catch (error) {
    ElMessage.error('测试失败：' + error);
  } finally {
    testing.value = false;
  }
};

// 恢复默认
const resetDefault = () => {
  form.value.apiUrl = DEFAULT_URL;
  ElMessage.info('已恢复默认地址，请点击保存');
};
</script>

<style scoped>
.settings-container {
  width: 400px;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #303133;
}

.hint {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.info {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.info p {
  margin: 5px 0;
}
</style>
