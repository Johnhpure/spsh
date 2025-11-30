<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { storage } from 'wxt/storage';
import { auditRecordAPI } from '@/utils/auditApi';

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
  serverStats: {
    totalFailures: number;
    byStage: Record<string, number>;
    byReason: Record<string, number>;
    trend: { date: string; count: number }[];
    avgProcessingTime: number;
  } | null;
}>();

const emit = defineEmits(['start', 'stop', 'refresh-stats']);

const isMinimized = ref(false);
const activeTab = ref<'current' | 'passed' | 'rejected' | 'statistics'>('current');
const isDarkMode = ref(false);
const isLoggedIn = ref(false);
const loginForm = ref({ username: '', password: '' });
const loginLoading = ref(false);
const loginError = ref('');

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
const position = ref({ x: window.innerWidth - 380, y: 20 }); // Initial position
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
    // Check login status
    const token = await storage.getItem('local:auth_token');
    if (token) {
        isLoggedIn.value = true;
    }

    // Optional: Load position from storage
    const storedDarkMode = await storage.getItem<boolean>('local:dark_mode');
    if (storedDarkMode !== null) {
        isDarkMode.value = storedDarkMode;
    }
});

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    loginError.value = '请输入用户名和密码';
    return;
  }
  loginLoading.value = true;
  loginError.value = '';
  
  try {
    const result = await auditRecordAPI.login({
      username: loginForm.value.username,
      password: loginForm.value.password
    });
    
    if (result.success && result.token) {
      await storage.setItem('local:auth_token', result.token);
      if (result.user) {
        await storage.setItem('local:user_info', result.user);
      }

      // Fetch and store system settings
      try {
        const settingsResult = await auditRecordAPI.getSystemSettings();
        if (settingsResult.success && settingsResult.data) {
          await storage.setItem('local:aliyun_config', {
            accessKeyId: settingsResult.data.aliyunAccessKeyId,
            accessKeySecret: settingsResult.data.aliyunAccessKeySecret
          });
          await storage.setItem('local:deepseek_config', {
            deepseekApiKey: settingsResult.data.deepSeekApiKey
          });
        }
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
      }

      isLoggedIn.value = true;
    } else {
      loginError.value = result.error || '登录失败';
    }
  } catch (e) {
    loginError.value = '登录异常: ' + e;
  } finally {
    loginLoading.value = false;
  }
};

