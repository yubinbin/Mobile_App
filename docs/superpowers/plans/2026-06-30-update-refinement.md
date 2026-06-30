# 版本更新功能细化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 细化版本更新功能：增加红点角标提示、按钮上展示当前版本号、下载改为非阻塞浮动进度条

**Architecture:** 新增 `updateState.js` 响应式状态模块作为数据中枢，`appUpdater.js` 写入状态，`App.vue` 渲染全局浮动进度条，`UserInfo.vue` 和 `About.vue` 监听状态显示红点角标和版本号

**Tech Stack:** Vue 3 (Composition API + reactive), Vant 4, Capacitor

## Global Constraints

- 不改变现有 API 接口约定
- 不改变 `compareVersion` / `fetchVersionInfo` 等核心函数签名
- 原有 `checkOnLaunch` / `checkManually` 对外接口不变
- `urlValues.js` 中的 `appVersion` 继续作为当前版本号来源
- 所有 UI 文案需覆盖 zh-CN / zh-TW / en 三种语言

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/utils/updateState.js` | 新增 | 响应式更新状态模块：hasUpdate、updateInfo、downloadState/Progress/Size |
| `src/utils/appUpdater.js` | 修改 | 写入 updateState + downloadAndInstall 非阻塞化 |
| `src/i18n/zh-CN.json` | 修改 | 新增 3 条国际化 key |
| `src/i18n/zh-TW.json` | 修改 | 新增 3 条国际化 key |
| `src/i18n/en.json` | 修改 | 新增 3 条国际化 key |
| `src/App.vue` | 修改 | 新增全局浮动下载进度条（fixed 底部） |
| `src/pages/UserInfo.vue` | 修改 | "检查更新" Cell 右侧显示版本号 + 红点 |
| `src/pages/About.vue` | 修改 | "检查更新"旁加红点 |

---

### Task 1: 创建 updateState 响应式状态模块

**Files:**
- Create: `src/utils/updateState.js`

**Interfaces:**
- Consumes: 无
- Produces: `updateState` (reactive object)
  - `hasUpdate: boolean` — 是否有新版本
  - `updateInfo: object | null` — 新版本信息 `{ version, changelog, updateUrl, forceUpdate }`
  - `downloadState: 'idle' | 'downloading' | 'completed' | 'failed'`
  - `downloadProgress: number` — 0-100
  - `downloadedSize: string` — 已下载大小（格式化字符串，如 "12.5 MB"）
  - `totalSize: string` — 总大小（格式化字符串，如 "45.0 MB"）

- [ ] **Step 1: 创建文件**

```js
// src/utils/updateState.js
import { reactive } from 'vue'

