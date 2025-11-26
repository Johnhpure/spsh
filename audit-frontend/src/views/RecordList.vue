<template>
  <div class="record-list-container">
    <h1 class="page-title">审核记录列表</h1>
    
    <!-- 筛选面板 -->
    <FilterPanel
      :initial-filters="currentFilters"
      @apply="handleFilterApply"
      @reset="handleFilterReset"
    />
    
    <!-- 导出按钮 -->
    <div class="action-bar">
      <el-button
        type="primary"
        :loading="exporting"
        :disabled="loading || error"
        @click="handleExport"
      >
        导出CSV
      </el-button>
    </div>
    
    <!-- 导出进度条 -->
    <el-progress
      v-if="exporting"
      :percentage="100"
      :indeterminate="true"
      class="export-progress"
    />
    
    <!-- 错误状态 -->
    <ErrorState
      v-if="error && !loading"
      title="加载失败"
      sub-title="审核记录加载失败，请点击重试按钮重新加载"
      @retry="loadRecords"
    />
    
    <!-- 数据表格 -->
    <template v-if="!error">
      <el-table
        v-loading="loading"
        :data="records"
        style="width: 100%"
        @row-click="handleRowClick"
        class="record-table"
      >
        <el-table-column prop="productId" label="商品ID" width="150" />
        <el-table-column prop="productTitle" label="标题" min-width="200" />
        <el-table-column label="主图" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.productImage"
              :src="row.productImage"
              :preview-src-list="[row.productImage]"
              fit="cover"
              class="product-thumbnail"
            />
          </template>
        </el-table-column>
        <el-table-column prop="rejectionReason" label="失败原因" min-width="200" />
        <el-table-column label="审核阶段" width="150">
          <template #default="{ row }">
            <el-tag :type="getStageTagType(row.auditStage)">
              {{ getStageLabel(row.auditStage) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.submitTime) }}
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && records.length === 0" description="暂无数据" />

      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
        class="pagination"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { auditRecordAPI } from '../services/api';
import type { AuditRecord, PaginatedResult, QueryFilters } from '../services/api';
import { ElMessage } from 'element-plus';
import FilterPanel from '../components/FilterPanel.vue';
import ErrorState from '../components/ErrorState.vue';

const router = useRouter();

// 状态管理
const loading = ref(false);
const exporting = ref(false);
const error = ref(false);
const records = ref<AuditRecord[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
});
const currentFilters = ref<QueryFilters>({});

// 加载数据
const loadRecords = async () => {
  loading.value = true;
  error.value = false;
  try {
    const result: PaginatedResult<AuditRecord> = await auditRecordAPI.getRecords(
      currentFilters.value,
      {
        page: currentPage.value,
        limit: pageSize.value
      }
    );
    records.value = result.records;
    pagination.value = result.pagination;
  } catch (err: any) {
    error.value = true;
    records.value = [];
  } finally {
    loading.value = false;
  }
};

// 筛选应用处理
const handleFilterApply = (filters: QueryFilters) => {
  currentFilters.value = filters;
  currentPage.value = 1; // 重置到第一页
  loadRecords();
};

// 筛选重置处理
const handleFilterReset = () => {
  currentFilters.value = {};
  currentPage.value = 1; // 重置到第一页
  loadRecords();
};

// 页码变化处理
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadRecords();
};

// 每页数量变化处理
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadRecords();
};

// 行点击事件
const handleRowClick = (row: AuditRecord) => {
  router.push(`/records/${row.id}`);
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

// 导出CSV处理
const handleExport = async () => {
  exporting.value = true;
  try {
    // 调用API导出数据，传递当前筛选条件
    const blob = await auditRecordAPI.exportRecords(currentFilters.value);
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 生成文件名（包含当前日期）
    const date = new Date().toISOString().split('T')[0];
    link.download = `audit-records-${date}.csv`;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    ElMessage.success('导出成功');
  } catch (err: any) {
    // Error message already shown by axios interceptor
  } finally {
    exporting.value = false;
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadRecords();
});
</script>

<style scoped>
.record-list-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.record-table {
  margin-bottom: 20px;
}

.record-table :deep(.el-table__row) {
  cursor: pointer;
}

.record-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.product-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.export-progress {
  margin-bottom: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .record-list-container {
    padding: 10px;
  }

  .page-title {
    font-size: 20px;
    margin-bottom: 15px;
  }

  .action-bar {
    justify-content: stretch;
  }

  .action-bar .el-button {
    width: 100%;
  }

  .pagination {
    flex-wrap: wrap;
  }

  :deep(.el-pagination) {
    justify-content: center;
  }

  :deep(.el-table) {
    font-size: 12px;
  }

  :deep(.el-table__cell) {
    padding: 8px 0;
  }
}

@media (max-width: 480px) {
  .product-thumbnail {
    width: 40px;
    height: 40px;
  }

  :deep(.el-table) {
    font-size: 11px;
  }
}
</style>
