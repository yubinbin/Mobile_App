# 二维码扫码功能 — 可行性验证设计

## 背景

在 Vue 3 + Vant + Capacitor 混合移动应用架构下，验证二维码扫码功能的可行性。当前应用通过 iframe 加载云端项目页面，需要支持原生相机扫码能力。

## 技术选型

采用 `@capacitor-mlkit/barcode-scanning`（Google ML Kit 驱动，Capacitor 团队官方维护）。

- **依赖**：Google Play Services（国内大部分手机已预装）
- **Capacitor 版本兼容**：8.x（当前项目 8.3.4）

## 安装步骤

```bash
npm install @capacitor-mlkit/barcode-scanning
npx cap sync android
```

在 `android/app/src/main/AndroidManifest.xml` 中添加：

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## 架构设计

### 文件变更

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/pages/QrScanner.vue` | 扫码页面 |
| 修改 | `src/router/index.js` | 添加 `/qr-scanner` 路由 |
| 修改 | `src/main.js` | 注册新页面使用的 Vant 组件（如有） |
| 修改 | `src/pages/ProjectView.vue` | 导航栏添加扫码入口图标 |
| 修改 | `android/app/src/main/AndroidManifest.xml` | 声明相机权限 |

### 入口设计

项目页（`ProjectView.vue`）导航栏右侧，用户头像旁新增扫码图标，点击跳转到扫描页。

### 结果传递

```
扫码成功 → localStorage.setItem('qr_result', result)
         → router.back()
         → 发起页在需要时从 localStorage 读取并清除
```

## 扫码页面设计

### 页面结构

- 顶部：深色 NavBar，左侧返回按钮，标题"扫描二维码"，右侧手动输入按钮
- 中央：全屏相机预览 + 扫描框 + 四角角标
- 底部：提示文字"将二维码放入框内即可扫描"
- 浮动按钮：手电筒开关

### 生命周期

```
onMounted → 请求相机权限
  ├─ 已授权 → startScan() → 注册 barcodeScanned 监听
  ├─ 未授权 → 弹权限对话框 → 允许/拒绝
  └─ 无相机 → 错误提示 → 返回

扫描成功 → 存入 localStorage → router.back()

onUnmounted → stopScan() → removeAllListeners()
```

### 权限处理

- **已授权**：直接启动扫描
- **被拒绝**：Toast 提示"需要相机权限才能扫码"，提供手动输入兜底
- **设备无相机**：显示错误页，返回上一页

### 手动输入兜底

导航栏右侧"手动输入"按钮，点击弹出 `van-dialog`，用户可手动输入二维码编码。

## 错误处理

| 场景 | 处理 |
|------|------|
| 用户拒绝相机权限 | Toast + 提供手动输入 |
| 相机启动失败 | Toast + 手动输入兜底 |
| 扫描超时（30秒） | 自动停止，提示"未检测到二维码" |
| 解码失败 | 静默忽略，继续扫描 |
| 从后台切回 | 自动恢复扫描 |
| 手电筒不可用 | 隐藏手电筒按钮 |

## 测试验证

### 验证清单

1. `npm install` + `npx cap sync` 成功，Android 编译通过
2. 点击扫码图标 → 进入扫码页 → 相机预览正常
3. 对准二维码 → 识别成功 → 结果回传
4. 手电筒开关 → 正常
5. 返回键 → 正确释放相机
6. 手动输入 → 功能正常

### 验证方式

- 另一台手机 / 电脑生成测试二维码（URL、纯数字、中文文本）
- Android 真机部署测试（`npx cap open android`）
