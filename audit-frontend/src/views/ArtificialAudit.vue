<template>
  <div class="artificial-audit-container">
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">人工终审</h1>
          <el-tag v-if="selectedShop" type="info" closable @close="handleShopClick(selectedShop)" class="filter-tag">
            店铺: {{ selectedShop }}
          </el-tag>
        </div>
        <div class="stats-badge">
          <span class="badge-label">待审核</span>
          <span class="badge-count">{{ total }}</span>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <div v-if="selectedShop" class="batch-actions">
        <el-button type="success" @click="handleBatchApprove" :disabled="!selectedRows.length">
          批量通过 ({{ selectedRows.length }})
        </el-button>
        <el-button type="danger" @click="handleBatchReject" :disabled="!selectedRows.length">
          批量拒绝 ({{ selectedRows.length }})
        </el-button>
      </div>
      <el-table 
        :data="tableData" 
        v-loading="loading"
        class="audit-table"
        :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: '600' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="selectedShop" type="selection" width="55" align="center" />
        <el-table-column prop="productId" label="ID" width="80" align="center" />
        <el-table-column label="商品信息" min-width="350">
          <template #default="{ row }">
            <div class="product-card">
              <el-image 
                :src="row.productImage" 
                class="product-image" 
                fit="cover" 
                :preview-src-list="[row.productImage]"
                :preview-teleported="true"
              >
                <template #error>
                  <div class="image-error">
                    <i class="el-icon-picture-outline"></i>
                  </div>
                </template>
              </el-image>
              <div class="product-details">
                <div class="product-title" :title="row.productTitle">{{ row.productTitle }}</div>
                <div class="product-price">¥{{ row.price }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="160">
          <template #default="{ row }">
            <div class="category-tag">
              <el-image v-if="row.categoryImage" :src="row.categoryImage" class="category-icon" fit="cover" />
              <span class="category-name">{{ row.categoryName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="shopName" label="店铺" width="180">
          <template #default="{ row }">
            <div 
              class="shop-name" 
              :class="{ 'shop-selected': selectedShop === row.shopName }"
              @click="handleShopClick(row.shopName)"
            >
              {{ row.shopName }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="rejectionReason" label="拒绝原因" min-width="220">
          <template #default="{ row }">
            <el-tag v-if="row.rejectionReason" type="danger" effect="light" class="reason-tag">
              {{ row.rejectionReason }}
            </el-tag>
            <span v-else class="no-reason">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button 
                type="success" 
                size="small" 
                @click="handleApprove(row)"
                class="approve-btn"
              >
                <i class="el-icon-check"></i> 通过
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="handleReject(row)"
                class="reject-btn"
              >
                <i class="el-icon-close"></i> 拒绝
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="applyFilter"
          background
        />
      </div>
    </div>

    <el-dialog
      v-model="showLoginDialog"
      title="登录 Pinhaopin Admin"
      width="420px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="login-dialog"
    >
      <el-form :model="loginForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="handlePinhaopinLogin" :loading="loginLoading" size="large" style="width: 100%">
          登录
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { auditRecordAPI, type AuditRecord } from '../services/api';
import { API_SERVER_URL } from '../config/api';

const tableData = ref<AuditRecord[]>([]);
const allData = ref<AuditRecord[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(100);
const selectedShop = ref<string>('');
const selectedRows = ref<AuditRecord[]>([]);

// Login State
const showLoginDialog = ref(false);
const loginLoading = ref(false);
const loginForm = reactive({
  username: '',
  password: ''
});

const checkLogin = () => {
  const cookie = localStorage.getItem('pinhaopin_cookie');
  if (!cookie) {
    showLoginDialog.value = true;
  } else {
    fetchData();
  }
};

const handlePinhaopinLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }

  loginLoading.value = true;
  try {
    const res = await fetch(`${API_SERVER_URL}/api/proxy/pinhaopin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });
    const data = await res.json();
    
    if (data.code === 200 && data.data?.cookies) {
       // Save cookies
       localStorage.setItem('pinhaopin_cookie', data.data.cookies.join('; '));
       ElMessage.success('登录成功');
       showLoginDialog.value = false;
       fetchData();
    } else {
       ElMessage.error(data.msg || data.message || '登录失败');
    }
  } catch (e) {
    ElMessage.error('登录请求失败');
  } finally {
    loginLoading.value = false;
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    let page = 1;
    const limit = 100;
    const allRecords: AuditRecord[] = [];
    
    while (true) {
      const result = await auditRecordAPI.getRecords(
        { manualStatus: 'pending' },
        { page, limit }
      );
      allRecords.push(...result.records);
      if (result.records.length < limit) break;
      page++;
    }
    
    allData.value = allRecords;
    applyFilter();
  } catch (e) {
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
};

const applyFilter = () => {
  let filtered: AuditRecord[];
  if (selectedShop.value) {
    filtered = allData.value.filter(item => item.shopName === selectedShop.value);
  } else {
    filtered = allData.value;
  }
  
  total.value = filtered.length;
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  tableData.value = filtered.slice(start, end);
};

const handleShopClick = (shopName: string) => {
  if (selectedShop.value === shopName) {
    selectedShop.value = '';
  } else {
    selectedShop.value = shopName;
  }
  selectedRows.value = [];
  currentPage.value = 1;
  applyFilter();
};

const handleSelectionChange = (rows: AuditRecord[]) => {
  selectedRows.value = rows;
};

const handleBatchApprove = async () => {
  try {
    await ElMessageBox.confirm(`确定要批量通过 ${selectedRows.value.length} 个商品吗？`, '提示', {
      type: 'warning'
    });
    
    const cookie = localStorage.getItem('pinhaopin_cookie');
    if (!cookie) {
      showLoginDialog.value = true;
      return;
    }

    loading.value = true;
    for (const row of selectedRows.value) {
      const res = await fetch(`${API_SERVER_URL}/api/proxy/pinhaopin/auditProduct`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Pinhaopin-Cookie': cookie
        },
        body: JSON.stringify({ id: Number(row.productId), status: 'online' })
      });
      const data = await res.json();
      if (!(data.code === 200 || data.code === 'OK' || data.success === true)) {
        throw new Error(data.msg || data.Message || '外部接口调用失败');
      }
    }
    
    ElMessage.success('批量操作成功');
    selectedRows.value = [];
    fetchData();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '批量操作失败');
  } finally {
    loading.value = false;
  }
};

const handleBatchReject = async () => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '批量拒绝');
    
    const cookie = localStorage.getItem('pinhaopin_cookie');
    if (!cookie) {
      showLoginDialog.value = true;
      return;
    }

    loading.value = true;
    const productIds = selectedRows.value.map(row => Number(row.productId));
    const res = await fetch(`${API_SERVER_URL}/api/proxy/pinhaopin/batchAuditProduct`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Pinhaopin-Cookie': cookie
      },
      body: JSON.stringify({ 
        productIds,
        status: 'rejected',
        auditReason: reason
      })
    });
    const data = await res.json();

    if (!(data.code === 200 || data.code === 'OK' || data.success === true)) {
      throw new Error(data.msg || data.Message || '外部接口调用失败');
    }

    ElMessage.success('批量操作成功');
    selectedRows.value = [];
    fetchData();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '批量操作失败');
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (row: AuditRecord) => {
  try {
    await ElMessageBox.confirm(`确定要通过商品 "${row.productTitle}" 吗？`, '提示', {
      type: 'warning'
    });
    
    const cookie = localStorage.getItem('pinhaopin_cookie');
    if (!cookie) {
      showLoginDialog.value = true;
      return;
    }

    // 1. Call External API
    const res = await fetch(`${API_SERVER_URL}/api/proxy/pinhaopin/auditProduct`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Pinhaopin-Cookie': cookie
      },
      body: JSON.stringify({ id: Number(row.productId), status: 'online' })
    });
    const data = await res.json();

    if (!(data.code === 200 || data.code === 'OK' || data.success === true)) {
       throw new Error(data.msg || data.Message || '外部接口调用失败');
    }

    // 2. Update Local Status - Handled by Backend Proxy
    // await auditRecordAPI.updateManualStatus(row.id, 'approved');
    ElMessage.success('操作成功');
    fetchData();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleReject = async (row: AuditRecord) => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝', {
      inputValue: row.rejectionReason
    });
    
    const cookie = localStorage.getItem('pinhaopin_cookie');
    if (!cookie) {
      showLoginDialog.value = true;
      return;
    }

    // 1. Call External API
    const res = await fetch(`${API_SERVER_URL}/api/proxy/pinhaopin/batchAuditProduct`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Pinhaopin-Cookie': cookie
      },
      body: JSON.stringify({ 
        productIds: [Number(row.productId)], 
        status: 'rejected',
        auditReason: reason
      })
    });
    const data = await res.json();

    if (!(data.code === 200 || data.code === 'OK' || data.success === true)) {
       throw new Error(data.msg || data.Message || '外部接口调用失败');
    }

    // 2. Update Local Status - Handled by Backend Proxy
    // await auditRecordAPI.updateManualStatus(row.id, 'rejected', reason);
    ElMessage.success('操作成功');
    fetchData();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

onMounted(() => {
  checkLogin();
});
</script>

<style scoped>
.artificial-audit-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  padding: 32px;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px 40px;
  margin-bottom: 32px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: 0.5px;
}

.filter-tag {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  font-size: 14px;
  padding: 8px 16px;
}

.filter-tag :deep(.el-tag__close) {
  color: #ffffff;
}

.stats-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
}

.badge-count {
  background: #ffffff;
  color: #667eea;
  font-size: 18px;
  font-weight: 700;
  padding: 4px 16px;
  border-radius: 20px;
  min-width: 40px;
  text-align: center;
}

.content-wrapper {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.batch-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #cbd5e1;
}

.batch-actions .el-button {
  font-weight: 600;
  border-radius: 8px;
}

.audit-table {
  border-radius: 12px;
  overflow: hidden;
}

.audit-table :deep(.el-table__header-wrapper) {
  border-radius: 12px 12px 0 0;
}

.product-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.product-image {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.image-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #cbd5e1;
  font-size: 24px;
}

.product-details {
  flex: 1;
  min-width: 0;
}

.product-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 6px;
}

.product-price {
  font-size: 18px;
  font-weight: 700;
  color: #ef4444;
  letter-spacing: 0.5px;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.category-tag:hover {
  background: #e2e8f0;
}

.category-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

.category-name {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.shop-name {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
  display: inline-block;
}

.shop-name:hover {
  background: #f1f5f9;
  color: #667eea;
}

.shop-selected {
  background: #667eea;
  color: #ffffff;
}

.shop-selected:hover {
  background: #5568d3;
  color: #ffffff;
}

.reason-tag {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 6px;
}

.no-reason {
  color: #cbd5e1;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.approve-btn, .reject-btn {
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.approve-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.reject-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.pagination-wrapper {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}

.pagination-wrapper :deep(.el-pagination) {
  gap: 8px;
}

.pagination-wrapper :deep(.el-pager li) {
  border-radius: 8px;
  font-weight: 600;
}

.login-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.login-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  padding: 24px;
}

.login-dialog :deep(.el-dialog__title) {
  color: #ffffff;
  font-weight: 600;
}

.login-dialog :deep(.el-dialog__body) {
  padding: 32px;
}

:deep(.el-image-viewer__wrapper) {
  z-index: 9999 !important;
}
</style>
