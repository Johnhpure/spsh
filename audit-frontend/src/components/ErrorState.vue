<template>
  <div class="error-state">
    <el-result
      icon="error"
      :title="title"
      :sub-title="subTitle"
    >
      <template #extra>
        <el-button type="primary" @click="handleRetry">
          <el-icon class="el-icon--left"><RefreshRight /></el-icon>
          重试
        </el-button>
      </template>
    </el-result>
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
  min-height: 400px;
  padding: 20px;
}

:deep(.el-result__icon svg) {
  width: 64px;
  height: 64px;
}

:deep(.el-result__title) {
  margin-top: 20px;
}
</style>
