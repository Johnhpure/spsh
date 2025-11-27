<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const collapsed = ref(false);
const isFullscreen = ref(false);

const toggleSidebar = () => {
  collapsed.value = !collapsed.value;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      isFullscreen.value = false;
    }
  }
};
</script>

<template>
  <div id="app">
    <div class="layout-container">
      <!-- Sidebar -->
      <aside :class="['sidebar', { collapsed }]">
        <div class="logo-container">
          <div class="logo">
            <span class="logo-icon">🛡️</span>
          </div>
          <transition name="fade">
            <span v-if="!collapsed" class="logo-text">审核管理</span>
          </transition>
        </div>

        <nav class="nav-menu">
          <router-link to="/dashboard" class="nav-item" :class="{ active: route.path === '/dashboard' }">
            <span class="icon">📊</span>
            <transition name="fade">
              <span v-if="!collapsed" class="label">统计仪表板</span>
            </transition>
          </router-link>
          <router-link to="/records" class="nav-item" :class="{ active: route.path.startsWith('/records') }">
            <span class="icon">📋</span>
            <transition name="fade">
              <span v-if="!collapsed" class="label">审核记录</span>
            </transition>
          </router-link>
        </nav>

        <div class="sidebar-footer">
          <button class="collapse-btn" @click="toggleSidebar">
            <span v-if="collapsed">➜</span>
            <span v-else>⬅ 收起</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        <!-- Header -->
        <header class="top-header">
          <div class="header-left">
            <h2 class="page-title-header">{{ route.name === 'dashboard' ? '统计仪表板' : (route.name === 'records' ? '审核记录' : '详情') }}</h2>
          </div>
          <div class="header-right">
            <button class="icon-btn" @click="toggleFullscreen" title="全屏切换">
              <span v-if="isFullscreen">↙️</span>
              <span v-else>↗️</span>
            </button>
            <div class="user-profile">
              <div class="avatar">A</div>
              <span class="username">Admin</span>
            </div>
          </div>
        </header>

        <!-- Router View Wrapper -->
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: var(--ui-bg);
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--ui-sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
  border-right: 1px solid var(--ui-border);
  z-index: 100;
}

.sidebar.collapsed {
  width: 80px;
}

.logo-container {
  height: 80px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--ui-text-main);
  white-space: nowrap;
}

.nav-menu {
  flex: 1;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px; /* Pill shape */
  color: var(--ui-text-sub);
  text-decoration: none;
  transition: all 0.2s ease;
  font-weight: 500;
  height: 52px;
}

.nav-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
  color: var(--ui-text-main);
}

.nav-item.active {
  background-color: rgba(0, 122, 255, 0.1);
  color: var(--ui-primary);
}

.nav-item .icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.nav-item .label {
  white-space: nowrap;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid var(--ui-border);
}

.collapse-btn {
  width: 100%;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--ui-text-sub);
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
}

.collapse-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: var(--ui-bg);
}

/* Header */
.top-header {
  height: 80px;
  padding: 0 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent; /* Transparent header for cleaner look */
}

.page-title-header {
  font-size: 24px;
  font-weight: 700;
  color: var(--ui-text-main);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: transform 0.2s;
}

.icon-btn:hover {
  transform: scale(1.05);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 6px 16px 6px 6px;
  border-radius: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.avatar {
  width: 32px;
  height: 32px;
  background: var(--ui-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text-main);
}

/* Content Wrapper */
.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0 32px 32px 32px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
