<template>
  <div class="record-list-container">
    <!-- Filter Panel -->
    <FilterPanel
      :initial-filters="currentFilters"
      @apply="handleFilterApply"
      @reset="handleFilterReset"
    />
    
    <!-- Action Bar -->
    <div class="action-bar">
      <el-button 
        @click="syncExternalData" 
        :loading="syncing" 
        style="margin-right: 12px; border-radius: 50px;"
      >
        🔄 同步外部数据
      </el-button>
      <el-button
        type="primary"
        class="export-btn"
        :loading="exporting"
        :disabled="loading || error"
        @click="handleExport"
      >
        <span class="btn-icon">📥</span> 导出 CSV
      </el-button>
    </div>
    
    <!-- Export Progress -->
    <el-progress
      v-if="exporting"
      :percentage="100"
      :indeterminate="true"
      class="export-progress"
    />
    
    <!-- Error State -->
    <ErrorState
      v-if="error && !loading"
      title="加载失败"
      sub-title="审核记录加载失败，请点击重试按钮重新加载"
      @retry="loadRecords"
    />
    
    <!-- Data Table -->
    <template v-if="!error">
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="records"
          style="width: 100%"
          @row-click="handleRowClick"
          class="record-table"
          :header-cell-style="{ background: '#f8f9fa', color: '#8E8E93', fontWeight: '600' }"
        >
          <el-table-column prop="productId" label="商品ID" width="150">
            <template #default="{ row }">
              <span class="id-cell">#{{ row.productId }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="productTitle" label="标题" min-width="200">
            <template #default="{ row }">
              <span class="title-cell">{{ row.productTitle }}</span>
            </template>
          </el-table-column>
          <el-table-column label="主图" width="100">
            <template #default="{ row }">
              <div class="image-wrapper">
                <el-image
                  v-if="row.productImage"
                  :src="row.productImage"
                  :preview-src-list="[row.productImage]"
                  fit="cover"
                  class="product-thumbnail"
                  @click.stop
                />
                <div v-else class="no-image">No Img</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="rejectionReason" label="失败原因" min-width="200">
            <template #default="{ row }">
              <span class="reason-cell">{{ row.rejectionReason }}</span>
            </template>
          </el-table-column>
          <el-table-column label="审核阶段" width="150">
            <template #default="{ row }">
              <span class="stage-badge" :class="row.auditStage">
                {{ getStageLabel(row.auditStage) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="180">
            <template #default="{ row }">
              <span class="time-cell">{{ formatDateTime(row.submitTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="username" label="审核员" width="120">
            <template #default="{ row }">
              <span class="auditor-cell">{{ row.username || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="外部结果" width="120">
            <template #default="{ row }">
              <el-button 
                v-if="externalDataMap[row.productId]" 
                size="small" 
                type="warning" 
                plain
                @click.stop="showExternalDetail(externalDataMap[row.productId])"
              >
                查看结果
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-if="!loading && records.length === 0" description="暂无数据" />

      <div class="pagination-wrapper">
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
      </div>
    </template>

    <!-- External Detail Modal -->
    <el-dialog v-model="showExternalModal" title="外部审核结果" width="500px">
      <div v-if="currentExternalDetail" class="external-detail">
        <p><strong>商品ID:</strong> {{ currentExternalDetail.productId }}</p>
        <p><strong>失败原因:</strong> {{ currentExternalDetail.reason }}</p>
        <p><strong>审核阶段:</strong> {{ currentExternalDetail.stage }}</p>
        <p><strong>审核员:</strong> {{ currentExternalDetail.auditor }}</p>
      </div>
    </el-dialog>
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

// State
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

// External Data State
const syncing = ref(false);
const externalDataMap = ref<Record<string, any>>({});
const showExternalModal = ref(false);
const currentExternalDetail = ref<any>(null);

// Load Data
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

// Filter Handlers
const handleFilterApply = (filters: QueryFilters) => {
  currentFilters.value = filters;
  currentPage.value = 1;
  loadRecords();
};

const handleFilterReset = () => {
  currentFilters.value = {};
  currentPage.value = 1;
  loadRecords();
};

// Pagination Handlers
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadRecords();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadRecords();
};

// Row Click
const handleRowClick = (row: AuditRecord) => {
  router.push(`/records/${row.id}`);
};

// Helpers
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

// Export
const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await auditRecordAPI.exportRecords(currentFilters.value);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `audit-records-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (err: any) {
    // Error handled by interceptor
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  loadRecords();
});

// External Data Logic
const syncExternalData = async () => {
  syncing.value = true;
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('http://localhost:3000/api/proxy/external-audit-list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    if (data.code === 200 && data.data && data.data.list) {
      const map: Record<string, any> = {};
      data.data.list.forEach((item: any) => {
        map[item.productId] = {
            productId: item.productId,
            reason: item.auditReason || item.reason,
            stage: item.auditStage || item.stage,
            auditor: item.auditUser || item.auditor
        };
      });
      externalDataMap.value = map;
      ElMessage.success(`同步成功，获取到 ${data.data.list.length} 条记录`);
    } else {
      ElMessage.warning('未能获取到有效数据');
    }
  } catch (e) {
    ElMessage.error('同步失败: ' + e);
  } finally {
    syncing.value = false;
  }
};

const showExternalDetail = (detail: any) => {
  currentExternalDetail.value = detail;
  showExternalModal.value = true;
};
</script>

<style scoped>
.record-list-container {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.action-bar {
  margin-bottom: 24px;
  display: flex;
  justify-content: flex-end;
}

.export-btn {
  border-radius: 50px;
  padding: 10px 24px;
  font-weight: 600;
  background-color: var(--ui-primary);
  border: none;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-btn:hover {
  background-color: var(--ui-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.table-container {
  background: var(--ui-card-bg);
  border-radius: var(--ui-card-radius);
  box-shadow: var(--ui-shadow);
  overflow: hidden;
  margin-bottom: 24px;
}

.record-table :deep(.el-table__row) {
  cursor: pointer;
  transition: background-color 0.2s;
}

.record-table :deep(.el-table__row:hover) {
  background-color: #f8f9fa;
}

.id-cell {
  font-family: monospace;
  color: var(--ui-text-sub);
  font-weight: 600;
}

.title-cell {
  font-weight: 500;
  color: var(--ui-text-main);
}

.image-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #f2f2f7;
}

.product-thumbnail {
  width: 100%;
  height: 100%;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--ui-text-sub);
}

.reason-cell {
  color: #FF3B30;
}

.stage-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: #f2f2f7;
  color: var(--ui-text-sub);
}

.stage-badge.text { background: rgba(0, 122, 255, 0.1); color: #007AFF; }
.stage-badge.image { background: rgba(52, 199, 89, 0.1); color: #34C759; }
.stage-badge.business_scope { background: rgba(255, 149, 0, 0.1); color: #FF9500; }

.time-cell {
  color: var(--ui-text-sub);
  font-size: 13px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.pagination :deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
  background-color: var(--ui-primary);
}
</style>
