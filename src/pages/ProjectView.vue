<template>
  <div class="project-view-page">
    <van-nav-bar :title="$t('nav.projectTitle')" fixed placeholder>
      <template #left>
        <div v-show="canGoBack" class="nav-left" @click="handleBack">
          <van-icon name="arrow-left" size="18" />
          <span>{{ $t('nav.back') }}</span>
        </div>
      </template>
      <template #right>
        <img src="@/assets/images/user.png" class="nav-avatar" @click="goUserInfo" />
      </template>
    </van-nav-bar>

    <div class="content-area">
      <div v-if="error" class="status-container">
        <van-empty image="error" :description="error" />
        <van-button type="primary" @click="handleBack">{{ $t('nav.back') }}</van-button>
      </div>

      <div v-else-if="loading" class="status-container">
        <van-loading type="spinner" size="48" color="#2c5aa0" />
        <p class="loading-text">{{ $t('loading') }}</p>
      </div>

      <iframe
        v-else-if="projectUrl"
        ref="iframeRef"
        :src="projectUrl"
        class="web-view"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        @load="onIframeLoad"
        @error="onIframeError"
      ></iframe>

      <van-empty v-else :description="$t('empty')" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getToken, getUserInfo } from '../utils/auth.js'
import { t } from '../i18n'

const route = useRoute()
const router = useRouter()

const projectUrl = ref('')
const loading = ref(true)
const error = ref('')
const canGoBack = ref(false)

let baseLen = 0
let timer = null

onMounted(() => {
  const token = getToken()
  if (!token) { router.replace('/login'); return }

  baseLen = history.length
  history.replaceState({ root: true }, '', window.location.href)
  window.addEventListener('popstate', onPopState)

  // 定时检测 history 增长，兼容 iframe 内 pushState / location 跳转
  timer = setInterval(() => {
    if (baseLen > 0 && history.length > baseLen) {
      canGoBack.value = true
    }
  }, 500)

  const { projectOID, userOID, webUrl, projectUrl: directUrl } = route.query

  if (directUrl) {
    projectUrl.value = directUrl
  } else {
    const savedUser = getUserInfo()
    const uid = userOID || savedUser?.userAID || 'default'
    const base = webUrl || 'https://tmplascloud.com'
    const pid = projectOID || '10238'
    projectUrl.value = `${base}/app/ttcEngineDefalut?ttcVersion=2.6.0&projectOID=${pid}&userOID=${uid}&access_token=${token}`
  }
  window.addEventListener('message', onMessage)
  window.addEventListener('scanCodeResult', onScanResult)
  loading.value = false
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
  if (timer) clearInterval(timer)
  window.removeEventListener('message', onMessage)
  window.removeEventListener('scanCodeResult', onScanResult)
})

const onIframeLoad = () => {
  loading.value = false
  // iframe 首次加载完成后，把当前 history 长度作为新的基线
  baseLen = history.length
}

const onIframeError = () => {
  error.value = t('error.loadFail')
  loading.value = false
}

const onPopState = (e) => {
  if (e.state && e.state.root) {
    canGoBack.value = false
    baseLen = history.length
    history.replaceState({ root: true }, '', window.location.href)
  }
}

const handleBack = () => {
  history.back()
}

const goUserInfo = () => {
  router.push('/user-info')
}

const onMessage = (event) => {
  if (event.origin !== 'https://tmx.tmiot.com.cn') return
  const { action } = event.data || {}
  if (action === 'scanCode') {
    router.push('/qr-scanner')
  }
}

const onScanResult = (event) => {
  const iframe = iframeRef.value
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { action: 'scanCodeResult', data: { result: event.detail } },
      'https://tmx.tmiot.com.cn'
    )
  }
}
</script>

<style scoped>
.project-view-page { height: 100vh; display: flex; flex-direction: column; }
.content-area { flex: 1; position: relative; overflow: hidden; }
.web-view { width: 100%; height: 100%; border: none; }
.status-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; }
.loading-text { color: #666; margin-top: 8px; }
.nav-left { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.nav-avatar { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; }
</style>
