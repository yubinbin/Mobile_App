# 版本更新功能细化 — 设计文档

**日期**: 2026-06-30  
**状态**: 设计中  
**App**: 弘塑云 (HongSuYun)

---

## 1. 概述

对现有版本更新功能进行三个方向的细化：

| 方向 | 目标 |
|------|------|
| 更新提示 | 有新版本时在"检查更新"入口显示红点角标 |
| 版本展示 | "检查更新"按钮上用灰色小字标注当前版本号 |
| 下载流程 | 进度条 + 文件大小 + 后台下载，不阻塞用户操作 |

## 2. 架构

### 新增文件

```
src/utils/updateState.js    ← 响应式更新状态模块
```

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/utils/appUpdater.js` | 写入 updateState + 下载非阻塞化 |
| `src/App.vue` | 全局浮动下载进度条 |
| `src/pages/UserInfo.vue` | 版本号 + 红点角标 |
| `src/pages/About.vue` | 版本号 + 红点角标 |

### 数据流

```
启动/手动检查
  → appUpdater 调用接口
    → 无新版本 → updateState.hasUpdate = false
    → 有新版本 → updateState.hasUpdate = true（红点出现）
              → 弹出更新弹窗
                → 点击"立即更新" → downloadState = 'downloading'
                → App.vue 浮动进度条出现
                → 下载完成 → 自动安装
                → 点击"稍后再说" → 弹窗关闭，红点保持
```

## 3. 模块设计 — `src/utils/updateState.js`

```js
import { reactive } from 'vue'

export const updateState = reactive({
  hasUpdate: false,        // 是否有新版本（控制红点角标）
  updateInfo: null,        // 新版本信息 { version, changelog, updateUrl, forceUpdate }
  downloadState: 'idle',   // 'idle' | 'downloading' | 'completed' | 'failed'
  downloadProgress: 0,     // 0-100
  downloadedSize: '',      // 已下载大小（格式化，如 "12MB"）
  totalSize: '',           // 总大小（格式化，如 "45MB"）
})
```

状态重置：每次 `checkOnLaunch` 或 `checkManually` 开始时重置 `hasUpdate = false`，下载完成/失败后 `downloadState` 在下次检查时重置为 `'idle'`。

## 4. 模块修改 — `src/utils/appUpdater.js`

### 需要修改的点

1. **写入 updateState**：检查到新版本时设置 `updateState.hasUpdate = true` + `updateState.updateInfo = info`
2. **下载非阻塞化**：`downloadAndInstall` 不再用 Toast 展示进度，改为写入 `updateState`（`downloadState`、`downloadProgress`、`downloadedSize`、`totalSize`）
3. **接口返回增加 `fileSize` 字段**（可选）— 后端可返回文件大小供展示

### 下载进度回调

```js
// ApkInstaller 插件的 progress 事件写入 updateState
plugin.addListener('progress', ({ percent }) => {
  updateState.downloadProgress = percent
  // 文件大小：接口可返回 fileSize 字段，或由插件提供
})
```

### 重试下载

下载失败时 `updateState.downloadState = 'failed'`，用户在进度条上点击"重试"重新调用 `downloadAndInstall(info.updateUrl)`。

## 5. UI 设计

### 5.1 用户中心页（UserInfo.vue）

"检查更新" Cell 改造：

```
┌──────────────────────────────────────────────┐
│  [图标]  检查更新                  v1.0.0 ● │
└──────────────────────────────────────────────┘
```

**版本号**：灰色小字（12px, #999），放在 Cell 的 value 区  
**红点**：8px 实心圆（#FF4444），`updateState.hasUpdate` 为 true 时显示在版本号右侧

实现方式：利用 `van-cell` 的 `#default`（或 label 插槽）放置版本号，`#right-icon` 放置红点。

### 5.2 关于页（About.vue）

底部版本区域改为：

```
        版本号：v1.0.0
      检查更新    ●
```

