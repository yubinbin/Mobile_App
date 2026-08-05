# 更新弹框卡片内容样式优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「发现新版本 / 版本已过期」两个更新弹框从纯文本升级为卡片式布局（顶部品牌蓝渐变横幅 + 版本徽章 + 按语言选取的更新日志列表 + 更新包大小 + 强制提示条）。

**Architecture:** 新建 `UpdateDialog.vue` 组件，用 `<van-dialog>` + 自定义 `#title` 与默认插槽渲染卡片内容；弹框显隐由 `updateState` 的两个新字段驱动；`App.vue` 根组件挂载该组件（与现有下载进度条同一模式）；`appUpdater.js` 的 `showUpdateDialog()` 改为「设状态」而非直接调用 Vant 弹框函数。

**Tech Stack:** Vue 3.5 `<script setup>`、Vant 4.9（`Dialog` 已在 `src/main.js` 全局注册）、自定义 i18n（locale 取值 `zh-CN` / `zh-HK` / `en-US`）、Capacitor 8。

## Global Constraints

- **项目无自动化测试框架**（package.json 无 test 脚本、无 vitest/jest）。每个任务的验证以 `npx vite build` 构建通过为准，最终以真机手动测试验收。
- Vant 组件**不要在页面内 import**，使用 main.js 已全局注册的组件（`Dialog` 已注册，直接写 `<van-dialog>`）。
- i18n locale 取值：`zh-CN` / `zh-HK` / `en-US`（繁体为 `zh-HK`），见 `src/i18n/index.js`。
- changelog 接口字段已拆分：`changelog_zh_cn` / `changelog_zh_tw` / `changelog_en`，兼容旧单字段 `changelog`。
- 命名规范：不用单字母变量（项目记忆约束），变量名至少两个字母、语义化。
- 弹框确认后走既有 `downloadAndInstall()`，**不得改动下载架构**（事件驱动 + downloadId 过滤 + epoch 取消）。
- 强制更新语义：不可通过遮罩/返回键退出；确认按钮是唯一出口。
- 渐变品牌色：`linear-gradient(135deg, #2c5aa0, #006dd8)`（与 App.vue 下载进度条一致）。

---

### Task 1: 状态字段 + i18n 文案 + 导出 formatBytes（基础）

**Files:**
- Modify: `src/utils/updateState.js`
- Modify: `src/i18n/zh-CN.json`
- Modify: `src/i18n/zh-TW.json`
- Modify: `src/i18n/en.json`
- Modify: `src/utils/appUpdater.js`

**Interfaces:**
- Consumes: 无
- Produces:
  - `updateState.updateDialogVisible: boolean`（默认 `false`）
  - `updateState.forceUpdate: boolean`（默认 `false`）
  - `formatBytes(bytes: number): string` —— 从 `appUpdater.js` 导出（Task 2 组件复用）
  - `t('update.packageSize')` 三语言文案

- [ ] **Step 1: updateState 增加两个字段**

在 `src/utils/updateState.js` 中新增：

```js
export const updateState = reactive({
  hasUpdate: false,
  updateInfo: null,
  downloadState: 'idle',
  downloadProgress: 0,
  downloadedSize: '',
  totalSize: '',
  updateDialogVisible: false,   // 更新弹框是否显示
  forceUpdate: false,           // 是否强制更新
})
```

- [ ] **Step 2: 三个 i18n 文件各加一条 `update.packageSize`**

在 `"update.changelog"` 行之后插入（每个文件保持同样的键结构）：

- `src/i18n/zh-CN.json`: `"update.packageSize": "更新包",`
- `src/i18n/zh-TW.json`: `"update.packageSize": "更新包",`
- `src/i18n/en.json`: `"update.packageSize": "Update Size",`

验证 JSON 合法（项目为 ESM，用 `--input-type=module`）：

```bash
node --input-type=module -e "import { readFileSync } from 'node:fs'; for (const f of ['src/i18n/zh-CN.json','src/i18n/zh-TW.json','src/i18n/en.json']) { const j = JSON.parse(readFileSync(f, 'utf8')); if (!j['update.packageSize']) process.exit(1) } console.log('ok')"
```
Expected: 输出 `ok`。

- [ ] **Step 3: 导出 `formatBytes`**

在 `src/utils/appUpdater.js` 中把 `function formatBytes(bytes) {` 改为 `export function formatBytes(bytes) {`（仅加 `export` 关键字，函数体不变）。

- [ ] **Step 4: 构建验证**

```bash
npx vite build
```
Expected: 构建成功（`dist/` 重新生成），无报错。

- [ ] **Step 5: Commit**

```bash
git add src/utils/updateState.js src/i18n/zh-CN.json src/i18n/zh-TW.json src/i18n/en.json src/utils/appUpdater.js
git commit -m "feat: update 弹框状态字段 + packageSize 文案 + 导出 formatBytes"
```

---

### Task 2: 新建 `src/components/UpdateDialog.vue` 组件

**Files:**
- Create: `src/components/UpdateDialog.vue`

