# 版本更新静态下载页面 - 设计文档

## 概述

一个独立的纯静态 HTML 文件，部署到 Web 服务器上，作为应用版本更新流程的目标页面。当 `appUpdater.js` 调用 `window.open(info.updateUrl, '_system')` 时在系统浏览器中打开。

## URL 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `version` | 是 | 新版本号，如 `1.2.0` |
| `changelog` | 否 | 更新日志文本，支持 `\n` 换行 |
| `downloadUrl` | 是 | Android APK 下载地址 |
| `iosUrl` | 否 | iOS App Store 链接 |

示例：
```
https://example.com/download.html?version=1.2.0&downloadUrl=https://...&iosUrl=https://...&changelog=修复了xxx%0A新增了xxx
```

## 页面结构

### 布局（从上到下）

1. **Logo 区域** — App 图标（内嵌 SVG/base64），下方品牌名称
2. **版本信息** — "发现新版本 v1.2.0"
3. **更新日志卡片** — 白色卡片，列出 changelog 内容，无 changelog 时隐藏
4. **下载按钮** — 蓝色主按钮，根据设备自动切换文案和行为
5. **底部提示** — 灰色小字安全提示

### 设备检测与下载行为

| 平台 | 按钮文案 | 点击行为 | 降级方案 |
|------|---------|---------|---------|
| Android | "下载 Android 版" | 直接下载 APK（`downloadUrl`） | 无 |
| iOS | "前往 App Store" | 跳转 App Store（`iosUrl`） | 若无 `iosUrl` 则降级到下载按钮 |
| 其他 | 显示两个按钮 | 分别提供 Android 和 iOS 下载入口 | 无 |

### 视觉风格

- 主色调：`#006dd8`（与 App 一致）
- 背景：白色
- 布局：垂直居中，移动端优先
- 字体：系统默认字体栈
- 最大宽度：420px，水平居中

## 技术实现

- 单文件 HTML，包含内嵌 CSS 和 JS
- 零外部依赖（不引入任何框架或库）
- 使用 `navigator.userAgent` 检测设备平台
- 使用 `<meta name="viewport">` 适配移动端
- 文件位置：项目根目录 `/public/download.html`（构建时直接复制到 dist）

## 页面交互

1. 页面加载 → 解析 URL 参数 → 渲染页面
2. 参数缺失时显示错误提示（缺少 version/downloadUrl）
3. 点击下载按钮 → Android 触发下载 / iOS 跳转 App Store
4. 下载开始后按钮文案变为"下载已开始，请查看通知栏"
