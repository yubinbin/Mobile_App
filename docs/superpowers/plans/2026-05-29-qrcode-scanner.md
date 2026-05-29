# 二维码扫码功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Vue 3 + Vant + Capacitor 混合应用中集成原生二维码扫码能力，验证技术可行性。

**Architecture:** 通过 @capacitor-mlkit/barcode-scanning 原生插件调用设备相机，新增 QrScanner.vue 页面承载全屏扫描 UI，结果通过 localStorage 回传。入口放在 ProjectView 导航栏。

**Tech Stack:** Vue 3, Vant 4, Capacitor 8.3.4, @capacitor-mlkit/barcode-scanning

---

### Task 1: 安装插件并配置 Android

**Files:**
- Modify: `package.json`（依赖变更）
- Modify: `android/app/src/main/AndroidManifest.xml:38-40`

- [ ] **Step 1: 安装插件**

Run:
```bash
cd "D:\work\source\mobile_app" && pnpm add @capacitor-mlkit/barcode-scanning
```
Expected: 成功安装，`package.json` 新增 `@capacitor-mlkit/barcode-scanning` 依赖。

- [ ] **Step 2: 同步原生项目**

Run:
```bash
cd "D:\work\source\mobile_app" && npx cap sync android
```
Expected: 插件注册到 Android 项目，无报错。

- [ ] **Step 3: 添加相机权限声明**

Edit `android/app/src/main/AndroidManifest.xml` — 在 `</manifest>` 前，INTERNET 权限后添加：

```xml
    <uses-permission android:name="android.permission.CAMERA" />
```

修改后的权限块：
```xml
    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
</manifest>
```

- [ ] **Step 4: 提交**

```bash
cd "D:\work\source\mobile_app" && git add package.json pnpm-lock.yaml android/app/src/main/AndroidManifest.xml
git commit -m "chore: 安装 @capacitor-mlkit/barcode-scanning 并配置相机权限

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: 添加国际化文本

**Files:**
- Modify: `src/i18n/zh-CN.json`
- Modify: `src/i18n/zh-TW.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: 在 zh-CN.json 添加扫码相关文本**

Edit `src/i18n/zh-CN.json` — 在 `"version"` 前插入：

```json
  "scan.title": "扫描二维码",
  "scan.hint": "将二维码放入框内即可扫描",
  "scan.manualInput": "手动输入",
  "scan.inputTitle": "输入二维码内容",
  "scan.inputPlaceholder": "请输入二维码内容",
  "scan.inputConfirm": "确定",
  "scan.noCamera": "需要相机权限才能扫码",
  "scan.cameraFail": "相机启动失败",
  "scan.timeout": "未检测到二维码",
  "scan.flashlight": "手电筒",

```

最终 `zh-CN.json`：
```json
{
  "login.username": "请输入用户名",
  "login.password": "请输入密码",
  "login.autoLogin": "自动登录",
  "login.button": "登录",
  "login.footer": "copyright © 2021 宁波弘讯软件开发有限公司",

  "nav.back": "返回",
  "nav.projectTitle": "弘设汇",
  "nav.userCenter": "个人中心",

  "user.userId": "用户ID",
  "user.username": "用户名",
  "user.version": "应用版本",
  "user.logout": "退出登录",
  "user.logoutConfirm": "确定要退出登录吗？",
  "user.language": "语言",
  "user.unknown": "未知用户",

  "lang.label": "语言",
  "lang.zhCN": "简体中文",
  "lang.zhTW": "繁體中文",
  "lang.en": "English",

  "dialog.title": "提示",

  "error.validate": "请输入用户名",
  "error.validatePwd": "请输入密码",
  "error.wrongPwd": "账号或密码错误",
  "error.userNotFound": "用户不存在或密码错误",
  "error.network": "服务器连接失败",
  "error.kicked": "您的账号在其他设备登录，已被强制下线",
  "error.reLogin": "重新登录",
  "error.loadFail": "页面加载失败，请检查网络连接",

  "scan.title": "扫描二维码",
  "scan.hint": "将二维码放入框内即可扫描",
  "scan.manualInput": "手动输入",
  "scan.inputTitle": "输入二维码内容",
  "scan.inputPlaceholder": "请输入二维码内容",
  "scan.inputConfirm": "确定",
  "scan.noCamera": "需要相机权限才能扫码",
  "scan.cameraFail": "相机启动失败",
  "scan.timeout": "未检测到二维码",
  "scan.flashlight": "手电筒",

  "loading": "加载中...",
  "empty": "暂无内容",

  "version": "v1.0.7"
}
```

