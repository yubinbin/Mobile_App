# 更新弹框卡片内容样式优化 — 设计文档

**日期**: 2026-08-05  
**状态**: 设计中  
**App**: 弘塑云 (HongSuYun) / 弘设汇 (HongSheHui)

---

## 1. 概述

优化「发现新版本」与「版本已过期」两个更新弹框的内容样式：从纯文本升级为**卡片式布局**（顶部渐变横幅 + 版本徽章 + 更新日志列表 + 包大小），视觉方案经用户确认为 **C · 顶部横幅式**，强制更新与可选更新使用**同一套品牌蓝**视觉（仅标题与按钮区分）。

| 弹框 | 触发 | 现状 |
|------|------|------|
| 发现新版本 | 可选更新 | Vant `showConfirmDialog` 纯文本 |
| 版本已过期 | 强制更新 | Vant `showDialog` 纯文本，不可关闭 |

## 2. 视觉设计

```
┌──────────────────────────────┐
│ ███ 品牌蓝渐变横幅 ███       │
│    发现新版本 / 版本已过期     │  ← 白色标题
│      v2.1.0 （白底徽章）      │  ← 半透明白胶囊
├──────────────────────────────┤
│ 当前版本 v1.8.0（灰色小字）    │
│ ── 更新内容 ──               │
│ · 新增项目数据分析模块          │  ← 每条日志一行，超出 ~120px 内部滚动
│ · 优化扫码识别速度             │
│ · 修复若干已知问题             │
│ 更新包 45.2 MB（灰色小字）     │  ← 有 fileSize 才显示
│ [红底提示条] 强制时显示         │  ← 仅强制更新：当前版本已停止服务
├──────────────────────────────┤
│ 稍后再说 │ 立即更新（可选）     │  ← Vant 底部按钮；强制模式只剩「立即更新」
└──────────────────────────────┘
```

- **横幅渐变**: `linear-gradient(135deg, #2c5aa0, #006dd8)`（与下载进度条渐变一致）
- **版本徽章**: 半透明白胶囊（`rgba(255,255,255,0.22)` 背景、白色文字、圆角胶囊）
- **更新日志**: 圆点列表，`max-height: ~120px` + `overflow-y: auto`
- **强制提示条**: 红底浅红 `#fef2f2` / 文字 `#d92d20`，圆角小卡
- **按钮**: 复用 Vant Dialog 底部按钮（`confirm` / `cancel`）

## 3. 架构

### 新增文件

```
src/components/UpdateDialog.vue   ← 组件式更新弹框（van-dialog + 自定义插槽）
```

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/utils/updateState.js` | 增加 `updateDialogVisible`、`forceUpdate` 字段 |
| `src/App.vue` | 挂载 `<UpdateDialog />` |
| `src/utils/appUpdater.js` | `showUpdateDialog()` 改为设状态打开弹框；导出 `formatBytes` |
| `src/i18n/zh-CN.json` | 新增 `update.packageSize` |
| `src/i18n/zh-TW.json` | 新增 `update.packageSize` |
| `src/i18n/en.json` | 新增 `update.packageSize` |

### 数据流

```
checkManually / checkOnLaunch 检查到新版本
  → showUpdateDialog(info) 设置 updateState.updateInfo / forceUpdate / updateDialogVisible = true
    → <UpdateDialog/> 组件显示卡片弹框
      → 确认（立即更新）→ downloadAndInstall(updateUrl) + 关闭
      → 取消（稍后再说）→ 关闭（仅可选模式）
      → 强制模式被系统关闭 → 200ms 后重新弹出
```

## 4. 组件设计 — `src/components/UpdateDialog.vue`

`<van-dialog v-model:show="visible">`，横幅放入 `#title` 插槽，日志/包大小/强制提示放入默认插槽，底部按钮用 Vant 内置的 confirm/cancel。

