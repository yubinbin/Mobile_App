# 版本更新功能 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加应用版本更新检测功能，启动时自动检查 + 用户手动检查，支持可选/强制更新两种模式

**Architecture:** 在 `src/utils/` 下新增 `appUpdater.js` 工具模块，封装版本检查、版本号比较和弹窗逻辑。在 `App.vue` 启动时自动调用，在 `UserInfo.vue` 和 `About.vue` 中提供手动检查入口。使用 Vant Dialog 展示更新弹窗，与现有 UI 风格保持一致。

**Tech Stack:** Vue 3 + Vant 4 + Capacitor（Android），无新增依赖

---

### Task 1: 添加国际化文案

**Files:**
- Modify: `src/i18n/zh-CN.json`
- Modify: `src/i18n/zh-TW.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: 在 zh-CN.json 中添加更新相关文案**

在 `"version": "v1.0.7",` 之前插入以下内容：

```json
"update.newVersion": "发现新版本",
"update.forceTitle": "版本已过期",
"update.forceMsg": "当前版本已停止服务，请立即更新",
"update.currentVersion": "当前版本",
"update.changelog": "更新内容",
"update.updateNow": "立即更新",
"update.later": "稍后再说",
"update.checking": "正在检查更新...",
"update.alreadyLatest": "当前已是最新版本",
"update.checkFailed": "检查更新失败，请稍后重试",
"update.checkUpdate": "检查更新",
```

- [ ] **Step 2: 在 zh-TW.json 中添加更新相关文案**

在 `"version": "v1.0.7",` 之前插入以下内容：

```json
"update.newVersion": "發現新版本",
"update.forceTitle": "版本已過期",
"update.forceMsg": "當前版本已停止服務，請立即更新",
"update.currentVersion": "當前版本",
"update.changelog": "更新內容",
"update.updateNow": "立即更新",
"update.later": "稍後再說",
"update.checking": "正在檢查更新...",
"update.alreadyLatest": "當前已是最新版本",
"update.checkFailed": "檢查更新失敗，請稍後重試",
"update.checkUpdate": "檢查更新",
```

- [ ] **Step 3: 在 en.json 中添加更新相关文案**

在 `"version": "v1.0.7",` 之前插入以下内容：

```json
"update.newVersion": "New Version Available",
"update.forceTitle": "Version Expired",
"update.forceMsg": "This version is no longer supported. Please update now.",
"update.currentVersion": "Current Version",
"update.changelog": "What's New",
"update.updateNow": "Update Now",
"update.later": "Later",
"update.checking": "Checking for updates...",
"update.alreadyLatest": "You're up to date",
"update.checkFailed": "Update check failed, please try again",
"update.checkUpdate": "Check for Updates",
```

- [ ] **Step 4: 提交 i18n 变更**

```bash
git add src/i18n/zh-CN.json src/i18n/zh-TW.json src/i18n/en.json
git commit -m "feat: 添加版本更新国际化文案

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 创建 appUpdater.js 核心模块

**Files:**
- Create: `src/utils/appUpdater.js`

- [ ] **Step 1: 创建 `src/utils/appUpdater.js`**

```js
import { showConfirmDialog, showDialog, showToast } from 'vant'
import { t } from '../i18n'
import { isLoggedIn, authRequest } from './auth.js'
import { baseUrl } from './urlValues.js'

let checking = false

/**
 * 去掉 v/V 前缀，按 . 分段后逐段比较数字。
 * 返回 -1（a < b）、0（相等）、1（a > b）
 */
export function compareVersion(a, b) {
  const v1 = a.replace(/^v/i, '').split('.').map(Number)
  const v2 = b.replace(/^v/i, '').split('.').map(Number)
  const len = Math.max(v1.length, v2.length)
  for (let i = 0; i < len; i++) {
    const n1 = v1[i] || 0
    const n2 = v2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

/** 从 i18n 读取当前版本 */
function getCurrentVersion() {
  return t('version') || '0.0.0'
}

/** 调用 GET /api/app/version，5 秒超时 */
async function fetchVersionInfo() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const data = await authRequest(`${baseUrl}/app/version`, {
      signal: controller.signal,
    })
    return data
  } finally {
    clearTimeout(timeout)
  }
}

/** 弹出更新弹窗（可选 / 强制） */
function showUpdateDialog(info) {
  const current = getCurrentVersion()
  const msgLines = [
    `${t('update.currentVersion')}：${current}`,
    `\n${info.version}`,
  ]

  if (info.changelog) {
    msgLines.push(`\n${t('update.changelog')}：\n${info.changelog}`)
  }

  if (info.forceUpdate) {
    msgLines.push(`\n${t('update.forceMsg')}`)
  }

  const message = msgLines.join('\n')

  if (info.forceUpdate) {
    // 强制更新：不可关闭，返回键关闭后重新弹出
    function forceShow() {
      showDialog({
        title: t('update.forceTitle'),
        message,
        confirmButtonText: t('update.updateNow'),
        allowClose: false,
        closeOnPopstate: false,
      })
        .then(() => {
          window.open(info.updateUrl, '_system')
          // 打开链接后重新弹出（用户可能没完成更新）
          setTimeout(forceShow, 1000)
        })
        .catch(() => {
          // 返回键关闭后重新弹出
          setTimeout(forceShow, 200)
        })
    }
    forceShow()
  } else {
    // 可选更新
    showConfirmDialog({
      title: t('update.newVersion'),
      message,
      confirmButtonText: t('update.updateNow'),
      cancelButtonText: t('update.later'),
    })
      .then(() => {
        window.open(info.updateUrl, '_system')
      })
      .catch(() => {})
  }
}

/** 启动时自动检查（静默，失败不提示） */
export async function checkOnLaunch() {
  if (!isLoggedIn()) return
  if (checking) return

  checking = true
  try {
    const info = await fetchVersionInfo()
    if (!info || !info.version) return

    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) return

    showUpdateDialog(info)
  } catch {
    // 启动检查失败，静默忽略
  } finally {
    checking = false
  }
}

/** 手动检查（失败 Toast 提示） */
export async function checkManually() {
  if (!isLoggedIn()) return
  if (checking) return

  checking = true
  showToast({ message: t('update.checking'), forbidClick: true, duration: 0 })

  try {
    const info = await fetchVersionInfo()
    showToast.clear()

    if (!info || !info.version) {
      showToast(t('update.checkFailed'))
      return
    }

    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) {
      showToast(t('update.alreadyLatest'))
      return
    }

    showUpdateDialog(info)
  } catch {
    showToast.clear()
    showToast(t('update.checkFailed'))
  } finally {
    checking = false
  }
}
```

