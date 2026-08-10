# Play 应用内更新（In-app Updates）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 `REQUEST_INSTALL_PACKAGES` 权限与 APK 侧载链路；国际版变体改用 Google Play In-app Updates（IMMEDIATE/FLEXIBLE），非 Play 变体改为系统浏览器打开 `updateUrl`。

**Architecture:** `variants.mjs` 每变体新增 `updateChannel: 'play' | 'store'` 并注入 `urlValues.js`；原生新增 Capacitor 插件 `PlayUpdatePlugin`（包装 Play Core `AppUpdateManager`，`@ActivityCallback` 接结果，`InstallStateUpdatedListener` 上报状态）；JS 侧 `appUpdater.js` 按 `updateChannel` 分流检查与确认动作。

**Tech Stack:** Vue 3 + Vite 4 + Capacitor 8；`com.google.android.play:app-update`（Play Core）；Java（原生插件沿用 `ApkInstallerPlugin` 的 Java 风格）。

## Global Constraints

- **Android SDK**: `compileSdk 36 / targetSdk 36 / minSdk 24`（见 `android/variables.gradle`，勿改）
- **依赖**: `com.google.android.play:app-update:2.1.0`（实现时确认最新稳定版；`android/build.gradle` 已含 `google()` 仓库）
- **模板/生成**: 改 `*.template.*` 源文件；生成文件（`urlValues.js`、`android/app/build.gradle` 等）由 `node scripts/build-variant.mjs <variant> --dev` 生成，**不要手动编辑**
- **命名**: 变量名 ≥2 字符、语义化（项目记忆规则）
- **无单测框架**: 本项目无 vitest/jest。每个任务的验证 = 配置生成（`--dev`）+ `npx vite build` / gradle 编译 + grep 断言 + 末尾手动真机清单
- **所有 5 个变体必须配置 `updateChannel`**，避免 `render()` 替换后残留 `{{updateChannel}}`
- **注释风格**: 与现有代码一致（中文注释，解释"为什么"）

## 文件结构

| 文件 | 职责 | 动作 |
|------|------|------|
| `variants.mjs` | 每变体加 `updateChannel` 字段 | 修改 |
| `src/utils/urlValues.template.js` | 加 `updateChannel` 导出 | 修改 |
| `android/app/templates/build.gradle.template` | 加 `app-update` 依赖 | 修改 |
| `android/app/src/main/java/cn/com/tmiot/PlayUpdatePlugin.java` | 新插件：getUpdateInfo / startUpdate / completeUpdate + 事件 | 新建 |
| `android/app/src/main/java/cn/com/tmiot/MainActivity.java` | 换注册插件 | 修改 |
| `android/app/src/main/java/cn/com/tmiot/ApkInstallerPlugin.java` | APK 侧载，已废弃 | 删除 |
| `android/app/src/main/AndroidManifest.xml` | 删权限 + FileProvider | 修改 |
| `android/app/src/main/res/xml/file_paths.xml` | 仅 ApkInstaller 使用 | 删除 |
| `src/utils/updateState.js` | 删下载字段，加 `updateInProgress` | 修改 |
| `src/App.vue` | 删 download-bar UI | 修改 |
| `src/utils/appUpdater.js` | 删下载链路 + 渠道化检查/确认 | 修改 |
| `src/components/UpdateDialog.vue` | 确认改调 `confirmUpdate()` + 版本徽标隐藏 | 修改 |

---

### Task 1: 渠道字段（variants.mjs + urlValues.template.js）

**Files:**
- Modify: `variants.mjs`（每变体加 `updateChannel`）
- Modify: `src/utils/urlValues.template.js`

**Interfaces:**
- Produces: `src/utils/urlValues.js`（生成物）导出 `updateChannel: 'play' | 'store'`，Task 6 的 `appUpdater.js` 依赖

- [ ] **Step 1: variants.mjs 每变体加字段**

在 `hongsuyun-prod` 块内（`appDisplayNameEn` 行之后）加一行；其余 4 个变体同样加 `updateChannel: 'store'`：

```js
    appDisplayNameZhCN: '弘塑云', // APP名称和顶部栏显示的名称
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'tmPlasCloud',
    updateChannel: 'play', // 更新渠道：'play'=Google Play（In-app Updates），'store'=浏览器打开 updateUrl
  },
```

