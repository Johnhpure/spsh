import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import RecordList from '../views/RecordList.vue';
import RecordDetail from '../views/RecordDetail.vue';
import Login from '../views/Login.vue';
import UserManagement from '../views/UserManagement.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { public: true }
    },
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/records',
      name: 'RecordList',
      component: RecordList
    },
    {
      path: '/records/:id',
      name: 'RecordDetail',
      component: RecordDetail
    },
    {
      path: '/users',
      name: 'UserManagement',
      component: UserManagement
    }
  ]
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token');
  if (!to.meta.public && !token) {
    next('/login');
  } else {
    next();
  }
});

export default router;