- 版本号保持现有位置
- "检查更新"文字旁加红点（8px, #FF4444），`hasUpdate` 控制显隐

### 5.3 下载进度条（App.vue 全局浮动）

下载时在屏幕底部出现浮动进度卡片，覆盖在所有页面上方：

```
┌──────────────────────────────────────┐
│  🔽 正在下载新版本                    │
│  ████████████████░░░░░░░░░  68%       │
│  15.2 MB / 22.3 MB                    │
│                          [取消] [重试] │
└──────────────────────────────────────┘
```

- **位置**：`position: fixed; bottom: 0; left: 0; right: 0;`
- **背景**：白色圆角卡片，带顶部阴影
- **进度条**：Vant Progress 组件或纯 CSS div
- **按钮**：`downloadState === 'downloading'` 时显示"取消"；`downloadState === 'failed'` 时显示"重试"
- **动画**：`transition` 滑入/滑出
- **显隐**：`downloadState === 'downloading'` 或 `'failed'` 时显示，`'idle'` / `'completed'` 时隐藏

### 5.4 交互流程

```
有新版本
  → 弹出更新弹窗（可选/强制，现有逻辑不变）
  → 红点出现（updateState.hasUpdate = true）
  → 点"立即更新" → 弹窗关闭 → 底部进度条滑入
  → 点"稍后再说" → 弹窗关闭 → 红点保持
  → 手动再次点击"检查更新" → 重新弹窗
  → 下载完成 → 进度条滑出 → 自动安装
  → 下载失败 → 进度条显示"重试"
```

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| 接口请求失败（启动检查） | 静默忽略，`hasUpdate` 保持 false |
| 接口请求失败（手动检查） | Toast "检查更新失败，请稍后重试" |
| 接口超时（5 秒） | 同上 |
| 下载中网络断开 | 进度条显示"下载失败" + "重试"按钮 |
| 存储空间不足 | 进度条显示"存储空间不足" |
| 重复点击"检查更新" | `checking` 防抖跳过 |
| 下载中再次点击"立即更新" | `downloadState === 'downloading'` 时忽略 |
| 强制更新弹窗被返回键关闭 | 重新弹出（现有逻辑保持） |
| 未登录状态 | 跳过检查，无红点 |
| 下载中用户切换页面 | 进度条浮动不随路由消失 |

## 7. 国际化文案

| Key | zh-CN | zh-TW | en |
|-----|-------|-------|-----|
| `update.downloadingTitle` | 正在下载新版本 | 正在下載新版本 | Downloading Update |
| `update.downloadFailedMsg` | 下载失败，请重试 | 下載失敗，請重試 | Download failed, tap to retry |
| `update.cancel` | 取消 | 取消 | Cancel |

## 8. 测试要点

| 场景 | 预期 |
|------|------|
| 已是最新版本 | 无弹窗、无红点、版本号正常显示 |
| 有新版本（可选） | 红点亮起 + 弹窗 |
| 有新版本（强制） | 红点亮起 + 强制弹窗（不可关闭） |
| 点击"立即更新" | 弹窗关闭 → 底部进度条显示百分比 + 文件大小 |
| 下载中切换页面 | 进度条持续显示，不随路由消失 |
| 下载完成 | 进度条滑出 → 自动安装 |
| 下载失败 | 进度条显示失败 + 重试按钮 |
| 点"稍后再说" | 弹窗关闭，红点保持 |
| 手动检查 - 已是最新 | Toast "当前已是最新版本"，红点隐藏 |
| 未登录 | 跳过检查 |
| 用户中心和关于页红点同步 | 两个页面的红点状态一致 |

## 9. 与现有实现的兼容

- 不改变现有 API 接口约定
- 不改变 `compareVersion` / `fetchVersionInfo` 等核心函数签名
- 原有 `checkOnLaunch` / `checkManually` 对外接口不变
- `urlValues.js` 中的 `appVersion` 继续作为当前版本号来源