**Interfaces:**
- Consumes:
  - `updateState.updateDialogVisible` / `updateState.forceUpdate` / `updateState.updateInfo`（Task 1）
  - `t` / `getLocale`（`../i18n`）
  - `formatBytes` / `downloadAndInstall`（`../utils/appUpdater.js`）
  - `appVersion`（`../utils/urlValues.js`）
- Produces: 默认导出组件 `UpdateDialog.vue`（无 props，完全自包含；显隐由 `updateState.updateDialogVisible` 驱动）

- [ ] **Step 1: 创建组件**

创建 `src/components/UpdateDialog.vue`（完整内容）：

```vue
<template>
  <van-dialog
    v-model:show="visible"
    class="update-dialog"
    :close-on-click-overlay="!forceUpdate"
    :close-on-popstate="false"
    :show-cancel-button="!forceUpdate"
    :confirm-button-text="t('update.updateNow')"
    :cancel-button-text="t('update.later')"
    @confirm="onConfirm"
    @cancel="onClose"
  >
    <template #title>
      <div class="update-banner">
        <p class="update-banner-title">{{ title }}</p>
        <span class="update-banner-version">v{{ version }}</span>
      </div>
    </template>
    <div class="update-content">
      <p class="update-current">{{ t('update.currentVersion') }} v{{ currentVersion }}</p>
      <div v-if="changelogLines.length" class="update-changelog">
        <p class="update-changelog-label">{{ t('update.changelog') }}</p>
        <ul class="update-changelog-list">
          <li v-for="(line, index) in changelogLines" :key="index">{{ line }}</li>
        </ul>
      </div>
      <p v-if="sizeText" class="update-size">{{ t('update.packageSize') }} {{ sizeText }}</p>
      <p v-if="forceUpdate" class="update-force">{{ t('update.forceMsg') }}</p>
    </div>
  </van-dialog>
</template>

<script setup>
import { computed, watch } from 'vue'
import { t, getLocale } from '../i18n'
import { updateState } from '../utils/updateState.js'
import { downloadAndInstall, formatBytes } from '../utils/appUpdater.js'
import { appVersion } from '../utils/urlValues.js'

const CHANGELOG_FIELD_MAP = {
  'zh-CN': 'changelog_zh_cn',
  'zh-HK': 'changelog_zh_tw',
  'en-US': 'changelog_en',
}

/** 按当前语言取 changelog 字段；为空时回退 简体 → 英文 → 繁体 → 旧单字段 */
function pickChangelog(info, locale) {
  const preferred = CHANGELOG_FIELD_MAP[locale]
  const candidates = [preferred, 'changelog_zh_cn', 'changelog_en', 'changelog_zh_tw', 'changelog']
  for (const key of candidates) {
    if (info && info[key]) return info[key]
  }
  return ''
}

const visible = computed({
  get: () => updateState.updateDialogVisible,
  set: (value) => {
    updateState.updateDialogVisible = value
  },
})

const forceUpdate = computed(() => updateState.forceUpdate)
const info = computed(() => updateState.updateInfo)

const title = computed(() => (forceUpdate.value ? t('update.forceTitle') : t('update.newVersion')))
const version = computed(() => info.value?.version || '')
const currentVersion = computed(() => appVersion || '0.0.0')
const changelogLines = computed(() =>
  pickChangelog(info.value, getLocale())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
)
const sizeText = computed(() => {
  if (info.value?.fileSize == null) return ''
  return formatBytes(info.value.fileSize)
})

// 确认：关闭弹框并触发下载（复用既有 downloadAndInstall，不改下载架构）
let confirmedClose = false
function onConfirm() {
  confirmedClose = true
  updateState.updateDialogVisible = false
  if (info.value?.updateUrl) {
    downloadAndInstall(info.value.updateUrl)
  }
}

function onClose() {
  confirmedClose = false
  updateState.updateDialogVisible = false
}

// 强制更新防退出：被非确认方式关闭（如系统返回键）时 200ms 后重新弹出
watch(
  () => updateState.updateDialogVisible,
  (nowVisible) => {
    if (nowVisible) return
    if (confirmedClose) return
    if (!forceUpdate.value) return
    setTimeout(() => {
      updateState.updateDialogVisible = true
    }, 200)
  }
)
</script>

<style scoped>
.update-dialog :deep(.van-dialog) {
  overflow: hidden;
}
.update-dialog :deep(.van-dialog__header) {
  padding: 0;
  margin: 0;
}
.update-banner {
  background: linear-gradient(135deg, #2c5aa0, #006dd8);
  color: #fff;
  padding: 18px 16px 14px;
  text-align: center;
}
.update-banner-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}
.update-banner-version {
  display: inline-block;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 2px 12px;
  font-size: 13px;
  font-weight: 600;
}
.update-content {
  padding: 14px 16px 4px;
  text-align: left;
}
.update-current {
  margin: 0 0 10px;
  font-size: 12px;
  color: #8a9099;
}
.update-changelog-label {
  margin: 0 0 4px;
  padding-top: 10px;
  border-top: 1px solid #f0f1f3;
  font-size: 12px;
  color: #9aa0a8;
}
.update-changelog-list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 120px;
  overflow-y: auto;
}
.update-changelog-list li {
  position: relative;
  padding-left: 14px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #3f4650;
  line-height: 1.5;
}
.update-changelog-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #2c5aa0;
}
.update-size {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9aa0a8;
}
.update-force {
  margin: 10px 0 0;
  background: #fef2f2;
  color: #d92d20;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.5;
}
</style>
```

