<template>
  <div class="artificial-audit-container">
    <div class="header">
      <h2>人工终审</h2>
      <div class="stats">
        <span>待审核: {{ total }}</span>
      </div>
    </div>
    <el-table :data="tableData" style="width: 100%" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="商品信息" min-width="300">
        <template #default="{ row }">
          <div class="product-info">
            <el-image :src="row.productImage" class="product-thumb" fit="cover" :preview-src-list="[row.productImage]" />
            <div class="info-text">
              <div class="product-title" :title="row.productTitle">{{ row.productTitle }}</div>
              <div class="price">¥{{ row.price }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="150">
        <template #default="{ row }">
          <div class="category-info">
            <el-image v-if="row.categoryImage" :src="row.categoryImage" class="category-icon" />
            <span>{{ row.categoryName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="shopName" label="店铺" width="150" />
      <el-table-column prop="rejectionReason" label="拒绝原因" min-width="200">
        <template #default="{ row }">
          <el-tag type="danger">{{ row.rejectionReason }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="success" size="small" @click="handleApprove(row)">通过</el-button>
          <el-button type="danger" size="small" @click="handleReject(row)">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchData"
      />
    </div>

    <!-- Login Dialog -->
    <el-dialog
      v-model="showLoginDialog"
      title="登录 Pinhaopin Admin"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
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
        <span class="dialog-footer">
          <el-button type="primary" @click="handlePinhaopinLogin" :loading="loginLoading">
            登录
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { auditRecordAPI, type AuditRecord } from '../services/api';

const tableData = ref<AuditRecord[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// Login State
const showLoginDialog = ref(false);
const loginLoading = ref(false);
const loginForm = reactive({
  username: '',
  password: ''
});

const API_BASE = 'http://localhost:3000';

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
    const res = await fetch(`${API_BASE}/api/proxy/pinhaopin/login`, {
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
    const result = await auditRecordAPI.getRecords(
      { manualStatus: 'pending' },
      { page: currentPage.value, limit: pageSize.value }
    );
    tableData.value = result.records;
    total.value = result.pagination.total;
  } catch (e) {
    ElMessage.error('获取数据失败');
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
    const res = await fetch(`${API_BASE}/api/proxy/pinhaopin/auditProduct`, {
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
    const res = await fetch(`${API_BASE}/api/proxy/pinhaopin/batchAuditProduct`, {
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
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.product-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.product-thumb {
  width: 50px;
  height: 50px;
  border-radius: 4px;
}
.product-title {
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.category-info {
  display: flex;
  align-items: center;
  gap: 5px;
}
.category-icon {
  width: 20px;
  height: 20px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
