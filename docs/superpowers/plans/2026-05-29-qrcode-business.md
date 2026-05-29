# 二维码扫码功能正式业务实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将可行性验证阶段的扫码功能接入正式业务流——iframe 通过 postMessage 触发扫码，结果通过 CustomEvent 回传。

**Architecture:** App.vue 添加 keep-alive 缓存 ProjectView，QrScanner 改用 dispatchEvent 通信替代 localStorage，ProjectView 监听 message 和 CustomEvent 双向转发。

**Tech Stack:** Vue 3.5, Vant 4, Capacitor 8.3.4, @capacitor-mlkit/barcode-scanning

---

### Task 1: App.vue 添加 keep-alive 缓存 ProjectView

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 修改 App.vue 添加 keep-alive**

Read `src/App.vue`（当前内容）：
```vue
<template>
  <router-view />
</template>
```

Write `src/App.vue`（完整替换）：
```vue
<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['ProjectView']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>
```

Vue 3.5 的 `<script setup>` 会自动从文件名推断组件名：`ProjectView.vue` → `ProjectView`，无需手动声明 `name`。

- [ ] **Step 2: 提交**

```bash
cd "D:\work\source\mobile_app" && git add src/App.vue
git commit -m "feat: App.vue 添加 keep-alive 缓存 ProjectView

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: QrScanner.vue 简化并改用 dispatchEvent

**Files:**
- Modify: `src/pages/QrScanner.vue`

- [ ] **Step 1: 重写 QrScanner.vue**

Write `src/pages/QrScanner.vue`（完整替换）：

```vue
<template>
  <div class="qr-scanner-page">
    <div class="scanner-content">
      <p class="scan-hint">{{ $t('scan.hint') }}</p>

      <div v-if="!hasPermission" class="permission-denied">
        <van-empty :description="$t('scan.noCamera')" />
        <van-button type="primary" round block @click="handleBack">{{ $t('nav.back') }}</van-button>
      </div>
    </div>

    <div class="bottom-actions">
      <div class="bottom-center" v-if="torchAvailable" @click="toggleTorch">
        <van-icon name="bulb-o" size="24" :class="{ 'torch-on': torchOn }" />
        <span>{{ $t('scan.flashlight') }}</span>
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
      window.dispatchEvent(new CustomEvent('scanCodeResult', { detail: result.barcodes[0].rawValue }))
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
    window.dispatchEvent(new CustomEvent('scanCodeResult', { detail: '' }))
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

async function handleBack() {
  window.dispatchEvent(new CustomEvent('scanCodeResult', { detail: '' }))
  await cleanup()
  router.back()
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
  justify-content: center;
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
```

**变更说明：**
- 扫码成功：`localStorage.setItem('qr_result', ...)` → `window.dispatchEvent(new CustomEvent('scanCodeResult', { detail: ... }))`
- 超时 / 拒绝权限 / 返回：dispatch 空字符串 `{ detail: '' }`
- 去掉 `handleManualInput` 函数、底部手动输入和关闭按钮
- 权限拒绝时显示返回按钮，点击返回也 dispatch 空结果
- 手电筒按钮改为居中显示

- [ ] **Step 2: 提交**

```bash
cd "D:\work\source\mobile_app" && git add src/pages/QrScanner.vue
git commit -m "feat: QrScanner 改用 dispatchEvent 通信并简化 UI

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: ProjectView 添加 postMessage 监听与转发

**Files:**
- Modify: `src/pages/ProjectView.vue`

- [ ] **Step 1: 修改模板 — 去掉扫码图标**

Edit `src/pages/ProjectView.vue` 第 10-13 行：

Before:
```vue
      <template #right>
        <van-icon name="scan" size="20" class="nav-scan" @click="goScan" />
        <img src="@/assets/images/user.png" class="nav-avatar" @click="goUserInfo" />
      </template>
```

After:
```vue
      <template #right>
        <img src="@/assets/images/user.png" class="nav-avatar" @click="goUserInfo" />
      </template>
```

- [ ] **Step 2: 修改 script — 去掉 goScan、添加事件监听**

在 `onMounted` 函数内（第 86 行之前，即 `loading.value = false` 之前）添加 message 和 CustomEvent 监听注册：

```js
  window.addEventListener('message', onMessage)
  window.addEventListener('scanCodeResult', onScanResult)
```

在 `onUnmounted` 函数内（第 89 行之后，即 `if (timer) clearInterval(timer)` 之后）添加监听注销：

```js
  window.removeEventListener('message', onMessage)
  window.removeEventListener('scanCodeResult', onScanResult)
```

删除 `goScan` 函数（第 120-122 行）：
```js
const goScan = () => {
  router.push('/qr-scanner')
}
```

在其位置添加两个新的事件处理函数：

```js
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
```

- [ ] **Step 3: 去掉扫码图标样式**

删除第 132 行的 `.nav-scan` CSS 规则：
```css
.nav-scan { margin-right: 16px; cursor: pointer; color: #2c5aa0; }
```

- [ ] **Step 4: 提交**

```bash
cd "D:\work\source\mobile_app" && git add src/pages/ProjectView.vue
git commit -m "feat: ProjectView 添加 postMessage 监听与扫码结果转发

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 构建验证

- [ ] **Step 1: 构建前端**

```bash
cd "D:\work\source\mobile_app" && npx vite build
```
Expected: 构建成功，无报错。

- [ ] **Step 2: 同步到 Android**

```bash
cd "D:\work\source\mobile_app" && npx cap sync android
```
Expected: 同步成功。

---

### 验证清单（真机）

1. 登录进入项目页 → 右侧只显示用户头像，无扫码图标
2. iframe 内触发 `postMessage({ action: 'scanCode' })` → 跳转到扫码页
3. 扫二维码 → dispatch scanCodeResult → iframe 收到 `{ action:'scanCodeResult', data:{ result:'IMEI:xxx' } }`
4. 拒绝权限 / 超时 / 手动返回 → iframe 收到空结果 `{ result: '' }`
5. 扫码中返回 → ProjectView 保持原状态（iframe 不刷新）
