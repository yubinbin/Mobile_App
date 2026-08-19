# CLAUDE.md — Mobile App 项目概况与开发指南

## 项目概述

这是一个基于 **Vue 3 + Vite + Capacitor** 的混合移动应用（Android/iOS），核心功能是通过 WebView（iframe）加载远程 TTC 引擎页面，并提供原生能力支持（二维码扫描、版本更新等）。

- **App 名称**: 弘塑云 (HongSuYun) / 弘设汇 (HongSheHui)（通过 `variants.mjs` 统一管理，一条命令构建）
- **变体数量**: 5 个（弘塑云 × 生产国际/生产国内/测试 + 弘设汇 × 生产/测试），后续可扩展
- **包名**: 每个变体独立包名，来源是 `variants.mjs` 的 `appId`（经 `build.gradle.template` 的 `{{appId}}` 注入 Android `applicationId`）
- **当前版本**: v1.0.0
- **分支**: `v1.2.0`（统一分支，不再使用多分支管理变体）

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.5（Composition API + `<script setup>`） |
| 构建 | Vite 4 |
| 移动容器 | Capacitor 8 |
| UI 组件库 | Vant 4.9 |
| 路由 | Vue Router 5（Hash 模式） |
| 国际化 | 自定义 i18n（`src/i18n/`），支持 zh-CN / zh-TW / en-US |
| 包管理 | pnpm |
| 扫码 | `@capacitor-mlkit/barcode-scanning`（MLKit） |

## 项目结构

```
├── variants.mjs              # 【变体配置唯一入口】所有变体的 URL、包名、图标等配置
├── capacitor.config.template.ts  # Capacitor 配置模板 → 生成 capacitor.config.ts
├── scripts/
│   └── build-variant.mjs     # 构建引擎：模板替换 + icon 复制 + vite build + cap sync
├── android/app/
│   ├── templates/            # Android 生成文件模板
│   │   ├── build.gradle.template       # applicationId 由 {{appId}} 注入
│   │   ├── strings.template.xml        # 简体中文（默认）
│   │   ├── strings.template.en.xml     # 英文
│   │   └── strings.template.zh-rTW.xml # 繁体中文
│   └── src/
│       ├── tpc/              # 弘塑云-国际版图标资源
│       ├── tpc_cn/           # 弘塑云-国内版图标资源
│       └── tic/              # 弘设汇图标资源
src/
├── main.js                  # 入口：注册 Vant 组件、路由、全局 $t
├── App.vue                  # 根组件：keep-alive、手势返回、启动更新检查
├── router/index.js          # 路由配置 + 导航守卫（认证检查）
├── pages/
│   ├── Login.vue            # 登录页：用户名密码 + RSA 加密 + WebSocket 互踢
│   ├── ProjectView.vue      # 主页：iframe 加载远程页面 + 扫码功能（动态导航栏标题）
│   ├── UserInfo.vue         # 用户中心
│   └── About.vue            # 关于页
├── utils/
│   ├── auth.js              # 认证模块：token 管理、authRequest、WebSocket
│   ├── appUpdater.js        # 版本更新：检查、渠道分发（Play In-app Updates / store 浏览器）
│   ├── urlValues.template.js  # 环境配置模板 → 生成 urlValues.js
│   ├── projectUrl.js        # iframe 项目链接统一构建（Login / ProjectView 共用）
│   ├── navState.js          # iframe 导航状态共享（canGoBack）
│   ├── scanState.js         # 扫码状态共享
│   └── swipeBack.js         # 手势返回处理
├── i18n/
│   ├── index.js             # 国际化核心：t()、setLocale()、Vant 语言同步
│   ├── zh-CN.json           # 简体中文
│   ├── zh-TW.json           # 繁体中文
│   └── en.json              # 英文
└── assets/                  # 图片、Logo、CSS
```

> **注意**: `urlValues.js`、`capacitor.config.ts`、`android/app/build.gradle`、`android/app/src/main/res/values/strings.xml`、`values-en/strings.xml`、`values-zh-rTW/strings.xml` 均由 `build-variant.mjs` 生成，已加入 `.gitignore`，**不要手动编辑**。

## 路由表

