<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storage } from 'wxt/storage';
import { ElMessage, ElMessageBox } from 'element-plus';

interface Product {
  id: number;
  name: string;
  mainImage: string;
  images: string;
  categoryName: string;
  categoryImage: string;
  description: string;
  price: number;
  shopId: number;
  shopName: string;
  auditReason: string | null;
  rejectionReason?: string; // From our local logic
  status: string;
  // Add other fields as needed
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['close']);

const products = ref<Product[]>([]);
const loading = ref(false);

const loadProducts = async () => {
  loading.value = true;
  try {
    const list = await storage.getItem<Product[]>('local:rejected_products_list');
    products.value = list || [];
  } catch (e) {
    console.error('Failed to load rejected products:', e);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadProducts();
});

const handleClose = () => {
  emit('close');
};

const handleApprove = async (row: Product) => {
  try {
    await ElMessageBox.confirm(`确定要批准商品 "${row.name}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    // Call API
    const res = await fetch("https://admin.pinhaopin.com/gateway/mall/auditProduct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status: "online" }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    ElMessage.success('批准成功');
    await removeProduct(row.id);
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error(e);
      ElMessage.error('操作失败: ' + e.message);
    }
  }
};

const handleReject = async (row: Product) => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝商品', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '拒绝原因不能为空',
      inputValue: row.rejectionReason || '商品内容违规'
    });

    // Call API
    const res = await fetch("https://admin.pinhaopin.com/gateway/mall/auditProduct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id: row.id, 
        status: "rejected",
        reason: reason
      }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    ElMessage.success('拒绝成功');
    await removeProduct(row.id);
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error(e);
      ElMessage.error('操作失败: ' + e.message);
    }
  }
};

const removeProduct = async (id: number) => {
  const list = await storage.getItem<Product[]>('local:rejected_products_list') || [];
  const newList = list.filter(p => p.id !== id);
  await storage.setItem('local:rejected_products_list', newList);
  products.value = newList;
};

const getImageList = (row: Product) => {
  const list: string[] = [];
  if (row.mainImage) list.push(row.mainImage);
  if (row.images) {
    row.images.split(',').forEach(url => {
      const u = url.trim();
      if (u) list.push(u);
    });
  }
  return list;
};

</script>

<template>
  <div v-if="visible" class="artificial-audit-overlay">
    <div class="audit-container">
      <div class="header">
        <h2>人工终审列表</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      
      <div class="content">
        <el-table :data="products" style="width: 100%" height="100%" v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          
          <el-table-column label="商品信息" min-width="300">
            <template #default="{ row }">
              <div class="product-info">
                <div class="p-name">{{ row.name }}</div>
                <div class="p-desc" :title="row.description">{{ row.description }}</div>
                <div class="p-price">¥{{ row.price }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="图片" width="120">
            <template #default="{ row }">
              <el-image 
                style="width: 80px; height: 80px"
                :src="row.mainImage" 
                :preview-src-list="getImageList(row)"
                fit="cover"
                preview-teleported
              />
            </template>
          </el-table-column>

          <el-table-column label="分类" width="150">
            <template #default="{ row }">
              <div class="category-info">
                <img v-if="row.categoryImage" :src="row.categoryImage" class="cat-icon" />
                <span>{{ row.categoryName }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="店铺" width="180">
            <template #default="{ row }">
              <div>{{ row.shopName }}</div>
              <div class="sub-text">ID: {{ row.shopId }}</div>
            </template>
          </el-table-column>

          <el-table-column label="拒绝原因" width="200">
            <template #default="{ row }">
              <div class="reason-text">{{ row.rejectionReason || row.auditReason || '无' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="handleApprove(row)">批准</el-button>
              <el-button type="danger" size="small" @click="handleReject(row)">拒绝</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.artificial-audit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}

.audit-container {
  width: 90%;
  height: 90%;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.content {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.p-name {
  font-weight: bold;
  font-size: 14px;
  line-height: 1.4;
}

.p-desc {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.p-price {
  color: #f56c6c;
  font-weight: bold;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.sub-text {
  font-size: 12px;
  color: #999;
}

.reason-text {
  color: #f56c6c;
  font-size: 13px;
}
</style>
