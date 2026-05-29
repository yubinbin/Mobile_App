# 二维码扫码功能 — 正式业务实现设计

## 背景

在可行性验证基础上（`@capacitor-mlkit/barcode-scanning` 插件已安装、QrScanner.vue 已创建、权限已配置），将扫码功能接入实际业务流程：iframe 内触发的扫码请求通过 postMessage 传递，扫码结果以 CustomEvent 回传。

## 数据流

```
iframe (tmx.tmiot.com.cn)        Vue App (keep-alive)         QrScanner
     │                                │                          │
     │──postMessage─────────────────→│                          │
     │  {action:'scanCode'}          │                          │
     │                               │──router.push────────────→│ 扫码页
     │                               │  (ProjectView 保持存活)   │
     │                               │                          │
     │                               │     dispatchEvent        │
     │                               │←──{detail:result}────────│
     │                               │                          │ router.back()
     │                               │                          │
     │←──postMessage─────────────────│                          │
     │  {action:'scanCodeResult',    │                          │
     │   data:{result:'IMEI:xxx'}}   │                          │
```

## 架构设计

### App.vue 改动

`<router-view>` 外包裹 `<keep-alive :include="['ProjectView']">`，确保 ProjectView 在路由跳转到 QrScanner 时保持存活，持续监听 window 事件。

### ProjectView 改动

**新增：**

1. 监听 iframe 发来的 `message` 事件（校验 `origin === 'https://tmx.tmiot.com.cn'`），收到 `{ action: 'scanCode' }` 时 `router.push('/qr-scanner')`
2. 监听 QrScanner 发来的 `CustomEvent('scanCodeResult')`，拿到结果后通过 `iframeRef.value.contentWindow.postMessage({ action: 'scanCodeResult', data: { result } }, origin)` 回传给 iframe
3. onUnmounted 时注销两个事件监听器

**移除：**

1. 导航栏扫码图标入口（`van-icon name="scan"`）
2. `goScan` 函数和相关 CSS

### QrScanner 改动

**新增：**

1. 扫码成功后 `window.dispatchEvent(new CustomEvent('scanCodeResult', { detail: rawValue }))` + `router.back()`

**移除：**

1. 底部左侧手动输入按钮及相关函数
2. 底部右侧关闭按钮（NavBar 的返回箭头已足够）
3. localStorage 写入（不再需要）

**保留：**

1. 相机权限检查与请求
2. 手电筒开关（底部居中）
3. 30秒扫描超时
4. 生命周期管理（isMounted 守卫、cleanup 清理）
5. 扫描提示文字

### 页面布局变化

```
之前：                              之后：
┌─────────────────────────┐        ┌─────────────────────────┐
│  ← 返回   扫描二维码  手动│       │  ← 返回     扫描二维码     │
├─────────────────────────┤        ├─────────────────────────┤
│          相机预览         │       │          相机预览         │
│                         │        │                         │
│ 将二维码放入框内即可扫描   │       │ 将二维码放入框内即可扫描   │
│                         │        │                         │
├─────────────────────────┤        ├─────────────────────────┤
│ [手动]  [💡]  [返回]   │        │        [💡 手电筒]      │
└─────────────────────────┘        └─────────────────────────┘
```

## 错误处理

| 场景 | 处理 |
|------|------|
| 用户拒绝相机权限 | Toast 提示，dispatch 空结果 `{ result: '' }` 回 iframe，返回 |
| 相机启动失败 | Toast 提示，dispatch 空结果返回 |
| 扫描超时（30秒） | Toast 提示"未检测到二维码"，dispatch 空结果返回 |
| 用户主动返回（未扫码） | 不 dispatch 事件，直接返回 |
| iframe 未加载时 postMessage | iframeRef 为 null 时静默忽略 |
| 非目标域名 message | origin 校验拒绝（`!== 'https://tmx.tmiot.com.cn'`）|
| 手电筒不可用 | 捕获异常隐藏按钮 |

## 文件变更

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `src/App.vue` | keep-alive 缓存 ProjectView |
| 修改 | `src/pages/ProjectView.vue` | message 监听 + scanCodeResult 监听 + 去掉扫码图标 |
| 修改 | `src/pages/QrScanner.vue` | 去掉手动输入 + dispatchEvent 替代 localStorage |

## 测试验证

1. iframe 内点击扫码按钮 → ProjectView 收到 scanCode → 打开扫码页
2. 扫描二维码 → dispatch scanCodeResult → iframe 收到包含正确 IMEI 的结果
3. 拒绝相机权限 → Toast 提示 → dispatch 空结果 → iframe 收到 `{ result: '' }`
4. 扫码中按返回键 → 回到 ProjectView → iframe 保持原状态不刷新
5. 非 tmx.tmiot.com.cn 发来的 postMessage → 被 origin 校验拦截
6. 手电筒开关正常工作
