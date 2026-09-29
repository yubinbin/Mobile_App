# iOS 推送通知桥接 — 规格

## ADDED Requirements

### Requirement: 注册成功回调转发

`AppDelegate` SHALL 实现 `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`，并把 `deviceToken` 通过 `NotificationCenter` 以 `.capacitorDidRegisterForRemoteNotifications` 为名投递，object 为 `deviceToken`。

该转发是 `capacitor-plugin-jpushn` 取得 deviceToken 的唯一途径：插件以同名观察者接收该通知，缺少时 JS 侧永远无法完成设备注册。

#### Scenario: 注册成功后插件可收到 deviceToken

- **WHEN** 系统注册远程通知成功并回调 `didRegisterForRemoteNotificationsWithDeviceToken`
- **THEN** 投递名为 `capacitorDidRegisterForRemoteNotifications` 的通知，`object` 为该 `deviceToken`

#### Scenario: 通知名与插件观察者一致

- **WHEN** 核对 `AppDelegate.swift` 与 `JPushPlugin.swift` 的通知名
- **THEN** 二者均为 `capacitorDidRegisterForRemoteNotifications`，无拼写或大小写差异

### Requirement: 注册失败回调转发

`AppDelegate` SHALL 实现 `application(_:didFailToRegisterForRemoteNotificationsWithError:)`，并把 `error` 通过 `NotificationCenter` 以 `.capacitorDidFailToRegisterForRemoteNotifications` 为名投递，object 为 `error`。

#### Scenario: 注册失败可被诊断

- **WHEN** 系统注册远程通知失败（模拟器、无网络或未开启推送能力）
- **THEN** 投递名为 `capacitorDidFailToRegisterForRemoteNotifications` 的通知，`object` 为对应 `Error`

### Requirement: 前台激活通知转发

`AppDelegate` 的 `applicationDidBecomeActive(_:)` SHALL 投递名为 `didBecomeActiveNotification` 的通知；极光 SDK 依赖该信号在前台激活时执行上报与 badge 处理。

#### Scenario: 应用回到前台时投递通知

- **WHEN** 应用从后台或非活跃状态回到活跃状态
- **THEN** 投递 `Notification.Name(rawValue: "didBecomeActiveNotification")` 通知，`object` 为 `nil`

#### Scenario: 原有行为不被移除

- **WHEN** 检查 `applicationDidBecomeActive(_:)` 实现
- **THEN** 原有的「恢复被暂停任务」注释说明与新增的通知投递语句并存

### Requirement: Capacitor 原生代理调用保持完整

在注入推送转发逻辑的同时，`AppDelegate` MUST 保留 `ApplicationDelegateProxy.shared` 对 URL 打开与 Universal Links（`continue userActivity`）的转发调用；推送能力 MUST NOT 以牺牲既有 Capacitor 插件桥接为代价。

#### Scenario: URL 打开转发仍然存在

- **WHEN** 应用被 URL 唤起
- **THEN** 调用 `ApplicationDelegateProxy.shared.application(_:open:options:)` 并返回其结果

#### Scenario: Universal Links 转发仍然存在

- **WHEN** 应用被 Universal Link 唤起
- **THEN** 调用 `ApplicationDelegateProxy.shared.application(_:continue:restorationHandler:)` 并返回其结果

### Requirement: AppDelegate 由模板生成

`ios/App/App/templates/AppDelegate.swift.template` SHALL 是 `ios/App/App/AppDelegate.swift` 的唯一编辑入口。三段通知转发 MUST 同时存在于模板中，以整文件渲染方式生成，避免逐次注入造成重复或遗漏。

#### Scenario: 三段转发同时存在

- **WHEN** 检查生成的 `AppDelegate.swift`
- **THEN** `didRegisterForRemoteNotificationsWithDeviceToken`、`didFailToRegisterForRemoteNotificationsWithError` 两个方法定义与 `applicationDidBecomeActive` 内的通知投递语句均存在，且各仅出现一次

#### Scenario: 重复构建不产生重复注入

- **WHEN** 对同一变体连续执行两次构建
- **THEN** 生成文件中三段逻辑仍各只有一处，不出现重复方法定义

#### Scenario: 直接编辑生成物无效

- **WHEN** 直接编辑 `ios/App/App/AppDelegate.swift` 后执行一次构建
- **THEN** 该文件被模板渲染结果覆盖，直接编辑的内容丢失

### Requirement: 推送能力配置为人工前置并明确记录

`CLAUDE.md` SHALL 记录启用 iOS 推送所需的人工前置条件，并明确声明「代码注入到位不等于可接收推送」：

1. 在 Xcode 中为 target 开启 **Push Notifications** capability 并生成 `App.entitlements`
2. 在 Apple 开发者后台为每个 Bundle ID 单独开通 Push Notifications 能力
3. 将 `JPUSHService.h` 的 Target Membership 设为 `CapacitorPluginJPush`、访问级别为 `Public`

上述步骤 MUST NOT 由构建脚本代管。

#### Scenario: 文档载明前置条件

- **WHEN** 阅读 `CLAUDE.md` 的 iOS 推送条目
- **THEN** 上述三项人工前置条件均被列出，并说明缺少任一条件时 `didRegisterForRemoteNotificationsWithDeviceToken` 不会被系统回调

#### Scenario: 能力未开启时不产生误导性成功

- **WHEN** 未开启 Push Notifications capability 即运行应用
- **THEN** 不投递 `capacitorDidRegisterForRemoteNotifications` 通知，且注册失败通知可用以定位问题
