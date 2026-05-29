import { createRouter, createWebHashHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth.js'

const routes = [
  {
    path: '/login',
    component: () => import('../pages/Login.vue'),
  },
  {
    path: '/project-view',
    component: () => import('../pages/ProjectView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/user-info',
    component: () => import('../pages/UserInfo.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/', redirect: '/project-view' },
  { path: '/:catchAll(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  if (window.__forceLogout) {
    window.__forceLogout = false
    if (to.path !== '/login') return '/login'
  }

  const token = isLoggedIn()

  if (to.path === '/login') {
    if (token) return '/project-view'
    return true
  }

  if (to.meta.requiresAuth && !token) return '/login'

  return true
})

export default router
