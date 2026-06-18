<template>
  <div class="project-view-page" :class="{ scanning }">
    <van-nav-bar v-show="!scanning" :title="$t('nav.projectTitle')" style="--van-nav-bar-background: #006dd8; --van-nav-bar-title-text-color: #fff; --van-nav-bar-icon-color: #fff; --van-nav-bar-height: 44px; --van-nav-bar-title-font-size: 17px;">
      <template #left>
        <van-icon name="arrow-left" size="18" color="#fff" @click="handleBack" />
      </template>
      <template #right>
        <img @click="goUserInfo" src="@/assets/images/user.png" class="user-img" />
      </template>
    </van-nav-bar>

    <div class="content-area" v-show="!scanning">
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
        allow="camera; microphone; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        @load="onIframeLoad"
        @error="onIframeError"
      ></iframe>

      <van-empty v-else :description="$t('empty')" />
    </div>

    <!-- 扫码覆盖层：透明背景让相机透出来，提供取消按钮 -->
    <div v-if="scanning" class="scan-overlay">
      <p class="scan-hint">{{ $t('scan.hint') }}</p>
      <van-button class="scan-cancel" round @click="stopScan">{{ $t('nav.back') }}</van-button>
    </div>
  </div>
</template>

<script>
export default { name: 'ProjectView' }
</script>

<script setup>
import { ref, onMounted, onUnmounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getToken, getUserInfo } from '../utils/auth.js'
import { t, locale } from '../i18n'
import { baseUrl, projectOID, ttcVersion } from '../utils/urlValues.js'
import { navState } from '../utils/navState.js'
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()

const iframeRef = ref(null)
const projectUrl = ref('')
const loading = ref(true)
const error = ref('')
const canGoBack = ref(false)
const scanning = ref(false)
let baseHistoryLength = 0
let scanListener = null
let scanTimer = null

function setLang(url) {
  const u = new URL(url)
  u.searchParams.set('lang', locale.value)
  return u.toString()
}

function onPopState() {
  const depth = history.length - baseHistoryLength
  canGoBack.value = depth > 0
  navState.canGoBack = canGoBack.value
}

onMounted(() => {
  const token = getToken()
  if (!token) { router.replace('/login'); return }

  baseHistoryLength = history.length
  window.addEventListener('popstate', onPopState)

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

onActivated(() => {
  const token = getToken()
  if (!token) { router.replace('/login'); return }
  // token 变了说明换账号登录，重新加载 iframe
  if (projectUrl.value && !projectUrl.value.includes(token)) {
    const savedUser = getUserInfo()
    const uid = savedUser?.userAID || 'default'
    projectUrl.value = setLang(`${baseUrl}/app/ttcEngineDefalut?ttcVersion=${ttcVersion}&projectOID=${projectOID}&userOID=${uid}&access_token=${token}`)
  }
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
  window.removeEventListener('popstate', onPopState)
  stopScan()
})

async function startScan() {
  try {
    const { camera } = await BarcodeScanner.checkPermissions()
    const status = camera === 'granted' ? camera : (await BarcodeScanner.requestPermissions()).camera
    if (status !== 'granted') { showToast(t('scan.noCamera')); return }
  } catch { showToast(t('scan.cameraFail')); return }

  scanListener = await BarcodeScanner.addListener('barcodesScanned', async (result) => {
    if (result.barcodes?.length > 0) {
      const value = result.barcodes[0].rawValue || result.barcodes[0].displayValue
      await stopScan()
      iframeRef.value?.contentWindow?.postMessage({ action: 'scanCodeResult', data: { result: value } }, '*')
    }
  })

  try {
    document.body.classList.add('barcode-scanning')
    await BarcodeScanner.startScan()
    scanning.value = true
  } catch { document.body.classList.remove('barcode-scanning'); showToast(t('scan.cameraFail')); await stopScan(); return }

  scanTimer = setTimeout(() => { showToast(t('scan.timeout')); stopScan() }, 30000)
}

async function stopScan() {
  if (scanTimer) { clearTimeout(scanTimer); scanTimer = null }
  if (scanListener) { await scanListener.remove(); scanListener = null }
  try { await BarcodeScanner.stopScan() } catch {}
  document.body.classList.remove('barcode-scanning')
  scanning.value = false
}

const onIframeLoad = () => { loading.value = false }
const onIframeError = () => { error.value = t('error.loadFail'); loading.value = false }
const handleBack = () => { history.back() }
const goUserInfo = () => { router.push('/user-info') }

const onMessage = (event) => {
  if (event.origin !== baseUrl) return
  const { action, type, url } = event.data || {}
  if (type === 'URL_CHANGE') {
    canGoBack.value = url.includes('/?pageId=')
    navState.canGoBack = canGoBack.value
  }
  if (action === 'scanCode') {
    startScan()
  }
}
</script>

<style scoped>
.project-view-page { height: 100vh; display: flex; flex-direction: column; }
.project-view-page.scanning { background: transparent; }
.content-area { flex: 1; position: relative; overflow: hidden; }
.web-view { width: 100%; height: 100%; border: none; }
.status-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; }
.loading-text { color: #666; margin-top: 8px; }
.user-img { width: 26px; height: 26px; vertical-align: middle; }
:deep(.van-hairline--bottom::after) { border-bottom-width: 0; }
.scan-overlay { position: fixed; inset: 0; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 80px; z-index: 9999; }
.scan-hint { color: #fff; background: rgba(0,0,0,0.4); padding: 8px 20px; border-radius: 20px; font-size: 14px; margin-bottom: 24px; }
.scan-cancel { width: 160px; }
</style>
