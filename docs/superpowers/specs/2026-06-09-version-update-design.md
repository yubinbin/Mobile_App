# 版本更新功能 — 设计文档

**日期**: 2026-06-09  
**状态**: 设计中  
**App**: 弘设汇 (HongSheHui)

---

## 1. 概述

为 App 添加版本更新检测与提示功能。用户启动 App 时自动检测是否有新版本，也可在用户中心和关于页手动触发检查。支持可选更新和强制更新两种模式，由后端 API 控制。

## 2. 需求

| 决策项 | 方案 |
|--------|------|
| 检测机制 | 后端统一 API (`GET /api/app/version`) |
| 更新策略 | 可选更新 + 强制更新（后端 `forceUpdate` 字段控制） |
| 更新行为 | 打开系统浏览器跳转 URL（覆盖商店链接和网页下载两种渠道） |
| 检查时机 | App 启动时自动检查 + 用户手动点击"检查更新" |
| 弹窗风格 | Vant Dialog 原生风格 |

## 3. 架构

```
src/
├── utils/
│   └── appUpdater.js       ← 新增：版本检查 + 弹窗逻辑
├── pages/
│   ├── UserInfo.vue         ← 修改：添加"检查更新"菜单项
│   └── About.vue            ← 修改：添加"检查更新"按钮
├── i18n/
│   ├── zh-CN.json           ← 修改：新增更新相关文案
│   ├── zh-TW.json
│   └── en.json
└── App.vue                  ← 修改：onMounted 中触发启动检查
```

### 调用流程

```
App.vue onMounted
  → appUpdater.checkOnLaunch()
    → GET /api/app/version
      → 无新版本 → 结束
      → 有新版本(可选) → showUpdateDialog
      → 有新版本(强制) → showUpdateDialog(不可关闭)

UserInfo / About 手动点击
  → appUpdater.checkManually()
    → 显示 Loading
    → GET /api/app/version
      → 已是最新 → Toast "当前已是最新版本"
      → 有新版本 → showUpdateDialog
```

## 4. API 约定

```
GET /api/app/version
Authorization: Bearer <token>

Response 200:
{
  "version": "2.0.0",        // 最新版本号（必填）
  "forceUpdate": false,       // 是否强制更新（必填）
  "updateUrl": "https://...", // 下载/商店链接（必填）
  "changelog": "...",        // 更新日志（可选，换行可用 \n）
  "minVersion": "1.0.0"      // 最低支持版本（可选，预留）
}
```

## 5. 模块设计 — `src/utils/appUpdater.js`

### 导出函数

| 函数 | 说明 |
|------|------|
| `checkOnLaunch()` | 启动时静默检查，网络失败不提示 |
| `checkManually()` | 手动检查，网络失败 Toast 提示 |

### 内部函数

| 函数 | 说明 |
|------|------|
| `compareVersion(a, b)` | 去掉 `v` 前缀，按 `.` 分段后逐段比较数字 |
| `getCurrentVersion()` | 从 `i18n` 读取当前版本号 |
| `fetchVersionInfo()` | 调用 `GET /api/app/version`，5 秒超时 |
| `showUpdateDialog(info)` | 根据 `info.forceUpdate` 展示可选/强制弹窗 |

### 状态管理

```js
let checking = false  // 防并发，请求进行中时新调用直接跳过
```

### 版本比较逻辑

```js
function compareVersion(a, b) {
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
```

### 弹窗实现

使用 Vant 的 `Dialog` 组件（项目已在 `main.js` 中注册）：

**可选更新弹窗：**
```js
Dialog.confirm({
  title: t('update.newVersion'),
  message: formatMessage(info),
  confirmButtonText: t('update.updateNow'),
  cancelButtonText: t('update.later'),
}).then(() => {
  if (result === 'confirm') {
    window.open(info.updateUrl, '_system')
  }
})
```

