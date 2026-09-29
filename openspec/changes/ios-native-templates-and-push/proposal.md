## Why

iOS 原生工程是变体构建体系的盲区。`variants.mjs` + `scripts/build-variant.mjs` 只注入 Android 侧的包名、版本号、显示名与图标，iOS 侧的 `Info.plist`、Bundle ID、`MARKETING_VERSION` 全部硬编码——切变体后必须在 Xcode 手工同步，容易发错包、发错版本号。

更严重的是 iOS 推送是断的：`capacitor-plugin-jpushn` 依赖 AppDelegate 转发三个通知（注册成功 / 注册失败 / `didBecomeActiveNotification`），而现有 `AppDelegate.swift` 一个都没有，插件观察者永远收不到，iOS 端拿不到 deviceToken，推送功能实际不可用。

## What Changes

- 新增 iOS 模板目录 `ios/App/App/templates/`，与 `android/app/templates/` 同构：
  - `AppDelegate.swift.template`——整文件模板，内嵌 jpushn 要求的三段通知转发
  - `Info.plist.template`——`CFBundleDisplayName` ← `{{appDisplayNameZhCN}}`
  - `InfoPlist.strings.template.en`——英文系统显示名 ← `{{appDisplayNameEn}}`
- `scripts/build-variant.mjs` 新增两个步骤，原有构建步骤顺延：
  - 步骤 6：渲染上述三个模板到 `ios/App/App/` 对应位置
  - 步骤 7：**精准值替换** `ios/App/App.xcodeproj/project.pbxproj` 的 `PRODUCT_BUNDLE_IDENTIFIER` / `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`（Debug + Release 共 6 处）
- `variants.mjs` 新增两个可选字段 `iosMarketingVersion` / `iosBuildNumber`，不填时回退 `appVersion` / `versionCode`；`hongsuyun-cn` 显式设为 `4.1.14` / `1`
- `.gitignore` 追加 iOS 三个生成物
- `CLAUDE.md` 同步：项目结构树、字段说明、构建流程 1–8、iOS 推送前置条件

**非目标**（本变更明确不做）：
- iOS 图标多套化——需 Asset Catalog + pbxproj 资源关联，成本高
- `zh-Hans` / `zh-Hant` 本地化——需改 pbxproj 的 `knownRegions` 与 variant group
- Xcode Push Notifications capability 的脚本化——属签名配置，保留人工在 Xcode 操作

## Capabilities

### New Capabilities
- `ios-variant-build`: iOS 原生工程配置（Bundle ID、版本号、桌面显示名）由 `variants.mjs` + `build-variant.mjs` 单命令注入，与 Android 变体构建对齐，并明确 pbxproj 的「值替换而非整文件模板」边界
- `ios-push-notifications`: iOS 端把系统远程通知回调转发给 `capacitor-plugin-jpushn`，使 JS 侧可通过该插件取得 deviceToken、感知注册失败、并在前台激活时上报

### Modified Capabilities
无——`openspec/specs/` 当前为空，本变更为该仓库首次引入规格。

## Impact

**新增**
- `ios/App/App/templates/AppDelegate.swift.template`
- `ios/App/App/templates/Info.plist.template`
- `ios/App/App/templates/InfoPlist.strings.template.en`

**修改**
- `scripts/build-variant.mjs`（新增步骤 6、7）
- `variants.mjs`（新增两个可选字段；`hongsuyun-cn` 显式配置 iOS 版本号）
- `.gitignore`（新增 iOS 生成物段）
- `CLAUDE.md`（文档同步）

**产物归属变化**
- 转为生成物并加入 `.gitignore`：`ios/App/App/AppDelegate.swift`、`ios/App/App/Info.plist`、`ios/App/App/en.lproj/InfoPlist.strings`
- 仍入库、仅被值替换：`ios/App/App.xcodeproj/project.pbxproj`

**依赖与外部前置**
- 依赖 `capacitor-plugin-jpushn@6.0.7`、`@capacitor/ios@8.4.1`
- 人工前置：Xcode 为 target 开启 Push Notifications capability 并生成 `App.entitlements`；Apple 开发者后台为每个 Bundle ID 单独开通推送能力；`JPUSHService.h` 的 Target Membership 设为 `CapacitorPluginJPush` / `Public`

**协作影响**
- 克隆仓库后须先执行一次 `pnpm build:<variant>` 或 `pnpm dev:<variant>`，否则缺 `Info.plist` 会导致 Xcode 无法打开工程
- Android 生成物本就是未跟踪状态；iOS 三个生成物历史上已被 git 跟踪，需 `git rm --cached` 后 `.gitignore` 才生效