其余变体（`hongsuyun-cn`、`hongsuyun-test`、`hongshehui-prod`、`hongshehui-test`）加 `updateChannel: 'store'`。

- [ ] **Step 2: urlValues.template.js 加导出**

`src/utils/urlValues.template.js` 在 `appName` 行后加：

```js
export const appName = '{{appName}}'
export const updateChannel = '{{updateChannel}}' // 'play'=Google Play，'store'=浏览器打开 updateUrl
```

- [ ] **Step 3: 生成并断言**

Run: `node scripts/build-variant.mjs hongsuyun-prod --dev`
Expected: 生成 `src/utils/urlValues.js`，含 `export const updateChannel = 'play'`

Run: `node scripts/build-variant.mjs hongsuyun-cn --dev`
Expected: `src/utils/urlValues.js` 含 `export const updateChannel = 'store'`

Run: `node scripts/build-variant.mjs hongsuyun-prod --dev`（恢复为 play，供后续任务使用）

- [ ] **Step 4: Commit**

```bash
git add variants.mjs src/utils/urlValues.template.js
git commit -m "feat: 变体增加 updateChannel 渠道字段（play/store）"
```

---

### Task 2: build.gradle.template 增加 app-update 依赖

**Files:**
- Modify: `android/app/templates/build.gradle.template`

**Interfaces:**
- Produces: 渲染后 `android/app/build.gradle` 含 `com.google.android.play:app-update`，Task 3 的 `PlayUpdatePlugin` 编译依赖

- [ ] **Step 1: 在 dependencies 块加依赖**

`dependencies { ... }` 内（`implementation project(':capacitor-android')` 后）加：

```gradle
    implementation project(':capacitor-android')
    implementation "com.google.android.play:app-update:2.1.0"
    testImplementation "junit:junit:$junitVersion"
```

- [ ] **Step 2: 生成并断言**

Run: `node scripts/build-variant.mjs hongsuyun-prod --dev`
Expected: `android/app/build.gradle` 的 dependencies 块含 `implementation "com.google.android.play:app-update:2.1.0"`

- [ ] **Step 3: Commit**

```bash
git add android/app/templates/build.gradle.template
git commit -m "feat: 引入 Google Play app-update 依赖"
```

---

### Task 3: 新增 PlayUpdatePlugin + MainActivity 注册

**Files:**
- Create: `android/app/src/main/java/cn/com/tmiot/PlayUpdatePlugin.java`
- Modify: `android/app/src/main/java/cn/com/tmiot/MainActivity.java`

**Interfaces:**
- Produces: 插件名 `PlayUpdate`，JS 经 `Capacitor.Plugins.PlayUpdate` 调用
  - `getUpdateInfo()` → Promise `{ updateAvailable, isImmediateAllowed, isFlexibleAllowed, availableVersionCode, updatePriority, packageName }`；Play 不可用 / 非商店安装时 reject
  - `startUpdate({ type: 'immediate'|'flexible', force: boolean })` → 流程启动后 resolve；失败 reject（用户取消非强制 → code `USER_CANCELLED`）
  - `completeUpdate()` → 无参 Promise
  - 事件 `stateChange`：`{ installStatus, downloadStatus, bytesDownloaded, totalBytesToDownload }`（状态为枚举名大写下划线）
  - 事件 `updateCancelled`：IMMEDIATE 强制更新被用户取消时触发

- [ ] **Step 1: 编写 PlayUpdatePlugin.java**

`android/app/src/main/java/cn/com/tmiot/PlayUpdatePlugin.java` 全文：