**强制更新弹窗：**
```js
Dialog.alert({
  title: t('update.forceTitle'),
  message: formatMessage(info),
  confirmButtonText: t('update.updateNow'),
  allowClose: false,       // 不可通过点击遮罩关闭
  closeOnPopstate: false,  // 不可通过返回键关闭（Vant Dialog 内部需配合处理）
}).then(() => {
  window.open(info.updateUrl, '_system')
})
```

**强制更新无法绕过：** 需在 Dialog 关闭回调中判断：如果 `forceUpdate` 为 true 且用户未执行更新，重新弹出弹窗。因为 Vant Dialog 的 `allowClose: false` 仅阻止点击遮罩关闭，Android 系统返回键仍可能关闭弹窗，需额外处理。

## 6. 错误处理

| 场景 | 行为 |
|------|------|
| 网络请求失败（启动检查） | 静默忽略，不影响用户使用 |
| 网络请求失败（手动检查） | Toast "检查更新失败，请稍后重试" |
| 接口返回格式异常 | 启动：静默忽略；手动：Toast 提示 |
| 接口超时（5 秒） | 同上 |
| 强制更新弹窗被返回键关闭 | 监听到关闭后立即重新弹出 |
| 未登录状态 | 跳过检查，仅在已登录时执行 |
| 多次快速点击"检查更新" | `checking` 标志位防抖，跳过重复请求 |

## 7. 国际化文案

| Key | zh-CN | zh-TW | en |
|-----|-------|-------|-----|
| `update.newVersion` | 发现新版本 | 發現新版本 | New Version Available |
| `update.forceTitle` | 版本已过期 | 版本已過期 | Version Expired |
| `update.forceMsg` | 当前版本已停止服务，请立即更新 | 當前版本已停止服務，請立即更新 | This version is no longer supported. Please update now. |
| `update.currentVersion` | 当前版本 | 當前版本 | Current Version |
| `update.changelog` | 更新内容 | 更新內容 | What's New |
| `update.updateNow` | 立即更新 | 立即更新 | Update Now |
| `update.later` | 稍后再说 | 稍後再說 | Later |
| `update.checking` | 正在检查更新... | 正在檢查更新... | Checking for updates... |
| `update.alreadyLatest` | 当前已是最新版本 | 當前已是最新版本 | You're up to date |
| `update.checkFailed` | 检查更新失败，请稍后重试 | 檢查更新失敗，請稍後重試 | Update check failed, please try again |
| `update.checkUpdate` | 检查更新 | 檢查更新 | Check for Updates |

## 8. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/utils/appUpdater.js` | **新增** | 核心更新检查模块 |
| `src/App.vue` | 修改 | `onMounted` 中调用 `checkOnLaunch()` |
| `src/pages/UserInfo.vue` | 修改 | 添加"检查更新" Cell 菜单项 |
| `src/pages/About.vue` | 修改 | 添加"检查更新"按钮 |
| `src/i18n/zh-CN.json` | 修改 | 新增 11 条更新相关文案 |
| `src/i18n/zh-TW.json` | 修改 | 对应繁体文案 |
| `src/i18n/en.json` | 修改 | 对应英文文案 |

## 9. 测试要点

| 测试场景 | 预期行为 |
|---------|---------|
| 启动时已是最新版本 | 无弹窗，无 Toast |
| 启动时有新版本（可选） | 弹出可选更新弹窗，可关闭 |
| 启动时有新版本（强制） | 弹出强制更新弹窗，无法关闭 |
| 手动检查，已是最新 | Toast "当前已是最新版本" |
| 手动检查，有新版本 | 弹出对应弹窗 |
| 网络异常，启动检查 | 静默忽略 |
| 网络异常，手动检查 | Toast 提示失败 |
| 快速双击"检查更新" | 不会重复请求 |
| 强制更新弹窗被返回键关闭 | 重新弹出 |
| 点击"立即更新" | 打开系统浏览器跳转 URL |
| 未登录状态 | 跳过版本检查 |
