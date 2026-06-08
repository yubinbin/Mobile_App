<template>
  <div class="project-view-page">
    <van-nav-bar :title="$t('nav.projectTitle')" fixed placeholder style="--van-nav-bar-background: #006dd8; --van-nav-bar-title-text-color: #fff; --van-nav-bar-icon-color: #fff; --van-nav-bar-height: 44px; --van-nav-bar-title-font-size: 17px;">
      <template #left>
        <van-icon v-show="canGoBack" name="arrow-left" size="18" color="#fff" @click="handleBack" />
      </template>
      <template #right>
        <!-- <van-icon v-show="!canGoBack" name="../assets/images/user.png" @click="goUserInfo" size="26" /> -->
        <img v-show="!canGoBack" @click="goUserInfo" src="@/assets/images/user.png" class="user-img" />
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
import { ref, onMounted, onUnmounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getToken, getUserInfo } from '../utils/auth.js'
import { t, locale } from '../i18n'
import { baseUrl, projectOID, ttcVersion } from '../utils/urlValues.js'
import { scanState } from '../utils/scanState.js'

const route = useRoute()
const router = useRouter()

const iframeRef = ref(null)
const projectUrl = ref('')
const loading = ref(true)
const error = ref('')
const canGoBack = ref(false)

function setLang(url) {
  const u = new URL(url)
  u.searchParams.set('lang', locale.value)
  return u.toString()
}

onMounted(() => {
  const token = getToken()
  if (!token) { router.replace('/login'); return }

  const { userOID, projectUrl: directUrl } = route.query

  if (directUrl) {
    projectUrl.value = setLang(directUrl)
  } else {
    const savedUser = getUserInfo()
    const uid = userOID || savedUser?.userAID || 'default'
    projectUrl.value = setLang(`${baseUrl}/app/ttcEngineDefalut?ttcVersion=${ttcVersion}&projectOID=${projectOID}&userOID=${uid}&access_token=${token}`)
  }
  window.addEventListener('message', onMessage)
  loading.value = false
})

watch(locale, () => {
  if (projectUrl.value) projectUrl.value = setLang(projectUrl.value)
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
})

onActivated(() => {
  if (scanState.pendingResult !== null) {
    const result = scanState.pendingResult
    scanState.pendingResult = null
    const iframe = iframeRef.value
    console.log('ProjectView - onActivated - 处理扫码结果:', result)
    if (iframe && iframe.contentWindow) {
      console.log('ProjectView - onActivated - 向iframe发送扫码结果:', result)
      iframe.contentWindow.postMessage(
        { action: 'scanCodeResult', data: { result } },
        baseUrl
      )
    }
  }
})

const onIframeLoad = () => {
  loading.value = false
}

const onIframeError = () => {
  error.value = t('error.loadFail')
  loading.value = false
}

const handleBack = () => {
  history.back()
}

const goUserInfo = () => {
  router.push('/user-info')
}

const onMessage = (event) => {
  console.log('Received message from iframe: ', event)
  if (event.origin !== baseUrl) {
    return
  }
  const { action, type, url } = event.data || {}
  if (type === 'URL_CHANGE') {
    canGoBack.value = url.includes('/?pageId=')
  }
  if (action === 'scanCode') {
    router.push('/qr-scanner')
  }
}

</script>

<style scoped>
.project-view-page { height: 100vh; display: flex; flex-direction: column; }
.content-area { flex: 1; position: relative; overflow: hidden; }
.web-view { width: 100%; height: 100%; border: none; }
.status-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; }
.loading-text { color: #666; margin-top: 8px; }
.user-img { width: 26px; height: 26px; vertical-align: middle; }
:deep(.van-hairline--bottom::after) { border-bottom-width: 0; }
</style>
