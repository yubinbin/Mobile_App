<template>
  <div class="qr-scanner-page">
    <div class="scanner-content">
      <p class="scan-hint">{{ $t('scan.hint') }}</p>

      <div v-if="!hasPermission" class="permission-denied">
        <van-empty :description="$t('scan.noCamera')" />
        <van-button type="primary" round block @click="handleManualInput">{{ $t('scan.manualInput') }}</van-button>
      </div>
    </div>

    <div class="bottom-actions">
      <div class="bottom-left" @click="handleManualInput">
        <van-icon name="edit" size="18" />
        <span>{{ $t('scan.manualInput') }}</span>
      </div>
      <div class="bottom-center" v-if="torchAvailable" @click="toggleTorch">
        <van-icon name="bulb-o" size="24" :class="{ 'torch-on': torchOn }" />
        <span>{{ $t('scan.flashlight') }}</span>
      </div>
      <div class="bottom-right" @click="handleClose">
        <van-icon name="cross" size="18" />
        <span>{{ $t('nav.back') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { t } from '../i18n'

const router = useRouter()
const hasPermission = ref(false)
const torchAvailable = ref(false)
const torchOn = ref(false)
let timeoutTimer = null
let listener = null
let isMounted = false

onMounted(async () => {
  isMounted = true
  try {
    const { camera } = await BarcodeScanner.checkPermissions()
    if (!isMounted) return
    if (camera === 'granted') {
      await startScanning()
    } else {
      const { camera: newStatus } = await BarcodeScanner.requestPermissions()
      if (!isMounted) return
      if (newStatus === 'granted') {
        await startScanning()
      } else {
        hasPermission.value = false
      }
    }
  } catch {
    if (isMounted) showToast(t('scan.cameraFail'))
  }
})

onUnmounted(async () => {
  isMounted = false
  await cleanup()
})

async function startScanning() {
  hasPermission.value = true

  listener = await BarcodeScanner.addListener('barcodesScanned', async (result) => {
    if (result.barcodes && result.barcodes.length > 0) {
      localStorage.setItem('qr_result', result.barcodes[0].rawValue)
      await cleanup()
      router.back()
    }
  })

  try {
    await BarcodeScanner.startScan()
    try {
      const { available } = await BarcodeScanner.isTorchAvailable()
      torchAvailable.value = available
    } catch {
      torchAvailable.value = false
    }
  } catch {
    showToast(t('scan.cameraFail'))
    hasPermission.value = false
    await cleanup()
    return
  }

  timeoutTimer = setTimeout(async () => {
    showToast(t('scan.timeout'))
    await cleanup()
  }, 30000)
}

async function toggleTorch() {
  try {
    await BarcodeScanner.toggleTorch()
    torchOn.value = !torchOn.value
  } catch {
    torchAvailable.value = false
  }
}

async function cleanup() {
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
  if (listener) { await listener.remove(); listener = null }
  try { await BarcodeScanner.stopScan() } catch {}
}

async function handleClose() {
  await cleanup()
  router.back()
}

function handleManualInput() {
  const value = window.prompt(t('scan.inputPlaceholder'))
  if (value && value.trim()) {
    localStorage.setItem('qr_result', value.trim())
    router.back()
  }
}
</script>

<style scoped>
.qr-scanner-page {
  height: 100vh;
  background: transparent;
  display: flex;
  flex-direction: column;
  position: relative;
}

.scanner-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.scan-hint {
  position: absolute;
  bottom: 180px;
  color: #fff;
  font-size: 14px;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  background: rgba(0,0,0,0.4);
  padding: 8px 20px;
  border-radius: 20px;
  z-index: 10;
}

.permission-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
  background: #f7f8fa;
  min-height: 100%;
  justify-content: center;
}

.bottom-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 24px 32px 48px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

.bottom-actions > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
}

.torch-on {
  color: #ffd21e;
}
</style>
