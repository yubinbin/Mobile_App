<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['ProjectView']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <UpdateDialog />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { handleHomeSwipe } from './utils/swipeBack.js'
import { navState } from './utils/navState.js'
import { checkOnLaunch } from './utils/appUpdater.js'
import UpdateDialog from './components/UpdateDialog.vue'
import { isLoggedIn, verifyToken } from './utils/auth.js'
import { initializeJPush } from './utils/jpush.js'

function initStatusBar() {
  if (Capacitor.isNativePlatform()) {
    StatusBar.setOverlaysWebView({ overlay: false })
    StatusBar.setBackgroundColor({ color: '#006dd8' })
    StatusBar.setStyle({ style: Style.Light })
  }
}

const router = useRouter()

let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
let backButtonHandle = null
let appStateHandle = null
let backLock = false

// App 从后台切回前台时，服务端 session 可能已过期（如停在主页过夜）。
// 此处向服务端校验 token：明确失效则回登录页（自动登录会无感重登），
// 网络异常等无法判定的情况保持现状，避免误踢。onActivated 覆盖返回主页路径，此处覆盖直接切回场景。
async function onAppActive() {
  if (!isLoggedIn()) return
  const status = await verifyToken()
  if (status === 'invalid' && router.currentRoute.value.path !== '/login') {
    router.replace('/login')
  }
}

function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchStartTime = Date.now()
}

function onTouchEnd(e) {
  const deltaX = e.changedTouches[0].clientX - touchStartX
  const deltaY = e.changedTouches[0].clientY - touchStartY
  const elapsed = Date.now() - touchStartTime

  if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) || elapsed === 0) return
  if (Math.abs(deltaX) / elapsed < 0.3) return

  triggerBack()
}

function triggerBack() {
  if (backLock) return
  backLock = true

  const currentPath = router.currentRoute.value.path

  // iframe 内部返回仅在项目页生效（canGoBack 是项目页 iframe 的状态，
  // 其它页面不能用 history.back()，否则可能回退到 iframe 的外部历史项而跳浏览器）
  if (currentPath === '/project-view' && navState.canGoBack) {
    history.back()
    backLock = false
    return
  }

  if (currentPath === '/project-view' || currentPath === '/login') {
    handleHomeSwipe()
    backLock = false
    return
  }

  // app 自有子页面：跳回确定的父页面，不依赖共享历史栈
  if (currentPath === '/about') {
    router.replace('/user-info')
  } else {
    router.replace('/project-view')
  }
  backLock = false
}

onMounted(async () => {
  initStatusBar()
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  if (Capacitor.isNativePlatform()) {
    backButtonHandle = await App.addListener('backButton', triggerBack)
    appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) onAppActive()
    })
  }
  checkOnLaunch()
  initializeJPush()
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchend', onTouchEnd)
  backButtonHandle?.remove()
  appStateHandle?.remove()
})
</script>

<!-- 全局样式：处理 Android 15+ edge-to-edge / 部分 ROM 状态栏遮挡问题 -->
<!-- Capacitor SystemBars 在 passthrough 模式下会注入 --safe-area-inset-top（含状态栏高度），
     WebView 内容会延伸到状态栏下方，需要顶部栏自行避让。
     env(safe-area-inset-top) 在无刘海机型上返回 0，无法兜底，故优先用注入变量。 -->
<style>
.van-nav-bar {
  padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
  box-sizing: content-box;
}
</style>
