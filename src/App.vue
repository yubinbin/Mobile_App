<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['ProjectView']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <transition name="slide-up">
    <div v-if="updateState.downloadState === 'downloading' || updateState.downloadState === 'failed'" class="download-bar">
      <div class="download-bar-content">
        <p class="download-title">{{ $t('update.downloadingTitle') }}</p>
        <div class="download-progress-wrap">
          <div class="download-progress-bar">
            <div class="download-progress-fill" :style="{ width: updateState.downloadProgress + '%' }"></div>
          </div>
          <span class="download-progress-text">{{ updateState.downloadProgress }}%</span>
        </div>
        <p v-if="updateState.downloadedSize" class="download-size">{{ updateState.downloadedSize }} / {{ updateState.totalSize }}</p>
        <p v-if="updateState.downloadState === 'failed'" class="download-failed-msg">{{ $t('update.downloadFailedMsg') }}</p>
        <div class="download-actions">
          <van-button v-if="updateState.downloadState === 'downloading'" size="small" plain round @click="cancelDownload">{{ $t('update.cancel') }}</van-button>
          <van-button v-if="updateState.downloadState === 'failed'" size="small" type="primary" round @click="retryDownload">{{ $t('update.retry') }}</van-button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { handleHomeSwipe } from './utils/swipeBack.js'
import { navState } from './utils/navState.js'
import { updateState } from './utils/updateState.js'
import { downloadAndInstall, checkOnLaunch, cancelCurrentDownload } from './utils/appUpdater.js'
import { isLoggedIn, verifyToken } from './utils/auth.js'

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

function cancelDownload() {
  cancelCurrentDownload()
}

function retryDownload() {
  if (updateState.updateInfo?.updateUrl) {
    downloadAndInstall(updateState.updateInfo.updateUrl)
  }
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
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchend', onTouchEnd)
  backButtonHandle?.remove()
  appStateHandle?.remove()
})
</script>

<style scoped>
.download-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000;
  background: #fff; border-radius: 16px 16px 0 0;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.15);
  padding: 20px 24px calc(20px + env(safe-area-inset-bottom));
}

.download-title {
  font-size: 15px; font-weight: 600; color: #333; margin: 0 0 12px;
}

.download-progress-wrap {
  display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
}

.download-progress-bar {
  flex: 1; height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden;
}

.download-progress-fill {
  height: 100%; background: linear-gradient(90deg, #2c5aa0, #006dd8);
  border-radius: 3px; transition: width 0.3s ease;
}

.download-progress-text {
  font-size: 14px; color: #2c5aa0; font-weight: 600; min-width: 40px; text-align: right;
}

.download-size {
  font-size: 12px; color: #999; margin: 0 0 8px;
}

.download-failed-msg {
  font-size: 13px; color: #FF4444; margin: 0 0 8px;
}

.download-actions {
  display: flex; justify-content: flex-end; gap: 8px;
}

/* 滑入/滑出动画 */
.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100%); opacity: 0;
}
</style>

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
