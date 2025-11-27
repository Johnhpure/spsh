<template>
  <div class="record-detail-container">
    <div class="header-actions">
      <el-button @click="goBack" class="back-btn">
        <span class="icon">⬅</span> 返回列表
      </el-button>
    </div>

    <!-- Error State -->
    <ErrorState
      v-if="error && !loading"
      title="加载失败"
      sub-title="审核记录详情加载失败，请点击重试按钮重新加载"
      @retry="loadRecordDetail"
    />

    <div v-loading="loading" class="detail-content">
      <template v-if="!loading && !error && record">
        <!-- Basic Info -->
        <div class="info-card">
          <div class="card-header">
            <span>商品基本信息</span>
          </div>
          
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
              <div class="detail-item">
                <span class="label">商品ID</span>
                <span class="value">{{ record.productId }}</span>
              </div>
              <div class="detail-item">
                <span class="label">商品标题</span>
                <span class="value">{{ record.productTitle }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Audit Info -->
        <div class="info-card">
          <div class="card-header">
            <span>审核信息</span>
          </div>
          
          <div class="details-grid">
            <div class="detail-item">
              <span class="label">审核阶段</span>
              <span class="value">
                <span class="stage-badge" :class="record.auditStage">
                  {{ getStageLabel(record.auditStage) }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="label">失败原因</span>
              <span class="value reason-text">{{ record.rejectionReason }}</span>
            </div>
            <div class="detail-item">
              <span class="label">提交时间</span>
              <span class="value">{{ formatDateTime(record.submitTime) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">AI处理时间</span>
              <span class="value">{{ record.aiProcessingTime }} ms</span>
            </div>
            <div class="detail-item">
              <span class="label">记录创建时间</span>
              <span class="value">{{ formatDateTime(record.createdAt) }}</span>
            </div>
            <div v-if="record.apiError" class="detail-item full-width">
              <span class="label">API错误</span>
              <span class="value error-text">{{ record.apiError }}</span>
            </div>
          </div>
        </div>

        <!-- API Data -->
        <div class="info-card">
          <div class="card-header">
            <span>API请求/响应数据</span>
          </div>
          
          <el-collapse accordion class="custom-collapse">
            <!-- Text Audit -->
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

            <!-- Image Audit -->
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

            <!-- Scope Audit -->
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
        </div>
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

// State
const loading = ref(false);
const error = ref(false);
const record = ref<AuditRecord | null>(null);

// Computed
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

// Load Data
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

// Back
const goBack = () => {
  router.push('/records');
};

// Helpers
const formatJSON = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return jsonString;
  }
};

const getStageLabel = (stage: string) => {
  const labelMap: Record<string, string> = {
    text: '文本审核',
    image: '图片审核',
    business_scope: '经营范围审核'
  };
  return labelMap[stage] || stage;
};

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

onMounted(() => {
  loadRecordDetail();
});
</script>

<style scoped>
.record-detail-container {
  animation: fadeIn 0.5s ease;
  max-width: 1200px;
  margin: 0 auto;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-actions {
  margin-bottom: 24px;
}

.back-btn {
  border-radius: 50px;
  padding: 10px 20px;
  font-weight: 600;
  border: none;
  background: white;
  box-shadow: var(--ui-shadow);
  color: var(--ui-text-main);
  transition: all 0.2s;
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--ui-shadow-hover);
  background: white;
  color: var(--ui-primary);
}

.info-card {
  background: var(--ui-card-bg);
  border-radius: var(--ui-card-radius);
  box-shadow: var(--ui-shadow);
  padding: 32px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.info-card:hover {
  box-shadow: var(--ui-shadow-hover);
}

.card-header {
  font-size: 18px;
  font-weight: 700;
  color: var(--ui-text-main);
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ui-border);
}

.product-info {
  display: flex;
  gap: 32px;
}

.product-image-section {
  flex-shrink: 0;
}

.product-image {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  box-shadow: var(--ui-shadow);
  transition: all 0.3s ease;
}

.product-image:hover {
  transform: scale(1.02);
  box-shadow: var(--ui-shadow-hover);
}

.image-error {
  width: 200px;
  height: 200px;
  background-color: #f2f2f7;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-sub);
}

.product-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item .label {
  font-size: 13px;
  color: var(--ui-text-sub);
  font-weight: 600;
  text-transform: uppercase;
}

.detail-item .value {
  font-size: 16px;
  color: var(--ui-text-main);
  font-weight: 500;
}

.reason-text {
  color: #FF3B30;
}

.error-text {
  color: #FF3B30;
  font-family: monospace;
}

.stage-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  background: #f2f2f7;
  color: var(--ui-text-sub);
}

.stage-badge.text { background: rgba(0, 122, 255, 0.1); color: #007AFF; }
.stage-badge.image { background: rgba(52, 199, 89, 0.1); color: #34C759; }
.stage-badge.business_scope { background: rgba(255, 149, 0, 0.1); color: #FF9500; }

/* Custom Collapse */
.custom-collapse {
  border: none;
}

:deep(.el-collapse-item__header) {
  font-size: 16px;
  font-weight: 600;
  color: var(--ui-text-main);
  border-bottom: 1px solid var(--ui-border);
  background: transparent;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: 1px solid var(--ui-border);
  background: transparent;
}

:deep(.el-collapse-item__content) {
  padding: 24px 0;
}

.api-section {
  margin-bottom: 24px;
}

.api-section:last-child {
  margin-bottom: 0;
}

.api-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text-sub);
  text-transform: uppercase;
}

.json-content {
  background: #f2f2f7;
  border-radius: 12px;
  padding: 20px;
  margin: 0;
  overflow-x: auto;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ui-text-main);
}

/* Responsive */
@media (max-width: 768px) {
  .product-info {
    flex-direction: column;
    align-items: center;
  }
  
  .product-details {
    width: 100%;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