- [ ] **Step 2: 提交 appUpdater.js**

```bash
git add src/utils/appUpdater.js
git commit -m "feat: 添加版本更新核心模块 appUpdater.js

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 在 App.vue 中添加启动检查

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 在 `<script setup>` 中导入并调用 `checkOnLaunch`**

在现有 `import` 块末尾（`import { handleHomeSwipe } from './utils/swipeBack.js'` 之后）添加导入：

```js
import { checkOnLaunch } from './utils/appUpdater.js'
```

在 `onMounted` 回调中，`backButtonHandle` 注册之后（`}` 之后），`document.addEventListener` 之前，添加：

```js
checkOnLaunch()
```

修改后完整的 `onMounted` 部分：

```js
onMounted(async () => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  if (Capacitor.isNativePlatform()) {
    backButtonHandle = await App.addListener('backButton', triggerBack)
  }
  checkOnLaunch()
})
```

- [ ] **Step 2: 提交 App.vue 变更**

```bash
git add src/App.vue
git commit -m "feat: App.vue 启动时自动检查版本更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 在 UserInfo.vue 中添加"检查更新"菜单项

**Files:**
- Modify: `src/pages/UserInfo.vue`

- [ ] **Step 1: 添加"检查更新" van-cell**

在模板中，语言切换 CellGroup 之后、关于 CellGroup 之前，插入新的 CellGroup：

```html
<van-cell-group inset class="menu-group" style="margin-top: 8px;">
  <van-cell is-link @click="handleCheckUpdate" style="--van-cell-vertical-padding: 19px;">
    <template #title>
      <span class="menu-text" style="margin-left: 34px;">{{ $t('update.checkUpdate') }}</span>
    </template>
  </van-cell>
</van-cell-group>
```

- [ ] **Step 2: 在 `<script setup>` 中添加导入和处理函数**

在现有 import 中添加：

```js
import { checkManually } from '../utils/appUpdater.js'
```

在现有函数定义区域（`handleLogout` 之后）添加：

```js
const handleCheckUpdate = () => {
  checkManually()
}
```

- [ ] **Step 3: 提交 UserInfo.vue 变更**

```bash
git add src/pages/UserInfo.vue
git commit -m "feat: UserInfo 添加检查更新菜单项

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 在 About.vue 中添加"检查更新"按钮

**Files:**
- Modify: `src/pages/About.vue`

- [ ] **Step 1: 在模板版本号下方添加检查更新按钮**

将 `<div class="version">` 区域改为：

```html
<div class="version">
  <p>{{ $t('about.version') }}:v1.0.7</p>
  <p class="check-update" @click="handleCheckUpdate">{{ $t('update.checkUpdate') }}</p>
</div>
```

- [ ] **Step 2: 在 `<script setup>` 中添加导入和处理函数**

修改现有 script：

```js
import { useRouter } from 'vue-router'
import { checkManually } from '../utils/appUpdater.js'

const router = useRouter()

const handleCheckUpdate = () => {
  checkManually()
}
```

- [ ] **Step 3: 在 `<style scoped>` 中添加按钮样式**

在 `</style>` 之前添加：

```css
.check-update {
  margin-top: 6px;
  color: #006dd8;
  text-decoration: underline;
  cursor: pointer;
}
```

- [ ] **Step 4: 提交 About.vue 变更**

```bash
git add src/pages/About.vue
git commit -m "feat: About 页面添加检查更新入口

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### 验证

实现完成后，按以下场景手动验证：

| 场景 | 预期行为 |
|------|---------|
| `npm run dev` 启动成功 | 无编译错误 |
| 模拟接口返回无新版本 | 启动无弹窗，手动检查 Toast "已是最新" |
| 模拟接口返回新版本（可选） | 弹出可选更新弹窗，可点"稍后再说"关闭 |
| 模拟接口返回新版本（强制） | 弹出强制更新弹窗，返回键关闭后重新弹出 |
| 模拟接口超时 | 启动静默，手动 Toast "检查失败" |
| 双击"检查更新"按钮 | 不会重复请求 |
