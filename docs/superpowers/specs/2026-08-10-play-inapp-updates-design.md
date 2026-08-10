# 移除 REQUEST_INSTALL_PACKAGES 并集成 Google Play 应用内更新（In-app Updates）

日期：2026-08-10
分支：v1.2.0

## 背景与目标

当前 Android 版本升级通过「后端接口比较版本 → 应用内 DownloadManager 下载 APK → FileProvider 拉起系统安装器」实现，依赖 `REQUEST_INSTALL_PACKAGES` 权限。该机制不适合上架 Google Play 的变体（Play 禁止 APK 侧载更新，且权限声明与商店规范冲突）。

目标：
1. **移除 `REQUEST_INSTALL_PACKAGES` 权限**，一并移除 APK 侧载链路（ApkInstallerPlugin、FileProvider、前端下载进度 UI）。
2. **Play 变体**（仅 `hongsuyun-prod`，`com.tmiot.tmplascloud`）改用 **Google Play In-app Updates API** 完成升级（IMMEDIATE / FLEXIBLE）。
3. **非 Play 变体**（国内版 / 测试版）点「立即更新」改为系统浏览器打开后端 `updateUrl`，不再应用内装 APK。

## 已确认决策

| 决策点 | 结论 |
|--------|------|
| 哪些变体在 Google Play | 仅 `hongsuyun-prod`（国际版） |
| 非 Play 变体如何处理 | 移除权限且全部走系统浏览器打开 `updateUrl` |
| forceUpdate 映射 | `true → IMMEDIATE`（全屏强制）；`false → FLEXIBLE`（后台下载 + 提示安装） |
| Play 变体「是否有新版本」信号 | 以 In-app Updates API 为准；后端仅在有记录时补充 changelog / force |
| 原生集成方式 | 自写 Capacitor 插件 `PlayUpdatePlugin`（Java，参照 ApkInstallerPlugin 模式） |

## 渠道配置（variants.mjs + urlValues）

每个变体新增 `updateChannel: 'play' | 'store'` 字段：

| 变体 | updateChannel |
|------|---------------|
| `hongsuyun-prod` | `play` |
| `hongsuyun-cn` | `store` |
| `hongsuyun-test` | `store` |
| `hongshehui-prod` | `store` |
| `hongshehui-test` | `store` |

`src/utils/urlValues.template.js` 新增 `export const updateChannel = '{{updateChannel}}'`。`scripts/build-variant.mjs` 的 `render()` 已支持任意 `{{key}}` 替换，无需改构建脚本。5 个变体都必须配置该字段，避免渲染后残留 `{{updateChannel}}`。

## 移除 APK 侧载机制

### 原生
- `android/app/src/main/AndroidManifest.xml`
  - 删除 `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />`
  - 删除 `<provider ... android:name="androidx.core.content.FileProvider" ...>` 块（已确认仅 ApkInstaller 使用；`grep` 无其他消费方）
- 删除 `android/app/src/main/java/cn/com/tmiot/ApkInstallerPlugin.java`
- 删除 `android/app/src/main/res/xml/file_paths.xml`
- `android/app/src/main/java/cn/com/tmiot/MainActivity.java`
  - 去掉 `registerPlugin(ApkInstallerPlugin.class)`
  - 增加 `registerPlugin(PlayUpdatePlugin.class)`

### 前端
- `src/utils/appUpdater.js`：删除 `downloadAndInstall`、`cancelCurrentDownload`、`downloading` 标志、`progress`/`downloadComplete` 事件监听、`currentDownloadId/currentDownloadCleanup`
- `src/utils/updateState.js`：删除 `downloadState`、`downloadProgress`、`downloadedSize`、`totalSize`
- `src/App.vue`：删除 `download-bar` 进度条 UI（模板 + 样式）与 `cancelDownload()`/`retryDownload()` 函数及对应 import
- `src/components/UpdateDialog.vue`：确认动作改为渠道分发（见 §前端流程）

## 原生插件 `PlayUpdatePlugin`

- 路径：`android/app/src/main/java/cn/com/tmiot/PlayUpdatePlugin.java`
- 依赖：`android/app/templates/build.gradle.template` 增加 `implementation "com.google.android.play:app-update:<version>"`（版本实现时确认最新稳定版，目标 2.1.0+）

### 方法

| 方法 | 行为 |
|------|------|
| `getUpdateInfo()` | `AppUpdateManagerFactory.create(ctx).getAppUpdateInfo()` → Promise `{ updateAvailable, isImmediateAllowed, isFlexibleAllowed, availableVersionCode, updatePriority, packageName }`。Play 不可用（无 Play 服务 / 非商店安装）→ reject |
| `startUpdate({ type, force })` | 先 `getAppUpdateInfo()` 校验 `isUpdateTypeAllowed(type)`，再 `startUpdateFlowForResult(info, activity, AppUpdateOptions.newBuilder(type).build())`。启动成功 resolve、失败 reject |
| `completeUpdate()` | FLEXIBLE 下载完成后调 `appUpdateManager.completeUpdate()` 触发安装 |
| 事件 `stateChange` | `InstallStateUpdatedListener` 上报 `{ installStatus, downloadStatus, bytesDownloaded, totalBytesToDownload }` |