export const updateState = reactive({
  hasUpdate: false,
  updateInfo: null,
  downloadState: 'idle',
  downloadProgress: 0,
  downloadedSize: '',
  totalSize: '',
})
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/updateState.js
git commit -m "feat: 新增 updateState 响应式更新状态模块"
```

---

### Task 2: 修改 appUpdater.js — 集成 updateState + 下载非阻塞化

**Files:**
- Modify: `src/utils/appUpdater.js`

**Interfaces:**
- Consumes: `updateState` from `src/utils/updateState.js`
- Produces: `checkOnLaunch()`, `checkManually()` — 签名不变，行为增加写入 updateState
- Produces: `downloadAndInstall(url)` — 内部函数，改为写入 updateState 而非 Toast

- [ ] **Step 1: 在文件顶部新增 import**

```js
import { updateState } from './updateState.js'
```

在 `src/utils/appUpdater.js` 的现有 import 区域（第 1-5 行附近）添加：

```js
import { updateState } from './updateState.js'
```

- [ ] **Step 2: 重写 downloadAndInstall 函数 — 改为写入 updateState**

将现有的 `downloadAndInstall` 函数（第 10-31 行）替换为：

```js
async function downloadAndInstall(url) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    window.open(url, '_system')
    return
  }

  const plugin = Capacitor.Plugins.ApkInstaller
  updateState.downloadState = 'downloading'
  updateState.downloadProgress = 0
  updateState.downloadedSize = ''
  updateState.totalSize = ''

  const listener = await plugin.addListener('progress', ({ percent }) => {
    updateState.downloadProgress = percent
  })

  try {
    await plugin.download({ url })
    updateState.downloadState = 'completed'
    updateState.downloadProgress = 100
  } catch {
    updateState.downloadState = 'failed'
  } finally {
    listener.remove()
  }
}
```

- [ ] **Step 3: 在 fetchVersionInfo 之后写入 hasUpdate + updateInfo**

在 `checkOnLaunch` 函数中，找到 `showUpdateDialog(info)` 调用处（约第 143 行），在其上方添加写入 updateState：

```js
// 在 showUpdateDialog(info) 调用之前插入以下三行：
updateState.hasUpdate = true
updateState.updateInfo = info
updateState.downloadState = 'idle'
```

在 `checkManually` 函数中，找到 `showUpdateDialog(info)` 调用处（约第 174 行），在其上方添加同样的三行：

```js
// 在 showUpdateDialog(info) 调用之前插入以下三行：
updateState.hasUpdate = true
updateState.updateInfo = info
updateState.downloadState = 'idle'
```

- [ ] **Step 4: 在检查开始时重置 updateState**

在 `checkOnLaunch` 函数的 `checking = true` 之后插入：

```js
updateState.hasUpdate = false
```

在 `checkManually` 函数的 `checking = true` 之后插入：

```js
updateState.hasUpdate = false
```

- [ ] **Step 5: 在已是最新版本时清除 hasUpdate**

在 `checkOnLaunch` 中找到 `if (compareVersion(current, info.version) >= 0) return`（约第 141 行），在其上方添加：

```js
updateState.hasUpdate = false
```

在 `checkManually` 中找到对应的已是最新版本判断处（约第 169 行，`showToast(t('update.alreadyLatest'))` 之后），确保 `updateState.hasUpdate = false`（已在 Step 4 开头设置，此处无需额外处理）。

- [ ] **Step 6: 提交**

```bash
git add src/utils/appUpdater.js
git commit -m "feat: appUpdater 集成 updateState，下载改为非阻塞模式"
```

---

### Task 3: 新增国际化文案

**Files:**
- Modify: `src/i18n/zh-CN.json`
- Modify: `src/i18n/zh-TW.json`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: 无
- Produces: 三个新 i18n key: `update.downloadingTitle`, `update.downloadFailedMsg`, `update.cancel`

- [ ] **Step 1: 在 zh-CN.json 中新增 3 条 key**

在 `src/i18n/zh-CN.json` 的 update 区块（`"update.checkUpdate"` 之后）添加：

```json
"update.downloadingTitle": "正在下载新版本",
"update.downloadFailedMsg": "下载失败，请重试",
"update.cancel": "取消",
```

- [ ] **Step 2: 在 zh-TW.json 中新增 3 条 key**

在 `src/i18n/zh-TW.json` 的 update 区块（`"update.checkUpdate"` 之后）添加：

```json
"update.downloadingTitle": "正在下載新版本",
"update.downloadFailedMsg": "下載失敗，請重試",
"update.cancel": "取消",
```

- [ ] **Step 3: 在 en.json 中新增 3 条 key**

在 `src/i18n/en.json` 的 update 区块（`"update.checkUpdate"` 之后）添加：

```json
"update.downloadingTitle": "Downloading Update",
"update.downloadFailedMsg": "Download failed, tap to retry",
"update.cancel": "Cancel",
```

- [ ] **Step 4: 提交**

```bash
git add src/i18n/zh-CN.json src/i18n/zh-TW.json src/i18n/en.json
git commit -m "feat: 新增下载进度条相关国际化文案"
```

---

### Task 4: App.vue 新增全局浮动下载进度条

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `updateState` from `src/utils/updateState.js`
- Consumes: `t` from `src/i18n`（已在 App.vue 中间接可用，需直接 import 或使用 `$t`）

- [ ] **Step 1: 在 script 中新增 import**

在 `<script setup>` 区块的现有 import 区域添加：

```js
import { updateState } from './utils/updateState.js'
import { downloadAndInstall } from './utils/appUpdater.js'
```

添加取消和重试函数：

```js
function cancelDownload() {
  updateState.downloadState = 'idle'
  updateState.downloadProgress = 0
}

function retryDownload() {
  if (updateState.updateInfo?.updateUrl) {
    updateState.downloadState = 'idle'
    downloadAndInstall(updateState.updateInfo.updateUrl)
  }
}
```

- [ ] **Step 2: 在 template 中添加进度条 HTML**

在 `<template>` 中，`<router-view>` 之后添加：

```html
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
        <van-button v-if="updateState.downloadState === 'failed'" size="small" type="primary" round @click="retryDownload">{{ $t('update.downloadFailedMsg') }}</van-button>
      </div>
    </div>
  </div>