```java
package cn.com.tmiot;

import android.app.Activity;
import com.getcapacitor.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.DownloadStatus;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Google Play 应用内更新桥接。
 * - getUpdateInfo：查询 Play 是否有新版本
 * - startUpdate：启动 IMMEDIATE / FLEXIBLE 更新流程（用 AppUpdateOptions 重载 + 自定 requestCode，
 *   结果经 Capacitor @ActivityCallback 接 onActivityResult）
 * - completeUpdate：FLEXIBLE 下载完成后触发安装
 * 仅对 updateChannel === 'play' 的变体被 JS 调用；其他变体/非 Play 设备会 reject，由 JS 降级。
 */
@CapacitorPlugin(name = "PlayUpdate")
public class PlayUpdatePlugin extends Plugin {

    // 自定 requestCode，避免与 Capacitor 内部活动请求码冲突
    private static final int REQUEST_CODE_UPDATE = 9981;

    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener stateListener;

    private AppUpdateManager getManager() {
        if (appUpdateManager == null) {
            appUpdateManager = AppUpdateManagerFactory.create(getContext());
        }
        return appUpdateManager;
    }

    @PluginMethod()
    public void getUpdateInfo(PluginCall call) {
        getManager().getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                JSObject result = new JSObject();
                result.put("updateAvailable", info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE);
                result.put("isImmediateAllowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
                result.put("isFlexibleAllowed", info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE));
                result.put("availableVersionCode", info.availableVersionCode());
                result.put("updatePriority", info.updatePriority());
                result.put("packageName", getContext().getPackageName());
                call.resolve(result);
            })
            .addOnFailureListener(e -> call.reject("getAppUpdateInfo failed: " + e.getMessage()));
    }

    @PluginMethod()
    public void startUpdate(PluginCall call) {
        String typeStr = call.getString("type", "flexible");
        boolean force = call.getBoolean("force", false);
        final int type = "immediate".equals(typeStr) ? AppUpdateType.IMMEDIATE : AppUpdateType.FLEXIBLE;

        getManager().getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                boolean available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                        || info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                if (!available) {
                    call.reject("no update available", "NO_UPDATE");
                    return;
                }
                if (!info.isUpdateTypeAllowed(type)) {
                    call.reject("update type not allowed", "TYPE_NOT_ALLOWED");
                    return;
                }
                // FLEXIBLE 需监听安装状态：下载完成时由 JS 调 completeUpdate
                if (type == AppUpdateType.FLEXIBLE) {
                    registerStateListener();
                }
                saveCall(call);
                try {
                    getManager().startUpdateFlowForResult(
                        info,
                        getActivity(),
                        AppUpdateOptions.newBuilder(type).build(),
                        REQUEST_CODE_UPDATE);
                } catch (Exception e) {
                    call.reject("startUpdateFlow failed: " + e.getMessage());
                }
            })
            .addOnFailureListener(e -> call.reject("getAppUpdateInfo failed: " + e.getMessage()));
    }

    @ActivityCallback
    private void onUpdateFlowResult(PluginCall call, ActivityResult result) {
        int resultCode = result.getResultCode();
        // 非本插件的请求码直接忽略，避免串台
        if (result.getRequestCode() != REQUEST_CODE_UPDATE) return;
        boolean force = call.getBoolean("force", false);
        if (resultCode == Activity.RESULT_OK) {
            call.resolve();
        } else if (resultCode == Activity.RESULT_CANCELED) {
            if (force) {
                // 强制更新被取消：通知 JS 重新拉起，保持"不可退出"语义
                JSObject ev = new JSObject().put("cancelled", true);
                notifyListeners("updateCancelled", ev);
                call.resolve();
            } else {
                call.reject("update cancelled", "USER_CANCELLED");
            }
        } else {
            call.reject("update failed resultCode=" + resultCode);
        }
    }

    @PluginMethod()
    public void completeUpdate(PluginCall call) {
        getManager().completeUpdate();
        call.resolve();
    }

    private void registerStateListener() {
        if (stateListener != null) return;
        stateListener = state -> {
            JSObject ev = new JSObject();
            ev.put("installStatus", installStatusName(state.installStatus()));
            ev.put("downloadStatus", downloadStatusName(state.downloadStatus()));
            ev.put("bytesDownloaded", state.bytesDownloaded());
            ev.put("totalBytesToDownload", state.totalBytesToDownload());
            notifyListeners("stateChange", ev);
            // 终态：解绑监听，避免泄漏
            if (state.installStatus() == InstallStatus.INSTALLED
                    || state.installStatus() == InstallStatus.FAILED
                    || state.installStatus() == InstallStatus.CANCELED) {
                getManager().unregisterListener(stateListener);
                stateListener = null;
            }
        };
        getManager().registerListener(stateListener);
    }

    private static String downloadStatusName(int status) {
        switch (status) {
            case DownloadStatus.PENDING: return "PENDING";
            case DownloadStatus.DOWNLOADING: return "DOWNLOADING";
            case DownloadStatus.DOWNLOADED: return "DOWNLOADED";
            case DownloadStatus.FAILED: return "FAILED";
            case DownloadStatus.CANCELED: return "CANCELED";
            default: return "UNKNOWN";
        }
    }

    private static String installStatusName(int status) {
        switch (status) {
            case InstallStatus.REQUIRES_UI_INTENT: return "REQUIRES_UI_INTENT";
            case InstallStatus.PENDING: return "PENDING";
            case InstallStatus.DOWNLOADING: return "DOWNLOADING";
            case InstallStatus.DOWNLOADED: return "DOWNLOADED";
            case InstallStatus.INSTALLING: return "INSTALLING";
            case InstallStatus.INSTALLED: return "INSTALLED";
            case InstallStatus.FAILED: return "FAILED";
            case InstallStatus.CANCELED: return "CANCELED";
            default: return "UNKNOWN";
        }
    }
}
```

