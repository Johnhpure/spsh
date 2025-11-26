<template>
  <div class="record-detail-container">
    <el-page-header @back="goBack" title="返回列表">
      <template #content>
        <span class="page-title">审核记录详情</span>
      </template>
    </el-page-header>

    <!-- 错误状态 -->
    <ErrorState
      v-if="error && !loading"
      title="加载失败"
      sub-title="审核记录详情加载失败，请点击重试按钮重新加载"
      @retry="loadRecordDetail"
    />

    <div v-loading="loading" class="detail-content">
      <template v-if="!loading && !error && record">
        <!-- 商品基本信息 -->
        <el-card class="info-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>商品基本信息</span>
            </div>
          </template>
          
          <div class="product-info">
            <div class="product-image-section">
              <el-image
                v-if="record.productImage"
                :src="record.productImage"
                :preview-src-list="[record.productImage]"
                fit="cover"
                class="product-image"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>图片加载失败</span>
                  </div>
                </template>
              </el-image>
            </div>
            
            <div class="product-details">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="商品ID">
                  {{ record.productId }}
                </el-descriptions-item>
                <el-descriptions-item label="商品标题">
                  {{ record.productTitle }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>

        <!-- 审核信息 -->
        <el-card class="info-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>审核信息</span>
            </div>
          </template>
          
          <el-descriptions :column="2" border>
            <el-descriptions-item label="审核阶段">
              <el-tag :type="getStageTagType(record.auditStage)">
                {{ getStageLabel(record.auditStage) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="失败原因">
              {{ record.rejectionReason }}
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">
              {{ formatDateTime(record.submitTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="AI处理时间">
              {{ record.aiProcessingTime }} ms
            </el-descriptions-item>
            <el-descriptions-item label="记录创建时间">
              {{ formatDateTime(record.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="record.apiError" label="API错误">
              <el-text type="danger">{{ record.apiError }}</el-text>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- API请求/响应数据 -->
        <el-card class="info-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>API请求/响应数据</span>
            </div>
          </template>
          
          <el-collapse accordion>
            <!-- 文本审核 -->
            <el-collapse-item
              v-if="record.textRequest || record.textResponse"
              title="文本审核"
              name="text"
            >
              <div v-if="record.textRequest" class="api-section">
                <h4>请求数据</h4>
                <pre class="json-content">{{ formatJSON(record.textRequest) }}</pre>
              </div>
              <div v-if="record.textResponse" class="api-section">
                <h4>响应数据</h4>
                <pre class="json-content">{{ formatJSON(record.textResponse) }}</pre>
              </div>
            </el-collapse-item>

            <!-- 图片审核 -->
            <el-collapse-item
              v-if="record.imageRequest || record.imageResponse"
              title="图片审核"
              name="image"
            >
              <div v-if="record.imageRequest" class="api-section">
                <h4>请求数据</h4>
                <pre class="json-content">{{ formatJSON(record.imageRequest) }}</pre>
              </div>
              <div v-if="record.imageResponse" class="api-section">
                <h4>响应数据</h4>
                <pre class="json-content">{{ formatJSON(record.imageResponse) }}</pre>
              </div>
            </el-collapse-item>

            <!-- 经营范围审核 -->
            <el-collapse-item
              v-if="record.scopeRequest || record.scopeResponse"
              title="经营范围审核"
              name="scope"
            >
              <div v-if="record.scopeRequest" class="api-section">
                <h4>请求数据</h4>
                <pre class="json-content">{{ formatJSON(record.scopeRequest) }}</pre>
              </div>
              <div v-if="record.scopeResponse" class="api-section">
                <h4>响应数据</h4>
                <pre class="json-content">{{ formatJSON(record.scopeResponse) }}</pre>
              </div>
            </el-collapse-item>
          </el-collapse>

          <el-empty
            v-if="!hasApiData"
            description="暂无API请求/响应数据"
            :image-size="100"
          />
        </el-card>
      </template>

      <el-empty v-if="!loading && !error && !record" description="记录不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { auditRecordAPI } from '../services/api';
import type { AuditRecord } from '../services/api';
import { ElMessage } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import ErrorState from '../components/ErrorState.vue';

const router = useRouter();
const route = useRoute();

// 状态管理
const loading = ref(false);
const error = ref(false);
const record = ref<AuditRecord | null>(null);

// 计算属性：是否有API数据
const hasApiData = computed(() => {
  if (!record.value) return false;
  return !!(
    record.value.textRequest ||
    record.value.textResponse ||
    record.value.imageRequest ||
    record.value.imageResponse ||
    record.value.scopeRequest ||
    record.value.scopeResponse
  );
});

// 加载记录详情
const loadRecordDetail = async () => {
  const recordId = route.params.id as string;
  if (!recordId) {
    ElMessage.error('记录ID不存在');
    goBack();
    return;
  }

  loading.value = true;
  error.value = false;
  try {
    record.value = await auditRecordAPI.getRecordById(recordId);
  } catch (err: any) {
    error.value = true;
    record.value = null;
  } finally {
    loading.value = false;
  }
};

// 返回列表
const goBack = () => {
  router.push('/');
};

// 格式化JSON
const formatJSON = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // 如果解析失败，返回原始字符串
    return jsonString;
  }
};

// 获取审核阶段标签类型
const getStageTagType = (stage: string) => {
  const typeMap: Record<string, any> = {
    text: 'primary',
    image: 'success',
    business_scope: 'warning'
  };
  return typeMap[stage] || 'info';
};

// 获取审核阶段标签文本
const getStageLabel = (stage: string) => {
  const labelMap: Record<string, string> = {
    text: '文本审核',
    image: '图片审核',
    business_scope: '经营范围审核'
  };
  return labelMap[stage] || stage;
};

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 组件挂载时加载数据
onMounted(() => {
  loadRecordDetail();
});
</script>

<style scoped>
.record-detail-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.detail-content {
  margin-top: 20px;
  min-height: 400px;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.product-info {
  display: flex;
  gap: 20px;
}

.product-image-section {
  flex-shrink: 0;
}

.product-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  cursor: pointer;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  background-color: #f5f7fa;
  border-radius: 8px;
  color: #909399;
}

.image-error .el-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.product-details {
  flex: 1;
}

.api-section {
  margin-bottom: 20px;
}

.api-section:last-child {
  margin-bottom: 0;
}

.api-section h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.json-content {
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  margin: 0;
  overflow-x: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
}

:deep(.el-collapse-item__header) {
  font-weight: 500;
  font-size: 15px;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .record-detail-container {
    padding: 15px;
  }
}

@media (max-width: 768px) {
  .record-detail-container {
    padding: 10px;
  }

  .page-title {
    font-size: 18px;
  }

  .product-info {
    flex-direction: column;
  }

  .product-image {
    width: 100%;
    max-width: 300px;
    height: auto;
    aspect-ratio: 1;
  }

  .image-error {
    width: 100%;
    max-width: 300px;
    height: auto;
    aspect-ratio: 1;
  }

  :deep(.el-descriptions) {
    font-size: 14px;
  }

  :deep(.el-descriptions__label) {
    width: 100px;
  }

  .card-header {
    font-size: 15px;
  }

  .json-content {
    font-size: 12px;
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 16px;
  }

  .info-card {
    margin-bottom: 15px;
  }

  :deep(.el-descriptions) {
    font-size: 12px;
  }

  :deep(.el-descriptions__label) {
    width: 80px;
  }

  .card-header {
    font-size: 14px;
  }

  .api-section h4 {
    font-size: 13px;
  }

  .json-content {
    font-size: 11px;
    padding: 8px;
  }
}
</style>
