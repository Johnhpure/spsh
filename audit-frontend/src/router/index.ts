import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'records',
      component: () => import('../views/RecordList.vue')
    },
    {
      path: '/records/:id',
      name: 'record-detail',
      component: () => import('../views/RecordDetail.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue')
    }
  ]
});

export default router;
