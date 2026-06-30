# CLAUDE.md — Mobile App 项目概况与开发指南

## 项目概述

这是一个基于 **Vue 3 + Vite + Capacitor** 的混合移动应用（Android/iOS），核心功能是通过 WebView（iframe）加载远程 TTC 引擎页面，并提供原生能力支持（二维码扫描、版本更新等）。

- **App 名称**: 弘塑云 (HongSuYun) / 弘设汇 (HongSheHui)（通过 `urlValues.js` 切换变体）
- **包名**: `cn.com.tmiot.tpc`
- **当前版本**: v1.0.0
- **分支**: `tpc_v1.0`

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
src/
├── main.js                  # 入口：注册 Vant 组件、路由、全局 $t
├── App.vue                  # 根组件：keep-alive、手势返回、启动更新检查
├── router/index.js          # 路由配置 + 导航守卫（认证检查）
├── pages/
│   ├── Login.vue            # 登录页：用户名密码 + RSA 加密 + WebSocket 互踢
│   ├── ProjectView.vue      # 主页：iframe 加载远程页面 + 扫码功能
│   ├── UserInfo.vue         # 用户中心
│   └── About.vue            # 关于页
├── utils/
│   ├── auth.js              # 认证模块：token 管理、authRequest、WebSocket
│   ├── appUpdater.js        # 版本更新：检查、下载、安装 APK
│   ├── urlValues.js         # 环境配置：baseUrl、projectOID、appVersion、appName
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
- 接口：`GET https://manage.tmiot.com.cn/app/share/updateAppVersion?app=<name>&platform=<platform>`
- 支持可选更新（Vant ConfirmDialog）和强制更新（不可关闭的 Dialog）
- Android 原生下载安装（ApkInstaller 插件），其他平台降级为浏览器打开

### 5. 导航守卫

- `router.beforeEach` 检查认证状态
- `window.__forceLogout` 标志支持强制登出（WebSocket 互踢）
- `router.afterEach` 设置 StatusBar 颜色

### 6. 手势返回 / 系统返回键

- 左滑返回手势（`touchstart`/`touchend`）
- Android 返回键监听（`App.addListener('backButton', ...)`）
- ProjectView 页面内优先触发 iframe 内部返回（`history.back()`）
- 登录页和项目页的返回键触发 HomeSwipe（退到后台）

## 环境切换

`src/utils/urlValues.js` 中通过注释切换环境：

- **弘塑云 生产**（当前启用）：`http://47.236.252.168:8209`，projectOID=11024
- **弘塑云 测试**：`http://1.82.232.147:8209`，projectOID=10994
- **弘设汇 生产**：`https://tmplascloud.com`，projectOID=10238
- **弘设汇 测试**：`https://imro.tmiot.com.cn`，projectOID=10591

切换变体时还需修改：`appName`、Logo 图片、`capacitor.config.ts` 中的 `appName`。

## 开发命令

```sh
pnpm install          # 安装依赖
npx vite              # 启动开发服务器（HMR，走 Vite 代理）
npx vite build        # 构建生产版本到 dist/
npx cap sync          # 同步 Capacitor 配置到 Android/iOS
npx cap open android  # 在 Android Studio 中打开
npx cap open ios      # 在 Xcode 中打开
```

## Vite 代理配置

开发时 `/api` 前缀的请求代理到测试环境 `http://1.82.232.147:8209`，自动添加 `yujiang-from-app: true` 请求头。

## 关键注意事项

- **keep-alive**: ProjectView 被缓存，切换页面后保持 iframe 状态不丢失
- **token 存储**: 仅在内存中，刷新/重启需重新登录（除非自动登录启用）
- **原生 vs Web**: `authRequest` 在原生平台走 `CapacitorHttp`，Web 端走 `fetch`
- **WebSocket**: 登录时建立，用于多设备互踢；登出/强制登出时关闭
- **Vant 组件**: 在 `main.js` 中按需注册，不要直接在页面中 import Vant 组件
- **StatusBar**: 颜色在 `router.afterEach` 中根据路由动态设置
- **扫码前必须**: 检查/请求相机权限，停止后需移除 listener 和 `barcode-scanning` class