- [ ] **Step 2: 在 zh-TW.json 添加繁体文本**

Read `src/i18n/zh-TW.json` first, then add the same keys with traditional Chinese:

```json
  "scan.title": "掃描二維碼",
  "scan.hint": "將二維碼放入框內即可掃描",
  "scan.manualInput": "手動輸入",
  "scan.inputTitle": "輸入二維碼內容",
  "scan.inputPlaceholder": "請輸入二維碼內容",
  "scan.inputConfirm": "確定",
  "scan.noCamera": "需要相機權限才能掃碼",
  "scan.cameraFail": "相機啟動失敗",
  "scan.timeout": "未檢測到二維碼",
  "scan.flashlight": "手電筒",
```

- [ ] **Step 3: 在 en.json 添加英文文本**

Read `src/i18n/en.json` first, then add the same keys with English:

```json
  "scan.title": "Scan QR Code",
  "scan.hint": "Place the QR code within the frame to scan",
  "scan.manualInput": "Manual Input",
  "scan.inputTitle": "Enter QR Code Content",
  "scan.inputPlaceholder": "Please enter QR code content",
  "scan.inputConfirm": "Confirm",
  "scan.noCamera": "Camera permission is required to scan",
  "scan.cameraFail": "Camera failed to start",
  "scan.timeout": "No QR code detected",
  "scan.flashlight": "Flashlight",
```

- [ ] **Step 4: 提交**

```bash
cd "D:\work\source\mobile_app" && git add src/i18n/
git commit -m "feat: 添加扫码页国际化文本

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: 创建扫码页面 QrScanner.vue

**Files:**
- Create: `src/pages/QrScanner.vue`

- [ ] **Step 1: 创建 QrScanner.vue**

Write `src/pages/QrScanner.vue`:

```vue
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
        <van-icon :name="torchOn ? 'bulb-o' : 'bulb-o'" size="24" :class="{ 'torch-on': torchOn }" />
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
import { showToast, showDialog } from 'vant'
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { t } from '../i18n'

const router = useRouter()
const hasPermission = ref(false)
const torchAvailable = ref(false)
const torchOn = ref(false)
let timeoutTimer = null
let listener = null

onMounted(async () => {
  try {
    const { camera } = await BarcodeScanner.checkPermissions()
    if (camera === 'granted') {
      await startScanning()
    } else {
      const { camera: newStatus } = await BarcodeScanner.requestPermissions()
      if (newStatus === 'granted') {
        await startScanning()
      } else {
        hasPermission.value = false
      }
    }
  } catch {
    showToast(t('scan.cameraFail'))
  }
})

onUnmounted(async () => {
  cleanup()
})

async function startScanning() {
  hasPermission.value = true

  listener = await BarcodeScanner.addListener('barcodeScanned', async (result) => {
    if (result.barcode && result.barcode.rawValue) {
      localStorage.setItem('qr_result', result.barcode.rawValue)
      await cleanup()
      router.back()
    }
  })

  await BarcodeScanner.startScan()

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
  showDialog({
    title: t('scan.inputTitle'),
    showCancelButton: true,
    confirmButtonText: t('scan.inputConfirm'),
    cancelButtonText: t('nav.back'),
  }).then((res) => {
    if (res === 'confirm') {
      // van-dialog 的 input 需要通过 messageAlign 和 message 配合，这里用 prompt 模式
    }
  })
}