- [ ] **Step 2: 构建验证**

```bash
npx vite build
```
Expected: 构建成功。此时弹框尚未接线（appUpdater 仍走旧弹框），组件自身编译无误即可。

- [ ] **Step 3: Commit**

```bash
git add src/components/UpdateDialog.vue
git commit -m "feat: 新增 UpdateDialog 卡片式更新弹框组件"
```

---

### Task 3: 接线 —— appUpdater.js 改状态 + App.vue 挂载组件

**Files:**
- Modify: `src/utils/appUpdater.js`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes:
  - `UpdateDialog.vue`（Task 2）
  - `updateState.updateDialogVisible` / `forceUpdate` / `updateInfo`（Task 1）
- Produces: `showUpdateDialog(info)` 不再直接调 Vant 弹框，改为写状态；`App.vue` 挂载 `<UpdateDialog />`，实现端到端。

- [ ] **Step 1: 重写 `showUpdateDialog` 为状态驱动**

把 `src/utils/appUpdater.js` 中的 `showUpdateDialog` 整个函数体（当前是拼接 `msgLines` + 调 `showDialog`/`showConfirmDialog`）替换为：

```js
/** 弹出更新弹窗（可选 / 强制）——由 UpdateDialog.vue 组件渲染卡片内容 */
function showUpdateDialog(info) {
  updateState.updateInfo = info
  updateState.forceUpdate = !!info.forceUpdate
  updateState.updateDialogVisible = true
}
```

- [ ] **Step 2: 删除不再使用的代码与 import**

在 `src/utils/appUpdater.js`：
- 删除 `getCurrentVersion()` 函数（`showUpdateDialog` 是它唯一的调用方，已删除）
- 修改 import：`import { showConfirmDialog, showDialog, showToast } from 'vant'` → `import { showToast } from 'vant'`
- 保留 `t`、`updateState` 等 import（`t` 仍在 `checkManually` 使用）

- [ ] **Step 3: App.vue 挂载 `<UpdateDialog />`**

- 在 `src/App.vue` 的 `<script setup>` 顶部增加 import：

```js
import UpdateDialog from './components/UpdateDialog.vue'
```

- 在模板的 `</transition>`（下载进度条）之后、`</template>` 之前增加：

```html
<UpdateDialog />
```

- [ ] **Step 4: 构建验证**

```bash
npx vite build
```
Expected: 构建成功，无未使用变量/引用错误。

- [ ] **Step 5: Commit**

```bash
git add src/utils/appUpdater.js src/App.vue
git commit -m "feat: 更新弹框改由状态驱动并挂载 UpdateDialog"
```

---

### Task 4: 端到端真机验证

**Files:** 无代码改动，仅验证。

- [ ] **Step 1: 生成测试变体并在 Android Studio 跑真机**

```bash
pnpm dev:hongsuyun-test
```
或构建测试变体到设备：

```bash
pnpm android:hongsuyun-test
```

- [ ] **Step 2: 手动验证清单**（测试环境需存在比当前版本新的包，且接口返回 `changelog_zh_cn` / `changelog_zh_tw` / `changelog_en`）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 用户中心 → 检查更新（有可选更新） | 品牌蓝渐变横幅 + 「发现新版本」+ 白色版本徽章 + 当前版本灰字 + 「更新内容」圆点列表 + 「更新包 xx MB」+ 底部「稍后再说 / 立即更新」 |
| 2 | 点「立即更新」 | 弹框关闭 → 底部下载进度条出现（原有逻辑） |
| 3 | 再次触发，点「稍后再说」 | 弹框关闭，红点保持 |
| 4 | 日志超长 | 列表内部滚动（max-height 120px），弹框不被撑爆 |
| 5 | 接口无 `fileSize` / changelog 全空 | 对应区域隐藏 |
| 6 | 切换 App 语言为繁体 / 英文后触发弹框 | 标题、按钮、「更新包」文案与「更新内容」正文均随语言切换（正文取 `changelog_zh_tw` / `changelog_en`） |
| 7 | 强制更新（版本已过期） | 品牌蓝横幅 + 「版本已过期」+ 仅「立即更新」+ 红色提示条；点遮罩不关闭；点返回键不退出（200ms 后重新弹出） |

- [ ] **Step 3: 回归**（确认没破坏现有逻辑）
- 启动静默检查：无新版本时不弹框、不报错
- 下载中再次点「检查更新」→ Toast「正在下载」拦截依旧
- 下载失败 → 进度条「重试」依旧

- [ ] **Step 4: 无代码改动时确认收尾**

若验证发现样式/逻辑问题，回到对应 Task 修复并重新构建、提交；全部通过后结束。
