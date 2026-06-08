import { createRouter, createWebHashHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth.js'
import { StatusBar } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

const statusBarColors = {
  '/login': '#ffffff',
  '/project-view': '#006dd8',
  '/user-info': '#006dd8',
  '/about': '#006dd8',
  '/qr-scanner': '#000000',
}

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
  {
    path: '/about',
    component: () => import('../pages/About.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/qr-scanner',
    component: () => import('../pages/QrScanner.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/', redirect: '/project-view' },
  { path: '/:catchAll(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.afterEach((to) => {
  if (Capacitor.isNativePlatform()) {
    StatusBar.setBackgroundColor({ color: statusBarColors[to.path] ?? '#006dd8' })
  }
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