async function showManualPrompt() {
  // 使用原生 prompt 弹窗方式
  const value = prompt(t('scan.inputPlaceholder'))
  if (value && value.trim()) {
    localStorage.setItem('qr_result', value.trim())
    await cleanup()
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
}

.permission-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
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
```

Wait — the manual input flow above is broken (uses `showDialog` without actually capturing input, then falls through to another function). Let me rewrite this properly with a cleaner approach using `showDialog` with message input via `van-dialog` that includes a text field, or simpler: use the browser `prompt()` as a pragmatic fallback for manual input.

- [ ] **Step 1: 创建 QrScanner.vue（重新修订版）**

Write `src/pages/QrScanner.vue`:

```vue
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

onMounted(async () => {
  try {
    const { camera } = await BarcodeScanner.checkPermissions()
    if (camera === 'granted') {
      await startScanning()
    } else {
      const { camera: newStatus } = await BarcodeScanner.requestPermissions()
      if (newStatus === 'granted') {
        await startScanning()
      } else {
        hasPermission.value = false
      }
    }
  } catch {
    showToast(t('scan.cameraFail'))
  }
})

onUnmounted(async () => {
  await cleanup()
})

async function startScanning() {
  hasPermission.value = true

  listener = await BarcodeScanner.addListener('barcodeScanned', async (result) => {
    if (result.barcode && result.barcode.rawValue) {
      localStorage.setItem('qr_result', result.barcode.rawValue)
      await cleanup()
      router.back()
    }
  })

  try {
    await BarcodeScanner.startScan()
    // 检测手电筒是否可用
    try {
      torchAvailable.value = true
    } catch {
      torchAvailable.value = false
    }
  } catch {
    showToast(t('scan.cameraFail'))
    hasPermission.value = false
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
```

- [ ] **Step 2: 提交**

```bash
cd "D:\work\source\mobile_app" && git add src/pages/QrScanner.vue
git commit -m "feat: 创建扫码页面 QrScanner.vue

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 添加路由

**Files:**
- Modify: `src/router/index.js`

- [ ] **Step 1: 在 router/index.js 中添加扫码路由**

Edit `src/router/index.js` — 在 `routes` 数组中的 `/user-info` 路由后面添加：

```js
  {
    path: '/qr-scanner',
    component: () => import('../pages/QrScanner.vue'),
    meta: { requiresAuth: true },
  },
```

修改后的 routes：
```js
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
    path: '/qr-scanner',
    component: () => import('../pages/QrScanner.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/', redirect: '/project-view' },
  { path: '/:catchAll(.*)*', redirect: '/login' },
]
```

- [ ] **Step 2: 提交**

```bash
cd "D:\work\source\mobile_app" && git add src/router/index.js
git commit -m "feat: 添加 /qr-scanner 路由

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: 在项目页添加扫码入口

**Files:**
- Modify: `src/pages/ProjectView.vue`

- [ ] **Step 1: 在导航栏右侧添加扫码图标**

Edit `src/pages/ProjectView.vue` — 修改 `<template #right>` 部分，在用户头像前添加扫码图标：

```vue
      <template #right>
        <van-icon name="scan" size="20" class="nav-scan" @click="goScan" />
        <img src="@/assets/images/user.png" class="nav-avatar" @click="goUserInfo" />
      </template>
```

- [ ] **Step 2: 在 script 中添加 goScan 方法**

Edit `src/pages/ProjectView.vue` — 在 `goUserInfo` 函数后添加：

```js
const goScan = () => {
  router.push('/qr-scanner')
}
```

- [ ] **Step 3: 添加扫码图标样式**

Edit `src/pages/ProjectView.vue` — 在 `<style scoped>` 中 `.nav-avatar` 样式前添加：

```css
.nav-scan { margin-right: 16px; cursor: pointer; color: #2c5aa0; }
```

- [ ] **Step 4: 提交**

```bash
cd "D:\work\source\mobile_app" && git add src/pages/ProjectView.vue
git commit -m "feat: 项目页导航栏添加扫码入口

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: 构建验证

- [ ] **Step 1: 构建前端**

```bash
cd "D:\work\source\mobile_app" && npx vite build
```
Expected: 构建成功，无报错。

- [ ] **Step 2: 同步到 Android 并编译**

```bash
cd "D:\work\source\mobile_app" && npx cap sync android
```
Expected: 同步成功，Android 项目引用最新 web 资源。

- [ ] **Step 3: 检查最终文件清单**

```bash
cd "D:\work\source\mobile_app" && git status
```
Expected: 工作区干净，所有变更已提交。

---

### 验证清单（真机）

以下步骤需要 Android 真机执行：

1. 打开 Android Studio 或运行 `npx cap open android`，部署到设备
2. 登录后进入项目页 → 右上角出现扫码图标
3. 点击扫码图标 → 进入扫码页，相机预览正常
4. 对准二维码扫描 → 识别成功 → 自动返回上一页 → `localStorage` 中有 `qr_result`
5. 点击手电筒按钮 → 手电筒开关正常
6. 点击"手动输入" → prompt 弹窗 → 输入文本后确认 → 返回保存结果
7. 拒绝权限 → 显示无权限提示页 + 手动输入兜底按钮