</transition>
```

- [ ] **Step 3: 在 style 中添加进度条样式**

在 `<style scoped>` 末尾添加：

```css
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
```

- [ ] **Step 4: 提交**

```bash
git add src/App.vue src/utils/appUpdater.js
git commit -m "feat: App.vue 新增全局浮动下载进度条"
```

---

### Task 5: UserInfo.vue — 版本号 + 红点角标

**Files:**
- Modify: `src/pages/UserInfo.vue`

**Interfaces:**
- Consumes: `updateState` from `src/utils/updateState.js`
- Consumes: `appVersion` from `src/utils/urlValues.js`

- [ ] **Step 1: 在 script 中新增 import**

在 `<script setup>` 中添加：

```js
import { updateState } from '../utils/updateState.js'
import { appVersion } from '../utils/urlValues.js'
```

- [ ] **Step 2: 修改"检查更新" Cell 的模板**

将现有的"检查更新" Cell（第 27-32 行）：

```html
<van-cell is-link @click="handleCheckUpdate" style="--van-cell-vertical-padding: 19px;">
  <template #title>
    <img src="@/assets/images/checkUpdate.png" class="menu-img" />
    <span class="menu-text">{{ $t('update.checkUpdate') }}</span>
  </template>
</van-cell>
```

替换为：

```html
<van-cell is-link @click="handleCheckUpdate" style="--van-cell-vertical-padding: 19px;">
  <template #title>
    <img src="@/assets/images/checkUpdate.png" class="menu-img" />
    <span class="menu-text">{{ $t('update.checkUpdate') }}</span>
  </template>
  <template #value>
    <span class="version-text">v{{ appVersion }}</span>
    <span v-if="updateState.hasUpdate" class="update-dot"></span>
  </template>
</van-cell>
```

- [ ] **Step 3: 在 style 中添加版本号和红点样式**

在 `<style scoped>` 末尾添加：

```css
.version-text {
  font-size: 14px; color: #999; margin-right: 6px; vertical-align: middle;
}

.update-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: #FF4444; vertical-align: middle;
}
```

- [ ] **Step 4: 提交**

```bash
git add src/pages/UserInfo.vue
git commit -m "feat: UserInfo 检查更新按钮显示版本号 + 红点角标"
```

---

### Task 6: About.vue — 红点角标

**Files:**
- Modify: `src/pages/About.vue`

**Interfaces:**
- Consumes: `updateState` from `src/utils/updateState.js`

- [ ] **Step 1: 在 script 中新增 import**

在 `<script setup>` 中添加：

```js
import { updateState } from '../utils/updateState.js'
```

- [ ] **Step 2: 修改底部"检查更新"模板**

将现有的版本区域（第 15-18 行）：

```html
<div class="version">
  <p>{{ $t('about.version') }}:{{ appVersion }}</p>
  <p class="check-update" @click="handleCheckUpdate">{{ $t('update.checkUpdate') }}</p>
</div>
```

替换为：

```html
<div class="version">
  <p>{{ $t('about.version') }}:{{ appVersion }}</p>
  <p class="check-update" @click="handleCheckUpdate">
    {{ $t('update.checkUpdate') }}
    <span v-if="updateState.hasUpdate" class="update-dot"></span>
  </p>
</div>
```

- [ ] **Step 3: 在 style 中添加红点样式**

在 `<style scoped>` 末尾添加：

```css
.update-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: #FF4444; vertical-align: middle; margin-left: 4px;
}
```

- [ ] **Step 4: 提交**

```bash
git add src/pages/About.vue
git commit -m "feat: About 检查更新旁加红点角标"
```

---

## 验证清单

实现全部 6 个 Task 后，进行以下验证：

| # | 验证场景 | 预期行为 |
|---|---------|---------|
| 1 | 启动 App，已是最新版本 | 无弹窗，无红点，用户中心和关于页版本号显示正常 |
| 2 | 启动 App，有新版本（可选） | 红点亮起 + 弹窗，版本号显示正常 |
| 3 | 启动 App，有新版本（强制） | 红点亮起 + 强制弹窗不可关闭 |
| 4 | 点击"立即更新" | 弹窗关闭 → 底部进度条滑入，显示百分比 |
| 5 | 下载中切换页面 | 进度条持续显示不消失 |
| 6 | 下载完成 | 进度条滑出 → 自动触发安装 |
| 7 | 点"稍后再说" | 弹窗关闭，红点保持显示 |
| 8 | 手动点击"检查更新"，已是最新 | Toast "当前已是最新版本"，红点消失 |
| 9 | 手动点击"检查更新"，失败 | Toast 提示失败，红点状态不变 |
| 10 | 未登录启动 | 跳过检查，无红点 |
| 11 | 用户中心和关于页红点状态一致 | 两个页面红点同时出现/消失 |
| 12 | 快速双击"检查更新" | 不会重复触发检查 |