const handleLogout = async () => {
  emit('stop'); // Stop the audit if running
  await storage.removeItem('local:auth_token');
  await storage.removeItem('local:user_info');
  isLoggedIn.value = false;
  loginForm.value = { username: '', password: '' };
};

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
        <button class="icon-btn logout-btn" @click="handleLogout" title="退出登录" v-if="isLoggedIn">
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
      
      <!-- Login View -->
      <div v-if="!isLoggedIn" class="login-view">
        <div class="login-header">
          <h4>请先登录</h4>
          <p>登录以开始商品审核</p>
        </div>
        <div class="login-form">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="loginForm.username" type="text" placeholder="请输入用户名" @keyup.enter="handleLogin" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="loginForm.password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin" />
          </div>
          <div class="error-msg" v-if="loginError">{{ loginError }}</div>
          <button class="action-btn primary login-btn" @click="handleLogin" :disabled="loginLoading">
            <span v-if="loginLoading">登录中...</span>
            <span v-else>登录</span>
          </button>
        </div>
      </div>

      <!-- Dashboard View -->
      <div v-else class="dashboard-view">
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
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'statistics' }"
            @click="activeTab = 'statistics'"
          >
            统计
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
            </div>

            <!-- Logs -->
            <div class="logs-container" v-if="logs.length > 0">
                <div class="log-entry" v-for="(log, index) in logs" :key="index">
                    <span class="log-time"></span>
                    <span class="log-text">{{ log }}</span>
                </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="empty-icon">🛡️</div>
            <div>等待开始审核...</div>
          </div>
        </div>

        <!-- Actions Bar -->
        <div class="actions-bar">
          <button class="action-btn primary" @click="$emit('start')" :disabled="isRunning">
            <span>▶</span> 开始审核
          </button>
          <button class="action-btn danger" @click="$emit('stop')" :disabled="!isRunning">
            <span>⏹</span> 停止
          </button>
        </div>
      </div>

      <!-- Tab Content: Passed History -->
      <div v-show="activeTab === 'passed'" class="tab-pane history-view">
        <div v-if="passedHistory.length === 0" class="empty-history">
            <div class="empty-icon">✅</div>
            <div>暂无通过记录</div>
        </div>
        <div v-else class="history-list">
            <div class="history-card" v-for="item in passedHistory" :key="item.id">
                <div class="history-main">
                    <div class="history-id-badge">{{ item.id }}</div>
                    <div class="history-name">{{ item.name }}</div>
                </div>
                <div class="history-meta">
                    <span class="status-pill passed">PASSED</span>
                    <span class="history-time">{{ formatDate(item.timestamp) }}</span>
                </div>
            </div>
        </div>
      </div>

      <!-- Tab Content: Rejected History -->
      <div v-show="activeTab === 'rejected'" class="tab-pane history-view">
        <div v-if="rejectedHistory.length === 0" class="empty-history">
            <div class="empty-icon">❌</div>
            <div>暂无拒绝记录</div>
        </div>
        <div v-else class="history-list">
            <div class="history-card" v-for="item in rejectedHistory" :key="item.id">
                <div class="history-main">
                    <div class="history-id-badge">{{ item.id }}</div>
                    <div class="history-name">{{ item.name }}</div>
                </div>
                <div class="history-reason-box" v-if="item.reason">
                    Reason: {{ item.reason }}
                </div>
                <div class="history-meta">
                    <span class="status-pill rejected">REJECTED</span>
                    <span class="history-time">{{ formatDate(item.timestamp) }}</span>
                </div>
            </div>
        </div>
      </div>

      <!-- Tab Content: Server Statistics -->
      <div v-show="activeTab === 'statistics'" class="tab-pane">
        <div v-if="!serverStats" class="loading-state">
          <div>加载中...</div>
        </div>
        <div v-else class="server-stats-container">
          <div class="stats-grid">
            <div class="stat-card danger">
              <span class="stat-label">总拒绝数</span>
              <span class="stat-value">{{ serverStats.totalFailures }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">平均耗时</span>
              <span class="stat-value">{{ serverStats.avgProcessingTime }}ms</span>
            </div>
          </div>

          <div class="chart-section">
            <h5>拒绝原因分布</h5>
            <div class="reason-list">
              <div v-for="(count, reason) in serverStats.byReason" :key="reason" class="reason-item">
                <div class="reason-info">
                  <span class="reason-name">{{ reason }}</span>
                  <span class="reason-count">{{ count }}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: (count / serverStats.totalFailures * 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-section">
            <h5>审核阶段分布</h5>
            <div class="stage-grid">
              <div v-for="(count, stage) in serverStats.byStage" :key="stage" class="stage-card">
                <span class="stage-name">{{ stage }}</span>
                <span class="stage-count">{{ count }}</span>
              </div>
            </div>
          </div>
          
          <div class="actions-row">
             <button class="action-btn secondary" @click="$emit('refresh-stats')">🔄 刷新数据</button>
          </div>
        </div>
      </div>

      </div>
    </div>



  </div>
</template>

<style scoped>
/* Base Styles & Variables */
:root {
  --color-primary: #007aff;
  --color-danger: #ff3b30;
  --color-success: #34c759;
  --color-bg-main: #ffffff;
  --color-text-main: #333333;
  --color-text-sub: #888888;
  --color-card-bg: #f2f2f7;
  --color-bg-secondary: #eeeeee;
  --color-border: #d1d1d6;
  --ui-btn-radius: 12px;
  --ui-border-radius: 16px;
}

.control-panel {
  position: fixed;
  width: 650px;
  height: 1100px;
  color: var(--color-text-main);
  background: var(--color-bg-main, #ffffff);
  border-radius: 20px;
  border: 1px solid var(--color-border);
  box-shadow: 0 20px 50px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  z-index: 9999;
  transition: height 0.3s, width 0.3s;
}
.control-panel.minimized {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  cursor: pointer;
}
.control-panel.dark-mode {
  --color-bg-main: #1e1e1e;
  --color-text-main: #ffffff;
  --color-text-sub: #e0e0e0;
  --color-card-bg: #2c2c2c;
  --color-bg-secondary: #333333;
  --color-border: #444444;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--color-bg-main);
  border-bottom: 1px solid var(--color-border);
  cursor: move;
}
.header-title h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--color-text-main); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #ccc; display: inline-block; margin-left: 8px; }
.status-dot.running { background: var(--color-success); box-shadow: 0 0 8px var(--color-success); }

.header-controls { display: flex; gap: 8px; }
.icon-btn { background: none; border: none; cursor: pointer; color: var(--color-text-sub); padding: 4px; border-radius: 50%; transition: background 0.2s; }
.icon-btn:hover { background: var(--color-bg-secondary); color: var(--color-text-main); }

.minimized-view { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.minimized-icon { font-size: 24px; }

/* Content & Tabs */
.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.tabs-container { padding: 10px 20px 0; }
.tabs { display: flex; background: var(--color-bg-secondary); padding: 4px; border-radius: 12px; }
.tab-btn { flex: 1; border: none; background: none; padding: 8px; font-size: 12px; font-weight: 600; color: var(--color-text-sub); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: var(--color-bg-main); color: var(--color-text-main); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.badge { background: var(--color-danger); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 4px; }

.tab-pane { flex: 1; display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }

/* Stats & Cards */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.stat-card { background: var(--color-card-bg); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid var(--color-border); }
.stat-label { display: block; font-size: 10px; color: var(--color-text-sub); margin-bottom: 4px; }
.stat-value { font-size: 16px; font-weight: 700; color: var(--color-text-main); }
.stat-card.success .stat-value { color: var(--color-success); }
.stat-card.danger .stat-value { color: var(--color-danger); }

.card { background: var(--color-card-bg); border-radius: 16px; padding: 16px; margin-bottom: 16px; border: 1px solid var(--color-border); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.card-header h4 { margin: 0; font-size: 14px; color: var(--color-text-main); }
.audit-result-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #eee; }

.product-info-row { display: flex; gap: 12px; margin-bottom: 12px; }
.product-image-wrapper { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #fff; flex-shrink: 0; }
.product-thumb { width: 100%; height: 100%; object-fit: cover; }
.product-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #ccc; }
.product-details { flex: 1; overflow: hidden; }
.product-id { font-size: 10px; color: var(--color-text-sub); font-family: monospace; margin-bottom: 4px; }
.product-name { font-size: 12px; font-weight: 600; color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.audit-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.detail-block h5 { margin: 0 0 8px 0; font-size: 11px; color: var(--color-text-sub); }
.code-group { margin-bottom: 8px; }
.code-label { font-size: 9px; color: var(--color-text-sub); margin-bottom: 2px; }
.code-box { background: var(--color-bg-main); padding: 6px; border-radius: 6px; font-family: monospace; font-size: 10px; width: 250px; height: 110px; word-break: break-all; border: 1px solid var(--color-border); color: var(--color-text-main); }

.logs-container {
  height: 260px;
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

/* Server Stats Styles */
.server-stats-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.chart-section {
    background: var(--color-card-bg);
    border-radius: 12px;
    padding: 12px;
}

.chart-section h5 {
    margin: 0 0 12px 0;
    font-size: 12px;
    color: var(--color-text-sub);
}

.reason-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.reason-item {
    font-size: 11px;
}

.reason-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    color: var(--color-text-main);
}

.progress-bar {
    height: 6px;
    background: var(--color-bg-secondary);
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--color-danger);
    border-radius: 3px;
}

.stage-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.stage-card {
    background: var(--color-bg-main);
    padding: 8px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid var(--color-border);
}

.stage-name {
    font-size: 11px;
    color: var(--color-text-sub);
}

.stage-count {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-main);
}

.actions-row {
    display: flex;
    justify-content: center;
    margin-top: 8px;
}

/* Login View Styles */
.login-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 32px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h4 {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0 0 8px 0;
}

.login-header p {
  font-size: 14px;
  color: var(--color-text-sub);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-btn {
  margin-top: 16px;
  width: 100%;
}

.error-msg {
  color: var(--color-danger);
  font-size: 12px;
  text-align: center;
}

.dashboard-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: var(--color-text-sub);
    font-size: 14px;
}
</style>