| 路径 | 页面 | 认证要求 | 说明 |
|------|------|----------|------|
| `/login` | Login.vue | 无（已登录则重定向） | |
| `/project-view` | ProjectView.vue | 需要 | 主页面，keep-alive 缓存 |
| `/user-info` | UserInfo.vue | 需要 | |
| `/about` | About.vue | 需要 | |
| `/` | — | — | 重定向到 `/project-view` |
| `/:catchAll` | — | — | 重定向到 `/login` |

## 核心架构模式

### 1. 认证流程

- 登录通过 RSA 加密密码后调用 `/app/account/login`
- Token 存储在内存（`auth.js` 的 `_token`），不持久化
- 支持自动登录（localStorage 存 `LoginData`）
- WebSocket 用于多设备登录互踢检测（`wss://...?token=...`）
- `authRequest()` 在原生平台走 `CapacitorHttp`（绕过 WebView 跨域），Web 端走 `fetch`，失败时回退到 Vite 代理

### 2. iframe 通信

- ProjectView 加载远程 TTC 引擎页面到 iframe
- iframe 通过 `postMessage` 与 App 通信（校验 `origin === baseUrl`）
- 支持的消息：
  - `{ action: 'scanCode' }` → App 启动扫码
  - `{ type: 'URL_CHANGE', url }` → 更新导航状态
  - App → iframe: `{ action: 'scanCodeResult', data: { result } }`

### 3. 扫码功能

- 使用 MLKit Barcode Scanning 插件
- 扫码流程：iframe 发 scanCode → App 开启相机 → 扫描结果 postMessage 回 iframe
- 30 秒超时自动取消
- 扫描期间显示透明覆盖层

### 4. 版本更新

- 启动时自动检查（静默），用户中心可手动检查
- 支持可选更新（Vant ConfirmDialog）和强制更新（不可关闭的 Dialog）
- 更新按渠道分流（`variants.mjs` 的 `updateChannel`）：
  - **`play`**（仅 `hongsuyun-prod`，**仅 Android 原生生效**）：走 **Google Play In-app Updates**，升级由 Play 商店原生流程完成（IMMEDIATE / FLEXIBLE）。iOS 上该变体 `isPlayChannel()` 为 false，回落到 `store` 逻辑（后端检查 + `window.open(updateUrl)` 打开 App Store 链接），避免跳过 App Store 更新检测
  - **`store`**（国内版 / 测试版）：点「立即更新」用**系统浏览器**打开后端 `updateUrl`，不再应用内下载安装 APK。**iOS 同样走此逻辑**：在数据库把该 App 的 `updateUrl` 配成 App Store 链接（如 `https://apps.apple.com/app/id6796174875`）即可跳转 App Store，改库即时生效、无需发版
- 前端逻辑集中在 `src/utils/appUpdater.js`：`confirmUpdate()` 按 `updateChannel` 分发（`UpdateDialog` 确认时调用），`checkOnLaunch` / `checkManually` 对应启动静默检查与手动检查
- Play 原生桥接：`android/app/src/main/java/cn/com/tmiot/PlayUpdatePlugin.java`（依赖 `com.google.android.play:app-update`）

**Play 变体（`updateChannel === 'play'`）流程**：
- `PlayUpdate.getUpdateInfo()` 查询是否有新版本，**以 Play API 为准**；后端接口（`GET https://manage.tmiot.com.cn/app/share/updateAppVersion?app=<name>&platform=<platform>`）仅在该变体有记录时补充 changelog / force，缺失则用通用文案并隐藏版本徽标
- force 映射：`true → IMMEDIATE`（全屏强制，用户取消会**重新拉起**保持「不可退出」）；`false → FLEXIBLE`（后台下载 + 提示安装）
- `stateChange` 事件（`installStatus`）：`DOWNLOADED` → JS 调 `completeUpdate()` 触发安装；`FAILED` / `CANCELED` → 显式复位 `updateState.updateInProgress`（拦截重复检查标志）；`INSTALLED` 由应用更新重启后清零
- 无 Play 服务 / 非商店安装设备 → `getUpdateInfo()` reject，`checkOnLaunch` 静默忽略（不设红点）、`checkManually` 提示「已是最新版本」
- `startUpdate` 失败（除用户主动取消非强制更新）→ 回退系统浏览器打开 Play 商店页 `https://play.google.com/store/apps/details?id=<packageName>`