### 关键实现点
- **activity result**：用 Capacitor `@ActivityCallback` 接 `onActivityResult`。IMMEDIATE 下若用户取消且 `force=true` → 通知 JS 重新拉起，保持「强制不可退出」语义（对应现有 UpdateDialog 的防退出逻辑）
- **FLEXIBLE 监听**：`startUpdate` 时 `registerListener`；`stateChange` 中 `downloadStatus == DOWNLOADED` → JS 调 `completeUpdate()`；`INSTALLED`/失败 → 移除监听
- **幂等**：`startUpdate` 正在等待结果时，再次调用返回「更新进行中」错误，JS 据此拦截重复点击

## 前端更新流程（appUpdater.js 渠道化）

### Play 变体（`updateChannel === 'play'`）
- `checkOnLaunch()`（静默，不弹窗）：
  1. `PlayUpdate.getUpdateInfo()`；`updateAvailable === true` → `updateState.hasUpdate = true`（红点）
  2. reject（无 Play / 非商店安装）→ 静默忽略，不设红点
- `checkManually()`：
  1. `PlayUpdate.getUpdateInfo()`；`!updateAvailable` → Toast「已是最新版本」并返回
  2. **尽力**拉一次后端 `fetchVersionInfo()` 补 changelog / force；后端无该变体记录时：
     - 版本徽标隐藏（`updateInfo.version = null`）
     - changelog 区隐藏（`changelog = null`）
     - force 按 `updatePriority` 推断：`>= 3` → `true`（IMMEDIATE），否则 `false`（FLEXIBLE）
  3. 弹 `UpdateDialog`（通用标题文案）
  4. 确认 → `startUpdate({ type: force ? 'immediate' : 'flexible', force })`；失败 → 回退浏览器打开 `https://play.google.com/store/apps/details?id=<packageName>`
- **flexible 安装态**：监听 `stateChange`，`DOWNLOADED` → `completeUpdate()`；期间置 `updateState` 状态避免重复手动检查

### 非 Play 变体（`updateChannel === 'store'`）
- 保持现有后端版本比较逻辑（`fetchVersionInfo` + `compareVersion`）
- 确认 → `window.open(updateUrl, '_system')`（系统浏览器），不再触发任何应用内下载
- `checkOnLaunch` 静默设红点行为不变

### 新导出
`appUpdater.js` 提供 `confirmUpdate()` 供 `UpdateDialog` 确认时调用，内部按 `updateChannel` 分发上述两分支。删除旧的 `downloadAndInstall` 导出。

## 组件调整（UpdateDialog.vue）

- `onConfirm`：`updateState.updateDialogVisible = false` → `confirmUpdate()`（`appUpdater.js`）
- 版本徽标：`info.version` 为空时隐藏 `update-header-version`
- changelog：`pickChangelog` 已返回空串时区域隐藏（现状已是）
- `App.vue` / `updateState.js` 按「移除 APK 侧载」精简

## 边界与错误处理

| 场景 | 处理 |
|------|------|
| Play 变体在无 Play 服务 / 非商店安装设备 | `getUpdateInfo()` reject → `checkOnLaunch` 静默、`checkManually` Toast「已是最新版本」（或引导打开商店） |
| Play 有更新但 `startUpdate` 失败 | 回退浏览器打开 Play 商店页（`packageName` 拼 URL） |
| 强制更新（IMMEDIATE）用户取消 | `@ActivityCallback` 结果 `RESULT_CANCELED` 且 `force=true` → 通知 JS 重新拉起 |
| flexible 下载中再次手动检查 | `startUpdate` 幂等返回「更新进行中」→ 拦截 / 提示 |
| 后端无该变体记录（Play） | 通用文案 + 隐藏版本/ changelog，force 按 `updatePriority` 推断 |
| 后端接口超时 / 失败 | Play 变体忽略 changelog 补充，直接以 Play 信息弹窗；store 变体 Toast 检查失败（现状） |

## 验证

- 构建：`pnpm build:hongsuyun-prod` 等 5 个变体均可构建，Play 变体生成包含 `app-update` 依赖
- `AndroidManifest.xml` 不再含 `REQUEST_INSTALL_PACKAGES`
- 真机验证：
  - hongsuyun-prod（Play 环境）：Play 有更新时手动检查弹窗、确认走 IMMEDIATE/FLEXIBLE 流程；强制更新取消后重新拉起
  - hongsuyun-cn / test（非 Play）：确认更新 → 系统浏览器打开 updateUrl
  - 无 Play 服务设备跑 Play 变体 → 优雅降级
- 回归：登录 / 扫码 / 手势返回不受影响

## 关联文件清单

| 文件 | 改动 |
|------|------|
| `variants.mjs` | 每变体加 `updateChannel` 字段 |
| `src/utils/urlValues.template.js` | 加 `export const updateChannel = '{{updateChannel}}'` |
| `android/app/templates/build.gradle.template` | 加 `app-update` 依赖 |
| `android/app/src/main/AndroidManifest.xml` | 删权限 + FileProvider |
| `android/app/src/main/java/cn/com/tmiot/ApkInstallerPlugin.java` | 删除 |
| `android/app/src/main/java/cn/com/tmiot/PlayUpdatePlugin.java` | 新增 |
| `android/app/src/main/java/cn/com/tmiot/MainActivity.java` | 换注册插件 |
| `android/app/src/main/res/xml/file_paths.xml` | 删除 |
| `src/utils/appUpdater.js` | 删下载链路 + 渠道化 check/confirm |
| `src/utils/updateState.js` | 删下载状态字段 |
| `src/App.vue` | 删 download-bar |
| `src/components/UpdateDialog.vue` | onConfirm 分发 + 版本徽标隐藏 |
