<template>
  <div class="filter-panel">
    <el-card shadow="never">
      <div class="filter-form">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <div class="filter-item">
              <label class="filter-label">商品ID</label>
              <el-input
                v-model="filters.productId"
                placeholder="请输入商品ID"
                clearable
              />
            </div>
          </el-col>

          <el-col :xs="24" :sm="12" :md="6">
            <div class="filter-item">
              <label class="filter-label">审核阶段</label>
              <el-select
                v-model="filters.stage"
                placeholder="请选择审核阶段"
                clearable
                style="width: 100%"
              >
                <el-option label="文本审核" value="text" />
                <el-option label="图片审核" value="image" />
                <el-option label="经营范围审核" value="business_scope" />
              </el-select>
            </div>
          </el-col>

          <el-col :xs="24" :sm="12" :md="6">
            <div class="filter-item">
              <label class="filter-label">时间范围</label>
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </div>
          </el-col>

          <el-col :xs="24" :sm="12" :md="6">
            <div class="filter-item">
              <label class="filter-label">关键词搜索</label>
              <el-input
                v-model="filters.keyword"
                placeholder="搜索失败原因"
                clearable
              />
            </div>
          </el-col>
        </el-row>

        <el-row class="button-row">
          <el-col>
            <el-button type="primary" @click="handleApply">
              应用筛选
            </el-button>
            <el-button @click="handleReset">
              重置
            </el-button>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { QueryFilters } from '../services/api';

// Props
interface Props {
  initialFilters?: QueryFilters;
}

const props = withDefaults(defineProps<Props>(), {
  initialFilters: () => ({})
});

// Emits
interface Emits {
  (e: 'apply', filters: QueryFilters): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

// 状态管理
const filters = ref<QueryFilters>({
  productId: props.initialFilters?.productId || '',
  stage: props.initialFilters?.stage || undefined,
  keyword: props.initialFilters?.keyword || ''
});

const dateRange = ref<[string, string] | null>(
  props.initialFilters?.startDate && props.initialFilters?.endDate
    ? [props.initialFilters.startDate, props.initialFilters.endDate]
    : null
);

// 监听日期范围变化
watch(dateRange, (newValue) => {
  if (newValue && newValue.length === 2) {
    filters.value.startDate = newValue[0];
    filters.value.endDate = newValue[1];
  } else {
    delete filters.value.startDate;
    delete filters.value.endDate;
  }
});

// 应用筛选
const handleApply = () => {
  // 清理空值
  const cleanedFilters: QueryFilters = {};
  
  if (filters.value.productId?.trim()) {
    cleanedFilters.productId = filters.value.productId.trim();
  }
  
  if (filters.value.stage) {
    cleanedFilters.stage = filters.value.stage;
  }
  
  if (filters.value.keyword?.trim()) {
    cleanedFilters.keyword = filters.value.keyword.trim();
  }
  
  if (filters.value.startDate) {
    cleanedFilters.startDate = filters.value.startDate;
  }
  
  if (filters.value.endDate) {
    cleanedFilters.endDate = filters.value.endDate;
  }
  
  emit('apply', cleanedFilters);
};

// 重置筛选
const handleReset = () => {
  filters.value = {
    productId: '',
    stage: undefined,
    keyword: ''
  };
  dateRange.value = null;
  emit('reset');
};
</script>

<style scoped>
.filter-panel {
  margin-bottom: 24px;
}

.filter-panel :deep(.el-card) {
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.filter-panel :deep(.el-card:hover) {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.filter-form {
  padding: 16px 0;
}

.filter-item {
  margin-bottom: 20px;
}

.filter-label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  color: #606266;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.filter-item :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.filter-item :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.filter-item :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
}

.filter-item :deep(.el-select) {
  width: 100%;
}

.filter-item :deep(.el-date-editor) {
  width: 100%;
}

.button-row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 12px;
}

.button-row :deep(.el-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.button-row :deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.button-row :deep(.el-button:not(.el-button--primary)) {
  border-radius: 10px;
  transition: all 0.3s ease;
}

.button-row :deep(.el-button:not(.el-button--primary):hover) {
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .filter-item {
    margin-bottom: 12px;
  }
  
  .button-row {
    margin-top: 5px;
  }
}
</style>