> 若 `AppUpdateOptions` 包路径编译报错，在 `com.google.android.play.core.appupdate` jar 中确认实际包名后修正 import。

- [ ] **Step 2: MainActivity 注册插件**

`android/app/src/main/java/cn/com/tmiot/MainActivity.java`：

```java
package cn.com.tmiot;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(PlayUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 3: 编译验证**

Run: `node scripts/build-variant.mjs hongsuyun-prod --dev && cd android && ./gradlew :app:compileDebugJavaWithJavac`
Expected: BUILD SUCCESSFUL，`PlayUpdatePlugin` 编译通过、`app-update` 依赖解析成功

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/cn/com/tmiot/PlayUpdatePlugin.java android/app/src/main/java/cn/com/tmiot/MainActivity.java
git commit -m "feat: 新增 PlayUpdate 插件（In-app Updates 桥接）"
```

---

### Task 4: 移除 APK 侧载（权限 / FileProvider / ApkInstallerPlugin）

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Delete: `android/app/src/main/java/cn/com/tmiot/ApkInstallerPlugin.java`
- Delete: `android/app/src/main/res/xml/file_paths.xml`
- Modify: `android/app/src/main/java/cn/com/tmiot/MainActivity.java`

**Interfaces:**
- Produces: Manifest 不再含 `REQUEST_INSTALL_PACKAGES` 与 FileProvider；`ApkInstaller` 全局无引用

- [ ] **Step 1: Manifest 删除权限与 FileProvider**

`android/app/src/main/AndroidManifest.xml`：
1. 删除 `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />`
2. 删除整个 `<provider ... FileProvider ...>` 块（含 `file_paths` meta-data）

- [ ] **Step 2: 删除 ApkInstallerPlugin.java 与 file_paths.xml**

```bash
rm android/app/src/main/java/cn/com/tmiot/ApkInstallerPlugin.java
rm android/app/src/main/res/xml/file_paths.xml
```

- [ ] **Step 3: 断言无残留引用**

Run: `grep -rn "ApkInstaller\|file_paths\|fileprovider\|REQUEST_INSTALL_PACKAGES" android/app/src/main/ --include=*.xml --include=*.java`
Expected: 无匹配（`MainActivity.java` 也不再有 `ApkInstallerPlugin`）

- [ ] **Step 4: 编译验证**

Run: `cd android && ./gradlew :app:compileDebugJavaWithJavac`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add -A android/app/src/main/
git commit -m "feat: 移除 REQUEST_INSTALL_PACKAGES 权限与 APK 侧载（ApkInstaller/FileProvider）"
```

---

### Task 5: 精简 updateState + 移除 App.vue 下载进度条

**Files:**
- Modify: `src/utils/updateState.js`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: Task 1 已生成 `urlValues.js`（供 `npx vite build` 使用）
- Produces: `updateState` 仅保留 `hasUpdate/updateInfo/updateInProgress/updateDialogVisible/forceUpdate`；`App.vue` 不再引用 `downloadAndInstall`/`cancelCurrentDownload`/下载字段

- [ ] **Step 1: updateState.js 精简**

`src/utils/updateState.js` 全文替换：

```js
// src/utils/updateState.js
import { reactive } from 'vue'

