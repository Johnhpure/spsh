<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { storage } from 'wxt/storage';

const props = defineProps<{
  status: string;
  isRunning: boolean;
  logs: string[];
  auditState: {
    product: { id: string; name: string; image: string } | null;
    textRequest: string;
    textResponse: string;
    imageRequest: string;
    imageResponse: string;
    scopeRequest: string;
    scopeResponse: string;
    aiAnalysis: string;
    result: { label: string; type: string } | null;
    stats: { total: number; processed: number; passed: number; rejected: number };
  };
  history: {
    id: string;
    name: string;
    image: string;
    status: 'passed' | 'rejected';
    reason?: string;
    timestamp: number;
  }[];
}>();

defineEmits(['start', 'stop']);

const isMinimized = ref(false);
const activeTab = ref<'current' | 'passed' | 'rejected'>('current');
const showSettings = ref(false);
const isDarkMode = ref(false);
const settingsForm = ref({
  accessKeyId: '',
  accessKeySecret: '',
  deepseekApiKey: '',
  auditApiUrl: '',
  auditApiKey: ''
});

const openSettings = async () => {
  const aliyunStored = await storage.getItem<{ accessKeyId: string; accessKeySecret: string }>('local:aliyun_config');
  const deepseekStored = await storage.getItem<{ deepseekApiKey: string }>('local:deepseek_config');
  const auditApiStored = await storage.getItem<{ apiUrl: string; apiKey: string }>('local:audit_api_config');
  
  settingsForm.value = {
    accessKeyId: aliyunStored?.accessKeyId || import.meta.env.WXT_ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: aliyunStored?.accessKeySecret || import.meta.env.WXT_ALIYUN_ACCESS_KEY_SECRET || '',
    deepseekApiKey: deepseekStored?.deepseekApiKey || '',
    auditApiUrl: auditApiStored?.apiUrl || import.meta.env.VITE_API_URL || '',
    auditApiKey: auditApiStored?.apiKey || import.meta.env.VITE_API_KEY || ''
  };
  showSettings.value = true;
};

const saveSettings = async () => {
  await storage.setItem('local:aliyun_config', {
    accessKeyId: settingsForm.value.accessKeyId.trim(),
    accessKeySecret: settingsForm.value.accessKeySecret.trim()
  });
  await storage.setItem('local:deepseek_config', {
    deepseekApiKey: settingsForm.value.deepseekApiKey.trim()
  });
  await storage.setItem('local:audit_api_config', {
    apiUrl: settingsForm.value.auditApiUrl.trim(),
    apiKey: settingsForm.value.auditApiKey.trim()
  });
  showSettings.value = false;
};

const closeSettings = () => {
  showSettings.value = false;
};

const passedHistory = computed(() => props.history.filter(h => h.status === 'passed'));
const rejectedHistory = computed(() => props.history.filter(h => h.status === 'rejected'));

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

const toggleTheme = async () => {
    isDarkMode.value = !isDarkMode.value;
    await storage.setItem('local:dark_mode', isDarkMode.value);
};

const formatDate = (ts: number) => {
  return new Date(ts).toLocaleTimeString();
};

