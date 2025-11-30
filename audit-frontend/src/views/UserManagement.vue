<template>
  <div class="user-management-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon> 新增用户
      </el-button>
    </div>

    <el-card class="table-card" shadow="hover">
      <el-table :data="users" v-loading="loading" style="width: 100%">
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="role" label="角色">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'success'">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确定删除该用户吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button size="small" type="danger" :disabled="row.role === 'admin' && row.username === 'admin'">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEditing ? '编辑用户' : '新增用户'"
      width="500px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="isEditing" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="留空则不修改" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="saveUser" :loading="saving">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { API_BASE_URL } from '../config/api';

interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

const users = ref<User[]>([]);
const loading = ref(false);
const showAddDialog = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const editingId = ref('');

const form = ref({
  username: '',
  password: '',
  role: 'user'
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      users.value = data.data;
    } else {
      ElMessage.error(data.error || '获取用户列表失败');
    }
  } catch (e) {
    ElMessage.error('连接服务器失败');
  } finally {
    loading.value = false;
  }
};

const handleEdit = (row: User) => {
  isEditing.value = true;
  editingId.value = row.id;
  form.value = {
    username: row.username,
    password: '',
    role: row.role
  };
  showAddDialog.value = true;
};

const handleDelete = async (row: User) => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/users/${row.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      ElMessage.success('删除成功');
      fetchUsers();
    } else {
      ElMessage.error(data.error || '删除失败');
    }
  } catch (e) {
    ElMessage.error('连接服务器失败');
  }
};

const saveUser = async () => {
  if (!form.value.username) {
    ElMessage.warning('请输入用户名');
    return;
  }
  if (!isEditing.value && !form.value.password) {
    ElMessage.warning('请输入密码');
    return;
  }

  saving.value = true;
  try {
    const token = localStorage.getItem('auth_token');
    const url = isEditing.value 
      ? `${API_BASE_URL}/users/${editingId.value}`
      : `${API_BASE_URL}/auth/register`;
    
    const method = isEditing.value ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    });

    const data = await response.json();
    if (data.success) {
      ElMessage.success(isEditing.value ? '更新成功' : '创建成功');
      showAddDialog.value = false;
      fetchUsers();
    } else {
      ElMessage.error(data.error || '操作失败');
    }
  } catch (e) {
    ElMessage.error('连接服务器失败');
  } finally {
    saving.value = false;
  }
};

const resetForm = () => {
  form.value = { username: '', password: '', role: 'user' };
  isEditing.value = false;
  editingId.value = '';
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.user-management-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.table-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
</style>