```html
<van-dialog
  v-model:show="visible"
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
        <li v-for="line in changelogLines" :key="line">{{ line }}</li>
      </ul>
    </div>
    <p v-if="sizeText" class="update-size">{{ t('update.packageSize') }} {{ sizeText }}</p>
    <p v-if="forceUpdate" class="update-force">{{ t('update.forceMsg') }}</p>
  </div>
</van-dialog>
```

**计算字段**（从 `updateState.updateInfo` 派生）：
- `version` / `currentVersion`: 新版本号、`urlValues.appVersion`
- `changelogLines`: `info.changelog` 按 `\n` 拆行 → `trim` → 过滤空行；无有效行则隐藏整个「更新内容」区
- `sizeText`: `info.fileSize` 经 `formatBytes()` 格式化；无 `fileSize` 则隐藏

**状态来源**: `updateState.updateDialogVisible`（v-model）、`updateState.forceUpdate`。

**确认**: `downloadAndInstall(updateState.updateInfo.updateUrl)` + 关闭弹框；下载逻辑不变（事件驱动 + downloadId 过滤，见 CLAUDE.md §4）。

**强制模式防退出**: `close-on-click-overlay=false`、`close-on-popstate=false`；若仍被系统关闭（如系统返回键），监听关闭后若 `forceUpdate` 仍为真且更新未完成，200ms 后重新置 `visible=true`，保持「不可退出」语义（与现行为一致）。

## 5. 模块修改 — `src/utils/appUpdater.js`

- `showUpdateDialog(info)` 删除对 Vant `showDialog` / `showConfirmDialog` 的调用，改为：
  ```js
  updateState.updateInfo = info
  updateState.forceUpdate = !!info.forceUpdate
  updateState.updateDialogVisible = true
  ```
- 删除原有的 `msgLines` 拼接、`forceShow()` 递归等纯文本逻辑
- 移除不再使用的 `showDialog` / `showConfirmDialog` import（`showToast` 仍保留）
- `formatBytes` 改为 `export`，供 `UpdateDialog.vue` 复用

## 6. 国际化文案

| Key | zh-CN | zh-TW | en |
|-----|-------|-------|-----|
| `update.packageSize` | 更新包 | 更新包 | Update Size |

其余文案（`newVersion` / `forceTitle` / `currentVersion` / `changelog` / `forceMsg` / `updateNow` / `later`）已存在，复用不改。

## 7. 错误处理与边界

| 场景 | 处理 |
|------|------|
| `changelog` 为空 / 全为空白行 | 隐藏「更新内容」区 |
| `fileSize` 缺失或非法 | 隐藏「更新包」行 |
| 日志很多（超出高度） | 列表内部滚动，弹框高度可控 |
| 强制更新被系统返回键关闭 | 200ms 后重新弹出（沿用现有语义） |
| 更新中再次触发弹框 | `checkManually` 的 `downloading` 拦截已存在，不变 |

## 8. 测试要点

| 场景 | 预期 |
|------|------|
| 可选更新 | 品牌蓝横幅 + 「发现新版本」+ 双按钮 |
| 强制更新 | 品牌蓝横幅 + 「版本已过期」+ 仅「立即更新」+ 红色提示条 + 点遮罩不关 |
| 日志多行 | 逐条圆点展示，超出滚动 |
| 有 fileSize | 显示「更新包 45.2 MB」 |
| 无 changelog / 无 fileSize | 对应区域隐藏 |
| 点「立即更新」 | 弹框关闭 → 底部下载进度条出现（原有逻辑） |
| 点「稍后再说」 | 弹框关闭，红点保持 |
| 三语言 | 标题、按钮、更新包文案均随语言切换 |
| 强制更新被返回键关闭 | 200ms 后重新弹出 |

## 9. 与现有实现的兼容

- 不改变 `compareVersion` / `fetchVersionInfo` / `checkOnLaunch` / `checkManually` 对外签名
- 不改变下载架构（事件驱动 + downloadId 过滤 + epoch 取消）
- `updateState` 新增字段不影响既有 `downloadState` 等逻辑
- 下载进度条（App.vue）不受影响