// Draggable Logic
const panelRef = ref<HTMLElement | null>(null);
const position = ref({ x: window.innerWidth - 620, y: 20 }); // Initial position
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const startDrag = (e: MouseEvent) => {
  if (panelRef.value) {
    isDragging.value = true;
    dragOffset.value = {
      x: e.clientX - position.value.x,
      y: e.clientY - position.value.y
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  }
};

const onDrag = (e: MouseEvent) => {
  if (isDragging.value) {
    position.value = {
      x: e.clientX - dragOffset.value.x,
      y: e.clientY - dragOffset.value.y
    };
  }
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

onMounted(async () => {
    // Optional: Load position from storage
    const storedDarkMode = await storage.getItem<boolean>('local:dark_mode');
    if (storedDarkMode !== null) {
        isDarkMode.value = storedDarkMode;
    }
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<template>
  <div 
    class="control-panel" 
    :class="{ minimized: isMinimized, 'dark-mode': isDarkMode }"
    ref="panelRef"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <!-- Header -->
    <div class="header" @mousedown="startDrag" v-if="!isMinimized">
      <div class="header-title">
        <h3>商品审核助手</h3>
        <span class="status-dot" :class="isRunning ? 'running' : 'idle'"></span>
      </div>
      <div class="header-controls">
        <button class="icon-btn theme-btn" @click="toggleTheme" :title="isDarkMode ? '切换亮色' : '切换暗色'">
          <span v-if="isDarkMode">☀️</span>
          <span v-else>🌙</span>
        </button>
        <button class="icon-btn settings-btn" @click="openSettings" title="设置">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button class="icon-btn minimize-btn" @click="toggleMinimize" title="最小化">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Minimized View -->
    <div class="minimized-view" v-if="isMinimized" @mousedown="startDrag" @click="toggleMinimize">
      <div class="minimized-icon" :class="isRunning ? 'running' : 'idle'">
        🛡️
      </div>
    </div>

    <!-- Main Content -->
    <div class="content" v-show="!isMinimized">
      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'current' }"
            @click="activeTab = 'current'"
          >
            当前审核
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'passed' }"
            @click="activeTab = 'passed'"
          >
            通过记录 <span class="badge" v-if="passedHistory.length">{{ passedHistory.length }}</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'rejected' }"
            @click="activeTab = 'rejected'"
          >
            拒绝记录 <span class="badge" v-if="rejectedHistory.length">{{ rejectedHistory.length }}</span>
          </button>
        </div>
      </div>

      <!-- Tab Content: Current -->
      <div v-show="activeTab === 'current'" class="tab-pane">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">总数</span>
            <span class="stat-value">{{ auditState.stats.total }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">已处理</span>
            <span class="stat-value">{{ auditState.stats.processed }}</span>
          </div>
          <div class="stat-card success">
            <span class="stat-label">通过</span>
            <span class="stat-value">{{ auditState.stats.passed }}</span>
          </div>
          <div class="stat-card danger">
            <span class="stat-label">拒绝</span>
            <span class="stat-value">{{ auditState.stats.rejected }}</span>
          </div>
        </div>

        <!-- Current Audit Card -->
        <div class="card current-audit-card">
          <div class="card-header">
            <h4>当前处理商品</h4>
            <div class="audit-result-badge" v-if="auditState.result" :class="auditState.result.type">
              {{ auditState.result.label }}
            </div>
          </div>
          
          <div v-if="auditState.product" class="product-content">
            <div class="product-info-row">
              <div class="product-image-wrapper">
                <img :src="auditState.product.image" class="product-thumb" v-if="auditState.product.image" />
                <div v-else class="product-thumb-placeholder">No Image</div>
              </div>
              <div class="product-details">
                <div class="product-id">ID: {{ auditState.product.id }}</div>
                <div class="product-name">{{ auditState.product.name }}</div>
              </div>
            </div>

            <div class="audit-details-grid">
                <div class="detail-block">
                    <h5>文本审核</h5>
                    <div class="code-group">
                      <div class="code-label">Request</div>
                      <div class="code-box request">{{ auditState.textRequest }}</div>
                    </div>
                    <div class="code-group">
                      <div class="code-label">Response</div>
                      <div class="code-box response">{{ auditState.textResponse }}</div>
                    </div>
                </div>
                <div class="detail-block">
                    <h5>图片审核</h5>
                    <div class="code-group">
                      <div class="code-label">Request</div>
                      <div class="code-box request">{{ auditState.imageRequest }}</div>
                    </div>
                    <div class="code-group">
                      <div class="code-label">Response</div>
                      <div class="code-box response">{{ auditState.imageResponse }}</div>
.logs-container {
  height: 100%;
  overflow-y: auto;
  font-family: monospace;
  font-size: 11px;
}
.log-entry { margin-bottom: 4px; display: flex; gap: 8px; }
.log-time { color: var(--color-text-sub); flex-shrink: 0; }
.log-text { color: var(--color-text-main); word-break: break-all; }

/* Actions */
.actions-bar { 
  display: flex; 
  gap: 12px; 
  margin-top: auto; 
  padding: 20px; /* Added padding */
  background: transparent; /* Or match bg if needed */
  z-index: 2;
}.action-btn {
  flex: 1;
  border: none;
  padding: 14px;
  border-radius: var(--ui-btn-radius);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.action-btn:active { transform: scale(0.96); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.action-btn.primary { background: var(--color-primary); color: white; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
.action-btn.danger { background: var(--color-danger); color: white; box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3); }

/* History List */
.history-view { padding-bottom: 10px; height: 100%; /* Fill available space */ }
.history-card {
  background: var(--color-card-bg);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  transition: transform 0.2s;
  animation: card-breathe 4s ease-in-out infinite; /* Breathing effect */
}
.history-card:hover { transform: scale(1.01); }

.history-main { margin-bottom: 10px; }
.history-id-badge {
  display: inline-block;
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  color: var(--color-text-sub);
  margin-bottom: 4px;
  font-family: monospace;
}
.history-name { font-size: 14px; font-weight: 600; color: var(--color-text-main); }

.history-reason-box {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  font-size: 12px;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.history-meta { display: flex; justify-content: space-between; align-items: center; }
.history-time { font-size: 11px; color: var(--color-text-sub); }

.status-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
}
.status-pill.passed { background: var(--color-success-soft); color: var(--color-success); }
.status-pill.rejected { background: var(--color-danger-soft); color: var(--color-danger); }

.empty-state, .empty-history {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-sub);
}
.empty-icon { font-size: 40px; margin-bottom: 10px; opacity: 0.5; }

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* Settings Overlay */
.settings-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-radius: var(--ui-border-radius);
}

.settings-content {
  background: var(--color-card-bg);
  padding: 24px;
  border-radius: 20px;
  width: 100%;
  max-width: 320px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  color: var(--color-text-main);
}

.settings-content h4 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-sub);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
}

.form-group input:focus {
  border-color: var(--color-primary);
  background: var(--color-card-bg);
}

.settings-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.action-btn.secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
  box-shadow: none;
}
</style>