export const updateState = reactive({
  hasUpdate: false,
  updateInfo: null,
  updateInProgress: false,   // Play 更新进行中（flexible 下载 / immediate 流程），拦截重复手动检查
  updateDialogVisible: false,   // 更新弹框是否显示
  forceUpdate: false,           // 是否强制更新
})
```

- [ ] **Step 2: App.vue 删除 download-bar**

1. 模板：删除 `<transition name="slide-up">...</transition>` 整块（含 download-bar div，第 7-25 行）
2. `<script setup>`：删除 `cancelDownload()`、`retryDownload()` 函数；import 改为
   `import { checkOnLaunch } from './utils/appUpdater.js'`
3. 样式：删除 `.download-bar` 至 `.slide-up-leave-to` 全部相关样式（`.slide-up-*` 仅被删除的 transition 使用）

- [ ] **Step 3: 构建验证**

Run: `npx vite build`
Expected: 构建成功，无"unresolved import `downloadAndInstall`"报错（App.vue 已不引用）

- [ ] **Step 4: Commit**

```bash
git add src/utils/updateState.js src/App.vue
git commit -m "feat: 移除下载进度 UI 与下载状态字段"
```

---

### Task 6: appUpdater.js 渠道化改造 + UpdateDialog.vue 适配

**Files:**
- Modify: `src/utils/appUpdater.js`
- Modify: `src/components/UpdateDialog.vue`

**Interfaces:**
- Consumes:
  - `updateChannel`（Task 1）
  - `PlayUpdate` 插件（Task 3）：`getUpdateInfo` / `startUpdate` / `completeUpdate`、事件 `stateChange` / `updateCancelled`
- Produces: 新导出 `confirmUpdate()`；`downloadAndInstall`、`cancelCurrentDownload` 不再导出

- [ ] **Step 1: 重写 appUpdater.js**

`src/utils/appUpdater.js` 全文替换：

```js
import { showToast } from 'vant'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { t } from '../i18n'
import { isLoggedIn } from './auth.js'
import { appVersion, appName, updateChannel, updateCheckUrl } from './urlValues.js'
import { updateState } from './updateState.js'

let checking = false
let updateCancelledListener = null
let flexStateListener = null

const isPlayChannel = () => updateChannel === 'play'
const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

/** Format byte count to human-readable string */
export function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return ''
  const n = Number(bytes)
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

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

/** 当前应用版本 */
function getCurrentVersion() {
  return appVersion || '0.0.0'
}