**⚠️ Play 插件两个适配点**（详见 `PlayUpdatePlugin.java` 注释，都是真机踩出来的）：
- play-core 2.1.0 起**不再有 `DownloadStatus` 类**，下载子状态并入 `installStatus()`，`downloadStatus` 事件字段由 `installStatus()` 派生；且**安装期 `installStatus` 仍为 `DOWNLOADED`**，JS 端须以权威的 `installStatus === 'DOWNLOADED'` 为触发条件，否则会重复拉起 `completeUpdate()`
- Capacitor 8 的 `@ActivityCallback` 只接收经 Capacitor 自己 launcher 启动的结果，而 Play Core 的 `startUpdateFlowForResult` 走 Activity 原生 `startActivityForResult`，结果落在过时的 `handleOnActivityResult`；需把请求码**字面量**声明进 `@CapacitorPlugin(requestCodes = { ... })`（注解值不允许前向引用同类 static final 字段），Bridge 按请求码路由到本插件

### 5. 导航守卫

- `router.beforeEach` 检查认证状态
- `window.__forceLogout` 标志支持强制登出（WebSocket 互踢）
- `router.afterEach` 设置 StatusBar 颜色

### 6. 手势返回 / 系统返回键

- 左滑返回手势（`touchstart`/`touchend`）
- Android 返回键监听（`App.addListener('backButton', ...)`）
- ProjectView 页面内优先触发 iframe 内部返回（`history.back()`）
- 登录页和项目页的返回键触发 HomeSwipe（退到后台）

### 7. 状态栏 / 安全区（Android edge-to-edge 兼容）

- `App.vue` 的 `initStatusBar()` 调用 `StatusBar.setOverlaysWebView({ overlay: false })`，但**在部分机型上不足以避开状态栏**（见下）。
- **真正的兜底在 CSS**：`App.vue` 有一段**非 scoped** 全局样式，给所有 `.van-nav-bar` 加 `padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`，覆盖 ProjectView / UserInfo / About 三个页面的顶部栏；Login 的 `.safe-area-top` 占位用同一变量。

**⚠️ 关键陷阱（顶部栏跑进状态栏的根因）**

- `targetSdkVersion = 36` 触发 Android 15+ **强制 edge-to-edge**。Capacitor 8 在「WebView 版本 ≥ 140 **且** `index.html` 带 `viewport-fit=cover`」时（本项目两者都满足）走 **passthrough 模式**：WebView 内容直接铺到状态栏下方，原生**不再**给 WebView 加 padding，完全靠网页自己避让。旧 WebView 机型走 legacy 路径（原生加 padding），所以看起来正常——这就是「**只有极个别手机出问题**」的原因，取决于该机的**系统 WebView 版本**。
- **不要用标准的 `env(safe-area-inset-top)` 兜底**：在 Android 上它**只反映刘海/挖孔（display cutout），不含普通状态栏高度**，无刘海机型返回 0，占位会塌成 0 高度——等于没改。
- **必须用 Capacitor 注入的自定义变量 `--safe-area-inset-top`**：Capacitor 8 核心 `SystemBars.java` 通过 `systemBars() | displayCutout()` 计算真实高度（**含状态栏**），注入为 `--safe-area-inset-top`（**不是** `env()`）。写法 `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` 在三种路径下都正确：passthrough 机型返回真实状态栏高度，legacy 机型返回 0（原生已 padding），iOS 回退到 `env()`。
- `.van-nav-bar` 加 padding 时用 `box-sizing: content-box`，避免 padding 吃掉 Vant 的 `--van-nav-bar-height`（44px）把内容压扁。
- 此类问题**本地/多数真机无法复现**，需在出问题的那台真机上装对应变体验证。

**iOS 端行为（同一份 CSS 为什么安全）**

从 Capacitor 8 iOS 源码逐层确认，该 CSS 对 iOS **无负面影响，且是顺带修复**：

