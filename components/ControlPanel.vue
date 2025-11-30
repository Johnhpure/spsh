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

defineEmits(['start', 'stop', 'logout', 'authError']);

const isMinimized = ref(false);
const activeTab = ref<'current' | 'passed' | 'rejected'>('current');
const showSettings = ref(false);
const isDarkMode = ref(false);
const userInfo = ref<{ username: string; role: string } | null>(null);
const settingsForm = ref({
  accessKeyId: '',
  accessKeySecret: '',
  deepseekApiKey: '',
  auditApiUrl: ''
});

const openSettings = async () => {
  const aliyunStored = await storage.getItem<{ accessKeyId: string; accessKeySecret: string }>('local:aliyun_config');
  const deepseekStored = await storage.getItem<{ deepseekApiKey: string }>('local:deepseek_config');
  const auditApiStored = await storage.getItem<{ apiUrl: string }>('local:audit_api_config');
  
  settingsForm.value = {
    accessKeyId: aliyunStored?.accessKeyId || import.meta.env.WXT_ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: aliyunStored?.accessKeySecret || import.meta.env.WXT_ALIYUN_ACCESS_KEY_SECRET || '',
    deepseekApiKey: deepseekStored?.deepseekApiKey || '',
    auditApiUrl: auditApiStored?.apiUrl || import.meta.env.VITE_API_URL || ''
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
    apiUrl: settingsForm.value.auditApiUrl.trim()
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
const position = ref({ x: window.innerWidth - 680, y: 20 }); // Initial position
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
    
    // Load user info
    const user = await storage.getItem<{ username: string; role: string }>('local:user_info');
    if (user) {
        userInfo.value = user;
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
        <div class="user-info" v-if="userInfo" :title="`${userInfo.username} (${userInfo.role})`">
          <span class="user-icon">👤</span>
          <span class="username">{{ userInfo.username }}</span>
        </div>
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
        <button class="icon-btn logout-btn" @click="$emit('logout')" title="退出登录">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
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
                    </div>
                </div>
                <div class="detail-block">
                    <h5>经营范围审核</h5>
                    <div class="code-group">
                      <div class="code-label">OCR Result</div>
                      <div class="code-box request">{{ auditState.scopeResponse }}</div>
                    </div>
                    <div class="code-group">
                      <div class="code-label">AI Analysis</div>
                      <div class="code-box response">{{ auditState.aiAnalysis }}</div>
                    </div>
                </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">⏳</div>
            <p>等待开始或获取数据...</p>
          </div>
        </div>

        <!-- Logs -->
        <div class="logs-section">
          <div class="logs-container" ref="logsContainer">
            <div v-for="(log, index) in logs.slice().reverse()" :key="index" class="log-entry">
              <span class="log-time">{{ new Date().toLocaleTimeString() }}</span>
              <span class="log-text">{{ log }}</span>
            </div>
          </div>
        </div>


      </div>

      <!-- Tab Content: History -->
      <div v-show="activeTab === 'passed'" class="tab-pane history-view">
        <div v-if="passedHistory.length === 0" class="empty-history">
          <div class="empty-icon">📂</div>
          <p>暂无通过记录</p>
        </div>
        <div v-else class="history-list">
          <div v-for="item in passedHistory" :key="item.timestamp" class="history-card passed">
            <div class="history-main">
              <div class="history-id-badge">#{{ item.id }}</div>
              <div class="history-name">{{ item.name }}</div>
            </div>
            <div class="history-meta">
              <span class="history-time">{{ formatDate(item.timestamp) }}</span>
              <span class="status-pill passed">通过</span>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'rejected'" class="tab-pane history-view">
        <div v-if="rejectedHistory.length === 0" class="empty-history">
          <div class="empty-icon">📂</div>
          <p>暂无拒绝记录</p>
        </div>
        <div v-else class="history-list">
          <div v-for="item in rejectedHistory" :key="item.timestamp" class="history-card rejected">
             <div class="history-main">
              <div class="history-id-badge">#{{ item.id }}</div>
              <div class="history-name">{{ item.name }}</div>
            </div>
            <div class="history-reason-box" v-if="item.reason">
              {{ item.reason }}
            </div>
            <div class="history-meta">
              <span class="history-time">{{ formatDate(item.timestamp) }}</span>
              <span class="status-pill rejected">拒绝</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Overlay -->
    <div class="settings-overlay" v-if="showSettings">
      <div class="settings-content">
        <h4>阿里云配置</h4>
        <div class="form-group">
          <label>AccessKey ID</label>
          <input type="text" v-model="settingsForm.accessKeyId" placeholder="LTAI..." />
        </div>
        <div class="form-group">
          <label>AccessKey Secret</label>
          <input type="password" v-model="settingsForm.accessKeySecret" placeholder="Secret..." />
        </div>
        
        <h4 style="margin-top: 20px;">DeepSeek 配置</h4>
        <div class="form-group">
          <label>API Key</label>
          <input type="password" v-model="settingsForm.deepseekApiKey" placeholder="sk-..." />
        </div>

        <h4 style="margin-top: 20px;">审核后端 API 配置</h4>
        <div class="form-group">
          <label>API URL</label>
          <input type="text" v-model="settingsForm.auditApiUrl" placeholder="http://localhost:3000" />
        </div>

        <div class="settings-actions">
          <button class="action-btn secondary" @click="closeSettings">取消</button>
          <button class="action-btn primary" @click="saveSettings">保存配置</button>
        </div>
      </div>
    </div>

    <!-- Actions (Fixed at bottom) -->
    <div class="actions-bar" v-show="!isMinimized && activeTab === 'current'">
      <button 
        class="action-btn primary" 
        @click="$emit('start')" 
        :disabled="isRunning"
      >
        <span class="btn-icon">▶</span> 开始自动审核
      </button>
      <button 
        class="action-btn danger" 
        @click="$emit('stop')" 
        :disabled="!isRunning"
      >
        <span class="btn-icon">⏹</span> 停止
      </button>
    </div>
  </div>
</template>

<style scoped>
/* OneUI 8.0 Inspired Variables */
/* OneUI 8.0 Inspired Variables */
.control-panel {
  --ui-bg: #f8f9fa; /* Light background */
  --ui-bg-blur: 30px;
  --ui-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 10px 20px rgba(0, 0, 0, 0.1);
  --ui-border-radius: 26px;
  --ui-card-radius: 20px;
  --ui-btn-radius: 50px;
  
  --color-primary: #007AFF;
  --color-success: #34C759;
  --color-danger: #FF3B30;
  --color-text-main: #1C1C1E;
  --color-text-sub: #8E8E93;
  --color-bg-secondary: #F2F2F7;
  --color-card-bg: #ffffff;
  --color-border: #e5e5ea;
  
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.control-panel.dark-mode {
  --ui-bg: #1C1C1E; /* Dark background */
  --color-text-main: #FFFFFF;
  --color-text-sub: #8E8E93;
  --color-bg-secondary: #2C2C2E;
  --color-card-bg: #2C2C2E;
  --color-border: #3A3A3C;
  --ui-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 10px 20px rgba(0, 0, 0, 0.3);
  --color-success-soft: rgba(52, 199, 89, 0.15);
  --color-danger-soft: rgba(255, 59, 48, 0.15);
}

/* Main Container */
.control-panel {
  position: fixed;
  background: var(--ui-bg);
  backdrop-filter: blur(var(--ui-bg-blur));
  -webkit-backdrop-filter: blur(var(--ui-bg-blur));
  border-radius: var(--ui-border-radius);
  box-shadow: var(--ui-shadow);
  z-index: 99999;
  font-family: var(--font-family);
  display: flex;
  flex-direction: column;
  /* height: 750px; Removed fixed height */
  height: auto;
  max-height: 90vh;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  color: var(--color-text-main);
}

/* Breathing Border Effect */
.control-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: var(--ui-border-radius);
  padding: 2px;
  background: linear-gradient(45deg, #007AFF, #34C759, #FF3B30, #007AFF);
  background-size: 400% 400%;
  -webkit-mask: 
     linear-gradient(#fff 0 0) content-box, 
     linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: breathe 8s ease infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes breathe {
  0% { background-position: 0% 50%; opacity: 0.5; }
  50% { background-position: 100% 50%; opacity: 1; }
  100% { background-position: 0% 50%; opacity: 0.5; }
}

.control-panel:not(.minimized) {
  width: 650px;
  min-height: 600px;
}

.control-panel.minimized {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
.control-panel.dark-mode.minimized {
    background: rgba(28, 28, 30, 0.95);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.control-panel.minimized::before {
    border-radius: 30px;
}

/* Header */
.header {
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
  background: transparent;
  position: relative;
  z-index: 2;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 18px;
  font-size: 13px;
  color: var(--color-text-main);
}

.control-panel.dark-mode .user-info {
  background: rgba(255, 255, 255, 0.1);
}

.user-icon {
  font-size: 16px;
}

.username {
  font-weight: 600;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-sub);
  transition: background 0.3s;
}
.status-dot.running { background: var(--color-success); box-shadow: 0 0 8px var(--color-success); }

.icon-btn {
  background: rgba(0,0,0,0.05);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-main);
  transition: all 0.2s;
}
.control-panel.dark-mode .icon-btn {
    background: rgba(255,255,255,0.1);
}
.icon-btn:hover { background: rgba(0,0,0,0.1); transform: scale(1.05); }

/* Minimized View */
.minimized-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}
.minimized-icon { font-size: 28px; }
.minimized-icon.running { animation: pulse 2s infinite; }

/* Content Area */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  z-index: 2;
}

/* Scrollbar Styling */
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-track { background: transparent; }
.content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }

/* Tabs */
.tabs-container {
  position: sticky;
  top: 0;
  background: transparent;
  padding-bottom: 10px;
  z-index: 10;
}

.tabs {
  display: flex;
  background: rgba(118, 118, 128, 0.12);
  padding: 4px;
  border-radius: 16px;
}

.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-sub);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn.active {
  background: var(--color-card-bg);
  color: var(--color-text-main);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.badge {
  background: var(--color-text-sub);
  color: white;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 10px;
  min-width: 14px;
  text-align: center;
}
.tab-btn.active .badge { background: var(--color-primary); }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--color-card-bg);
  padding: 10px;
  border-radius: var(--ui-card-radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  transition: transform 0.2s;
  animation: card-breathe 4s ease-in-out infinite; /* Breathing effect */
}
.stat-card:hover { transform: translateY(-2px); }

.stat-label { font-size: 12px; color: var(--color-text-sub); margin-bottom: 2px; }
.stat-value { font-size: 20px; font-weight: 700; color: var(--color-text-main); }
.stat-card.success .stat-value { color: var(--color-success); }
.stat-card.danger .stat-value { color: var(--color-danger); }

/* Cards */
.card {
  background: var(--color-card-bg);
  border-radius: var(--ui-card-radius);
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  animation: card-breathe 4s ease-in-out infinite; /* Breathing effect */
}

@keyframes card-breathe {
  0% { background-color: var(--color-card-bg); box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
  50% { background-color: var(--color-card-bg); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  100% { background-color: var(--color-card-bg); box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
}

.current-audit-card {
  margin-top: 10px;
  margin-bottom: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-header h4 { margin: 0; font-size: 16px; font-weight: 600; }

.audit-result-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}
.audit-result-badge.success { background: var(--color-success-soft); color: var(--color-success); }
.audit-result-badge.danger { background: var(--color-danger-soft); color: var(--color-danger); }

/* Product Info */
.product-info-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.product-image-wrapper {
  width: 90px;
  height: 90px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  flex-shrink: 0;
}
.product-thumb { width: 100%; height: 100%; object-fit: cover; }
.product-thumb-placeholder {
  width: 100%; height: 100%; background: var(--color-bg-secondary);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--color-text-sub);
}

.product-details { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.product-id { font-size: 12px; color: var(--color-text-sub); margin-bottom: 4px; font-family: monospace; }
.product-name { font-size: 15px; font-weight: 600; line-height: 1.4; }

/* Code/Details */
.audit-details-grid { display: flex; flex-direction: column; gap: 16px; }
.detail-block h5 { margin: 0 0 8px 0; font-size: 12px; color: var(--color-text-sub); text-transform: uppercase; letter-spacing: 0.5px; }

.code-group { margin-bottom: 8px; }
.code-label { font-size: 10px; color: var(--color-text-sub); margin-bottom: 2px; font-weight: 600; }
.code-box {
  background: var(--color-bg-secondary);
  padding: 10px;
  border-radius: 12px;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 11px;
  color: var(--color-text-main);
  max-height: 120px;
  overflow-y: auto;
  border-left: 4px solid transparent;
}
.code-box.request { border-left-color: var(--color-primary); }
.code-box.response { border-left-color: var(--color-success); }

/* Logs */
.logs-section {
  background: var(--color-bg-secondary);
  border-radius: var(--ui-card-radius);
  padding: 12px;
  height: 120px;
  overflow: hidden;
}
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
