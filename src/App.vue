<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['ProjectView']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
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
let backLock = false

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
  }
  checkOnLaunch()
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchend', onTouchEnd)
  backButtonHandle?.remove()
})
</script>