- iOS **不注入** `--safe-area-inset-top`，故回退链落到标准 `env(safe-area-inset-top)`，由 WebKit 原生支持。
- `CAPBridgeViewController.swift` 中 `view = webView`：WKWebView 即根视图，全屏铺开（含状态栏/刘海区）；配合 `viewport-fit=cover`，`env()` 返回真实安全区高度。
- `CAPInstanceDescriptor.m` 默认 `contentInsetAdjustmentBehavior = .never`：scrollView **不**自动下移内容，故 `env()` 是唯一偏移来源，**不会双重留白**。
- 各机型：刘海机（iPhone X+）返回 44–59px，非刘海机 / iPad 返回 20px，nav-bar 均精确避让。
- 改动前 iOS 的 `.van-nav-bar` 无 padding-top 而 WebView 全屏，故 iOS **本可能也有**顶部栏侵入问题；这次是同时修复两端。真机验证建议 Android + iOS 各看一台。

## 变体构建系统

所有变体配置集中在 `variants.mjs`，通过 `scripts/build-variant.mjs` 一条命令完成构建。**不再需要手动修改源码切换环境或管理多个分支。**

### 变体列表

| 变体名 | 产品 | 环境 | 包名（`appId`） |
|--------|------|------|------|
| `hongsuyun-prod` | 弘塑云 | 生产-国际 | `com.tmiot.tmplascloud` |
| `hongsuyun-cn` | 弘塑云 | 生产-国内 | `com.tmiot.tpc` |
| `hongsuyun-test` | 弘塑云 | 测试 | `com.tmiot.tpc`（与国内版同包名，**不能同机共存**） |
| `hongshehui-prod` | 弘设汇 | 生产 | `cn.com.tmiot.tic` |
| `hongshehui-test` | 弘设汇 | 测试 | `cn.com.tmiot.hongshehui.test` |

### 变体配置字段（variants.mjs）

每个变体包含 14 个字段：`appName`、`appVersion`、`versionCode`、`appId`、`baseUrl`、`loginSocket`、`projectOID`、`ttcVersion`、`projectUrl`、`iconDir`、`logoAsset`、`appDisplayNameZhCN`、`appDisplayNameZhTW`、`appDisplayNameEn`。

> **版本号按变体独立**：`appVersion` / `versionCode` 是每个变体各自的字段，定义在各变体配置块内，各变体取值可以不同，发版时分别修改对应变体。`{{appVersion}}` 注入 Android `versionName` 与 web 端 `appVersion`（模板 `'v{{appVersion}}'` 自动加 `v` 前缀）；`{{versionCode}}` 注入 Android `versionCode`。

> **`appId` 同时驱动 Android 包名**（经 `build.gradle.template` 的 `{{appId}}` 注入 `applicationId`）和 `capacitor.config.ts` 的 Bundle ID。旧的 `iosAppName` 字段已确认**无任何代码消费**（iOS 显示名硬编码在 `ios/App/App/Info.plist`），属死配置，不要再依赖它。

> **iframe 项目链接优先级**：非空 `projectUrl` 直接作为 iframe 链接；为空时回退为 `${baseUrl}/app/ttcEngineDefalut?ttcVersion=...&projectOID=...` 拼接。两种情况统一追加 `userOID`、`access_token`、`lang`。逻辑集中在 `src/utils/projectUrl.js` 的 `buildProjectUrl()`，Login 和 ProjectView 共用，勿在页面内重复拼接。

### 新增变体步骤

1. 在 `variants.mjs` 的 `variants` 对象中添加一个新配置块
2. 在 `package.json` 的 `scripts` 中添加对应的 `build:*`、`dev:*`、`android:*` 命令
3. 如需不同图标，在 `android/app/src/` 下新建图标资源目录并在 `iconDir` 中引用

### 构建流程

`build-variant.mjs` 按顺序执行（`render()` 遍历 cfg 替换 `{{key}}`）：
1. 从 `variants.mjs` 读取变体配置
2. 生成 `urlValues.js`
3. 生成 `capacitor.config.ts`
4. 生成 `android/app/build.gradle`（`applicationId` = `{{appId}}`）
5. 生成 Android `strings.xml`（三语言）+ 从变体对应的 `iconDir` 复制图标到 `main/res/`
6. `--dev` 模式到此停止；非 dev 模式继续执行 `vite build` + `cap sync`

## 开发命令

