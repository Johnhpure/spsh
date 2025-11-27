<template>
  <div class="error-state">
    <div class="error-content">
      <div class="error-icon">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="url(#errorGradient)" opacity="0.1"/>
          <circle cx="100" cy="100" r="60" fill="url(#errorGradient)" opacity="0.2"/>
          <path d="M100 60 L100 110 M100 130 L100 140" stroke="url(#errorGradient)" stroke-width="8" stroke-linecap="round"/>
          <defs>
            <linearGradient id="errorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f56c6c" />
              <stop offset="100%" stop-color="#f093fb" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h3 class="error-title">{{ title }}</h3>
      <p class="error-subtitle">{{ subTitle }}</p>
      <el-button type="primary" size="large" @click="handleRetry" class="retry-button">
        <el-icon class="el-icon--left"><RefreshRight /></el-icon>
        重新加载
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue';

interface Props {
  title?: string;
  subTitle?: string;
}

interface Emits {
  (e: 'retry'): void;
}

withDefaults(defineProps<Props>(), {
  title: '加载失败',
  subTitle: '数据加载失败，请点击重试按钮重新加载'
});

const emit = defineEmits<Emits>();

const handleRetry = () => {
  emit('retry');
};
</script>

<style scoped>
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  padding: 40px 20px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  width: 200px;
  height: 200px;
  margin: 0 auto 32px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f56c6c 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-subtitle {
  font-size: 16px;
  color: #909399;
  margin-bottom: 32px;
  line-height: 1.6;
}

.retry-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.retry-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

@media (max-width: 768px) {
  .error-state {
    min-height: 400px;
    padding: 30px 15px;
  }

  .error-icon {
    width: 150px;
    height: 150px;
    margin-bottom: 24px;
  }

  .error-title {
    font-size: 24px;
  }

  .error-subtitle {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .retry-button {
    padding: 12px 24px;
    font-size: 14px;
  }
}
</style>