/** 调用更新检查接口，5 秒超时（免登录接口） */
async function fetchVersionInfo() {
  const platform = Capacitor.getPlatform()
  const url = `${updateCheckUrl}?app=${appName}&platform=${platform}`

  if (Capacitor.isNativePlatform()) {
    const res = await Promise.race([
      CapacitorHttp.request({ url, method: 'GET' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  }

  // Web 开发模式走 Vite 代理，避免跨域
  const proxyUrl = `/api/biz/tmIoTCloud/Interface/updateAppVersion?app=${appName}&platform=${platform}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal })
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** 查询 Play 更新信息；非 Android 原生 / 无 Play 服务 / 非商店安装返回 null */
async function fetchPlayUpdateInfo() {
  if (!isNativeAndroid()) return null
  const plugin = Capacitor.Plugins.PlayUpdate
  if (!plugin) return null
  try {
    return await plugin.getUpdateInfo()
  } catch {
    return null
  }
}

/**
 * 组装 Play 变体弹窗信息：
 * 后端仅在存在该变体记录时补充 changelog/version/forceUpdate；缺失则通用文案。
 * force 优先取后端 forceUpdate，否则按 Play updatePriority >= 3 推断为强制。
 */
function buildPlayUpdateInfo(playInfo, backendInfo) {
  const force = backendInfo?.forceUpdate ? true : (playInfo.updatePriority ?? 0) >= 3
  return {
    ...backendInfo,
    version: backendInfo?.version ?? null,
    forceUpdate: force,
    updateUrl: backendInfo?.updateUrl ?? null,
    packageName: playInfo.packageName,
    availableVersionCode: playInfo.availableVersionCode,
  }
}

/** 弹出更新弹窗（可选 / 强制）——由 UpdateDialog.vue 组件渲染卡片内容 */
function showUpdateDialog(info) {
  updateState.updateInfo = info
  updateState.forceUpdate = !!info.forceUpdate
  updateState.updateDialogVisible = true
}

/** 启动时自动检查（静默，失败不提示；Play 变体以 Play API 为准） */
export async function checkOnLaunch() {
  if (!isLoggedIn()) return
  if (checking) return
  checking = true
  updateState.hasUpdate = false
  try {
    if (isPlayChannel()) {
      const playInfo = await fetchPlayUpdateInfo()
      if (playInfo?.updateAvailable) updateState.hasUpdate = true
      return
    }
    const info = await fetchVersionInfo()
    if (!info || !info.version) return
    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) return
    updateState.hasUpdate = true
    updateState.updateInfo = info
  } catch {
    // 启动检查失败，静默忽略
  } finally {
    checking = false
  }
}

/** 手动检查（失败 Toast 提示；Play 变体以 Play API 为准） */
export async function checkManually() {
  if (!isLoggedIn()) return
  if (checking) return
  if (updateState.updateInProgress) {
    showToast(t('update.downloading'))
    return
  }
  checking = true
  updateState.hasUpdate = false
  const loadingToast = showToast({ message: t('update.checking'), forbidClick: true, duration: 0 })
  try {
    if (isPlayChannel()) {
      const playInfo = await fetchPlayUpdateInfo()
      loadingToast.close()
      if (!playInfo?.updateAvailable) {
        showToast(t('update.alreadyLatest'))
        return
      }
      // 尽力拉后端补 changelog/force；失败或该变体无记录则忽略
      let backendInfo = null
      try {
        const info = await fetchVersionInfo()
        if (info?.version) backendInfo = info
      } catch { /* 忽略，Play 信息足够弹窗 */ }
      updateState.hasUpdate = true
      showUpdateDialog(buildPlayUpdateInfo(playInfo, backendInfo))
      return
    }
    const info = await fetchVersionInfo()
    loadingToast.close()
    if (!info || !info.version) {
      showToast(t('update.checkFailed'))
      return
    }
    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) {
      showToast(t('update.alreadyLatest'))
      return
    }
    updateState.hasUpdate = true
    showUpdateDialog(info)
  } catch {
    loadingToast.close()
    showToast(t('update.checkFailed'))
  } finally {
    checking = false
  }
}

function cleanupUpdateListeners() {
  updateCancelledListener?.remove()
  updateCancelledListener = null
  flexStateListener?.remove()
  flexStateListener = null
}

/** 启动 Play 更新流程；失败回退浏览器打开 Play 商店页 */
async function startPlayUpdate(info) {
  const plugin = Capacitor.Plugins.PlayUpdate
  if (!plugin) return
  const type = info.forceUpdate ? 'immediate' : 'flexible'
  updateState.updateInProgress = true
  try {
    // 强制（IMMEDIATE）被用户取消时，Play 会发 updateCancelled —— 重新拉起保持"不可退出"
    updateCancelledListener = await plugin.addListener('updateCancelled', () => {
      plugin.startUpdate({ type: 'immediate', force: true }).catch(() => {
        updateState.updateInProgress = false
      })
    })
    if (type === 'flexible') {
      // FLEXIBLE：下载完成触发安装；失败/取消复位拦截标志
      flexStateListener = await plugin.addListener('stateChange', ({ downloadStatus, installStatus }) => {
        if (downloadStatus === 'DOWNLOADED') {
          plugin.completeUpdate().catch(() => {})
        } else if (installStatus === 'FAILED' || installStatus === 'CANCELED') {
          updateState.updateInProgress = false
        }
      })
    }
    await plugin.startUpdate({ type, force: info.forceUpdate })
  } catch (err) {
    updateState.updateInProgress = false
    cleanupUpdateListeners()
    // 用户主动取消非强制更新：不打扰；其他失败：回退浏览器打开 Play 商店页
    if (err?.code === 'USER_CANCELLED') return
    if (info.packageName) {
      window.open(`https://play.google.com/store/apps/details?id=${info.packageName}`, '_system')
    }
  }
}

/** 更新弹窗确认动作——按渠道分发：Play 启动 In-app Updates，store 浏览器打开 updateUrl */
export async function confirmUpdate() {
  const info = updateState.updateInfo
  if (!info) return
  if (isPlayChannel() && isNativeAndroid()) {
    await startPlayUpdate(info)
  } else if (info.updateUrl) {
    window.open(info.updateUrl, '_system')
  }
}
```

- [ ] **Step 2: UpdateDialog.vue 适配**

1. import 替换：删 `import { downloadAndInstall, formatBytes } ...` 中的 `downloadAndInstall`，改为 `import { confirmUpdate, formatBytes } from '../utils/appUpdater.js'`
2. `onConfirm` 改为：

```js
function onConfirm() {
  confirmedClose = true
  updateState.updateDialogVisible = false
  confirmUpdate().catch(() => {})
}
```

3. 版本徽标：Play 变体无后端记录时 `info.version` 为 null，隐藏徽标。模板改为：

```html
<span v-if="version" class="update-header-version">v{{ version }}</span>
```

- [ ] **Step 3: 构建验证**

Run: `npx vite build`
Expected: 构建成功。`grep -rn "downloadAndInstall\|cancelCurrentDownload" src/` 无匹配（除本计划文档）。

- [ ] **Step 4: Commit**

```bash
git add src/utils/appUpdater.js src/components/UpdateDialog.vue
git commit -m "feat: 更新检查/确认按渠道分流（Play In-app Updates / store 浏览器）"
```

---

### Task 7: 全量构建与清单验证

**Files:**
- 无新增改动（验证任务）

- [ ] **Step 1: 5 个变体全量构建**

Run:
```bash
node scripts/build-variant.mjs hongsuyun-prod
node scripts/build-variant.mjs hongsuyun-cn
node scripts/build-variant.mjs hongsuyun-test
node scripts/build-variant.mjs hongshehui-prod
node scripts/build-variant.mjs hongshehui-test
```
Expected: 每个都执行 vite build + cap sync 成功

- [ ] **Step 2: Manifest 断言**

Run: `grep -n "REQUEST_INSTALL_PACKAGES\|FileProvider" android/app/src/main/AndroidManifest.xml`
Expected: 无匹配

- [ ] **Step 3: 生成物断言**

Run: `grep -n "app-update" android/app/build.gradle`（应存在）；`grep -n "updateChannel" src/utils/urlValues.js`（应为 `'play'`，因最后构建的是 hongshehui-test → `'store'`，预期为 store）

- [ ] **Step 4: 手动真机清单（交付给用户）**

| 场景 | 预期 |
|------|------|
| hongsuyun-prod（Play 真机）手动检查，Play 有新版本 | 弹窗 → 确认 → 走 IMMEDIATE（force）或 FLEXIBLE（非 force） |
| hongsuyun-prod 强制更新取消 | updateCancelled → 重新拉起 Play 全屏流程 |
| hongsuyun-prod 在无 Play 服务设备 | 手动检查提示"已是最新版本"，启动静默无红点 |
| hongsuyun-cn / test 确认更新 | 系统浏览器打开后端 updateUrl |
| 登录 / 扫码 / 手势返回回归 | 不受影响 |

- [ ] **Step 5: 更新 CLAUDE.md（文档同步）**

`CLAUDE.md`「核心架构模式 §4 版本更新」改写为渠道化描述，移除 ApkInstaller 事件驱动段，补充 Play 变体走 In-app Updates、store 变体走浏览器。提交：

```bash
git add CLAUDE.md
git commit -m "docs: 更新版本更新机制说明（Play In-app Updates / store 浏览器）"
```

---

## Self-Review 备忘（对照 spec）

- [x] 渠道字段 play/store（spec §1）→ Task 1
- [x] 移除权限 / FileProvider / ApkInstaller（spec §2）→ Task 4
- [x] PlayUpdatePlugin（spec §3）→ Task 2、3
- [x] appUpdater 渠道化 + confirmUpdate（spec §4）→ Task 6
- [x] UpdateDialog 适配（spec §5）→ Task 6
- [x] updateState.updateInProgress / App.vue 删下载条（spec §2/§4）→ Task 5
- [x] 边界与手动验证（spec §验证）→ Task 7