```sh
pnpm install          # 安装依赖
npx vite              # 启动开发服务器（HMR，走 Vite 代理）

# 变体构建（一条命令完成配置生成 + 构建 + cap sync）
pnpm build:hongsuyun-prod     # 弘塑云 生产-国际
pnpm build:hongsuyun-cn       # 弘塑云 生产-国内
pnpm build:hongsuyun-test     # 弘塑云 测试
pnpm build:hongshehui-prod    # 弘设汇 生产
pnpm build:hongshehui-test    # 弘设汇 测试

# 开发模式（只生成配置和复制资源，不执行 vite build 和 cap sync）
pnpm dev:hongsuyun-cn         # 然后手动 npx vite
pnpm dev:hongsuyun-test       # 然后手动 npx vite
pnpm dev:hongshehui-test

# 一键生成 + 打开 Android Studio（连接真机测试）
pnpm android:hongsuyun-prod
pnpm android:hongsuyun-test
pnpm android:hongshehui-prod
pnpm android:hongshehui-test

# 手动构建
npx vite build        # 构建生产版本到 dist/
npx cap sync          # 同步 Capacitor 配置到 Android/iOS
npx cap open android  # 在 Android Studio 中打开
npx cap open ios      # 在 Xcode 中打开

# 查看所有变体
node scripts/build-variant.mjs --list
```

## Vite 代理配置

开发时 `/api` 前缀的请求代理到**当前生成的 `urlValues.js` 中的 `baseUrl`**（`vite.config.js` 启动时动态读取，与当前变体环境一致），自动添加 `yujiang-from-app: true` 请求头。`urlValues.js` 未生成时回退到测试环境 `http://1.82.232.147:8209`。

Web 端 API 请求统一走 `src/utils/webFetch.js`：dev 模式直走代理（避免浏览器跨域），生产构建先直连、CORS 不通时回退代理。**注意**：在浏览器本地调试生产变体时也会走代理，生产环境直接请求仍会显示跨域是正常现象（已被代理兜底）。

## 关键注意事项

- **变体构建**: 所有变体共用同一套代码，通过 `variants.mjs` + `build-variant.mjs` 切换。修改配置只需改 `variants.mjs` 和对应的 `.template.*` 文件
- **模板文件**: `*.template.*` 文件是源文件（提交到 Git），生成的同名文件（去掉 `.template`）已加入 `.gitignore`
- **Android 模板位置**: `android/app/templates/`（在 `res/` 外面，避免 Android 构建误编译导致 Duplicate resources）
- **Android 包名**: 来自 `variants.mjs` 的 `appId`（经 `build.gradle.template` 注入 `applicationId`），不是写死在 build.gradle；改包名只改 `variants.mjs`
- **版本更新渠道化**: 更新按 `variants.mjs` 的 `updateChannel` 分流——`play`（仅 hongsuyun-prod）走 Google Play In-app Updates（`PlayUpdatePlugin`），`store` 变体点「立即更新」用系统浏览器打开后端 `updateUrl`。改更新逻辑涉及 `appUpdater.js`（`confirmUpdate` 分发）与 `PlayUpdatePlugin.java` **两端需同步改**，详见「核心架构模式 §4」（含 play-core 2.x `installStatus` 派生 / Capacitor `requestCodes` 两个适配点）
- **keep-alive**: ProjectView 被缓存，切换页面后保持 iframe 状态不丢失
- **导航栏标题**: `ProjectView.vue` 通过 `navProjectTitles` + 当前 locale 动态渲染，支持三语言
- **App 桌面名称**: Android 通过 `values/strings.xml` + `values-zh-rTW/strings.xml` + `values-en/strings.xml` 实现随系统语言切换
- **token 存储**: 仅在内存中，刷新/重启需重新登录（除非自动登录启用）
- **原生 vs Web**: `authRequest` 在原生平台走 `CapacitorHttp`，Web 端走 `fetch`
- **WebSocket**: 登录时建立，用于多设备互踢；登出/强制登出时关闭
- **Vant 组件**: 在 `main.js` 中按需注册，不要直接在页面中 import Vant 组件
- **StatusBar**: 颜色在 `router.afterEach` 中根据路由动态设置
- **安全区兜底**: 顶部栏避开状态栏靠 `App.vue` 全局 CSS，用 `var(--safe-area-inset-top, env(...))`，**不要只用 `env(safe-area-inset-top)`**（Android 无刘海机型返回 0）。详见「核心架构模式 §7」
- **扫码前必须**: 检查/请求相机权限，停止后需移除 listener 和 `barcode-scanning` class
