## Context

本仓库用 `variants.mjs`（唯一配置源）+ `scripts/build-variant.mjs`（渲染引擎）管理 5 个变体，一条命令完成「配置生成 → 资源复制 → `vite build` → `cap sync`」。但这套体系此前**只覆盖 Android**：

| 维度 | Android | iOS（变更前） |
|------|---------|---------------|
| 包名 | `build.gradle.template` 注入 `applicationId` | `project.pbxproj` 硬编码 `com.tmiot.tpc` |
| 版本号 | `{{versionCode}}` / `{{appVersion}}` | pbxproj 硬编码 `MARKETING_VERSION = 4.1.14` / `CURRENT_PROJECT_VERSION = 1` |
| 显示名 | 三语言 `strings.xml` 模板 | `Info.plist` 硬编码「弘塑云」；仅 `en.lproj/InfoPlist.strings` = `"TPC"` |
| 图标 | `iconDir` 三套自动复制 | 单张 1024 图，手改 |
| 推送 | `manifestPlaceholders JPUSH_PKGNAME` | `AppDelegate` **无任何转发代码** |

两个既存约束决定了设计走向：

1. **`project.pbxproj` 是 Xcode 的活文件**——改签名、加文件、调 Build Settings 都会重写它，不能当静态模板对待。
2. **两端构建时机不同**——Android 在 Windows 上构建并提交生成物不入库，iOS 在 Mac / Xcode Cloud 上构建（`ios/App/ci_scripts/ci_pre_xcodebuild.sh`）。当前机器上 Android 生成物停留在 `hongshehui-prod`，而 iOS 工程停留在 `hongsuyun-cn`，印证了这一点。

同时，iOS 推送处于**完全不可用**状态：`capacitor-plugin-jpushn@6.0.7` 的 `JPushPlugin.swift:37-40` 观察 `capacitorDidRegisterForRemoteNotifications` / `capacitorDidFailToRegisterForRemoteNotifications` / `didBecomeActiveNotification` 三个通知，而 `AppDelegate.swift` 一个都不投递，且 pbxproj 中无 `CODE_SIGN_ENTITLEMENTS`、无 `SystemCapabilities`，Push Notifications capability 从未开启。

## Goals / Non-Goals

**Goals:**

- iOS 原生配置（包名、版本号、显示名）纳入 `variants.mjs` 驱动，与 Android 一样「改配置不改工程」
- 修复 iOS 推送断链：AppDelegate 投递 jpushn 所需的三个通知
- iOS 版本号可独立于 Android，避免被 Android 发版节奏拖成版本倒退
- 明确「哪些文件是生成物、哪些是权威源」，并让 `CLAUDE.md` 与代码一致

**Non-Goals:**

- iOS 图标多套化（需 Asset Catalog + pbxproj 资源关联，收益/成本比差，本次不做）
- `zh-Hans` / `zh-Hant` 本地化（需改 pbxproj 的 `knownRegions` 与 variant group，风险高于收益）
- Push Notifications capability 的脚本化（属签名配置，且需 Apple 开发者后台配合，保留人工）
- 改动 `hongsuyun-cn` 的 `appDisplayNameEn`（当前值为中文 `'弘塑云'`，属既有业务配置）

## Decisions

### D1：AppDelegate 用「整文件模板」而非「精准注入」

`ios/App/App/templates/AppDelegate.swift.template` 承载完整文件内容，渲染后整体覆盖生成物。

| 方案 | 结论 |
|------|------|
| **整文件模板（选中）** | 与 Android `build.gradle.template` 完全同构；结果确定、无正则脆弱性；重复执行天然幂等 |
| 精准注入（正则插入代码块） | 需处理「已存在则跳过」的幂等判断，正则脆弱，且首次/二次执行路径不同 |
| 不模板化，手改 AppDelegate | 与「变体切换不改工程」的目标直接冲突，退回原问题 |

代价：在 Xcode 里手改 `AppDelegate.swift` 会被下次构建覆盖。以三重手段对冲——模板头部警示注释、生成物加入 `.gitignore`、`CLAUDE.md` 显式说明。

### D2：pbxproj 只做值替换，不做整文件模板

替换范围为三个键的赋值行（Debug / Release 共 6 处），正则 `KEY = [^;\n]+;` 全局替换：

```
PRODUCT_BUNDLE_IDENTIFIER = <appId>;
MARKETING_VERSION         = <iosMarketingVersion ?? appVersion>;
CURRENT_PROJECT_VERSION   = <iosBuildNumber ?? versionCode>;
```

| 方案 | 结论 |
|------|------|
| **值替换（选中）** | 幂等、可反复执行；Xcode 改写工程结构后仍有效；不承担维护整份 pbxproj 的负担 |
| 整文件模板化 | pbxproj 被 Xcode 频繁重写，模板一旦过期，下次构建即覆盖丢掉全部工程设置——灾难级 |
| 不改 pbxproj，继续手改 | 切变体时容易发错包/错版本号，正是本次要消除的风险 |
| 引入 xcconfig + `$(VAR)` 间接 | 更符合 iOS 惯例，但需在 pbxproj 中为 Debug/Release 各挂一个 `baseConfigurationReference`，改动面反而更大 |

选择 `[^;\n]+` 而非 `[^;]+`：后者会跨行匹配到下一个分号，可能吞掉无关内容。

### D3：iOS 版本号引入独立可选字段

新增 `iosMarketingVersion` / `iosBuildNumber`，缺省回退 `appVersion` / `versionCode`。

**这不是「顺手加的字段」，而是必需**：pbxproj 现有 `MARKETING_VERSION = 4.1.14`，而 `hongsuyun-cn` 的 `appVersion` 是 `4.1.4`——若直接套用，构建出的包版本号将从 4.1.14 掉回 4.1.4，**App Store 会直接拒绝上传**。因此 `hongsuyun-cn` 显式配置 `iosMarketingVersion: '4.1.14'`。

不选「统一用 appVersion 并同步调大」：那会把 iOS 与 Android 的发版节奏焊死，任一端发版都要迁就另一端。

### D4：显示名采用「Info.plist 兜底 + en 覆盖」两文件方案

`CFBundleDisplayName` 在 `Info.plist` 中取 `appDisplayNameZhCN`；`en.lproj/InfoPlist.strings` 取 `appDisplayNameEn`。iOS 的查找规则决定了：英文系统命中 `en.lproj` 覆盖值，其他语言回退 `Info.plist` 值。

不选三语全加（`zh-Hans` / `zh-Hant` / `en`）：新增语言目录必须同步修改 pbxproj 的 `knownRegions` 与 `PBXVariantGroup` children，手改工程文件的风险远大于收益。代价是繁体系统会显示简体名（Android 侧可区分），已在 `CLAUDE.md` 与 proposal 的非目标中记录。

### D5：iOS 生成物入 `.gitignore`，pbxproj 保留入库

与 Android 侧约定对齐。需注意 iOS 三个生成物**历史上已被 git 跟踪**，`.gitignore` 对已跟踪文件无效，必须配合 `git rm --cached` 才生效（`git check-ignore` 已验证：当前无输出）。Android 侧生成物本就是未跟踪状态，可作对照。

## Risks / Trade-offs

- **克隆后无 `Info.plist`，Xcode 打不开工程** → `.gitignore` 注释块与 `CLAUDE.md` 双重载明「须先跑一次 `pnpm build:<variant>` / `pnpm dev:<variant>`」；Android 侧 `build.gradle` 同理，属既有约定
- **Xcode 手改 AppDelegate 被静默覆盖** → 模板头部醒目警示 + 生成物入 `.gitignore`；`CLAUDE.md` 明示「改 AppDelegate 请改模板」
- **pbxproj 正则误伤** → 限定为 `KEY = [^;\n]+;`，只匹配赋值行；已用 `diff` 验证构建前后差异仅落在 6 行，且与介入前逐字节一致
- **iOS 版本号回退导致上架被拒** → 独立字段 + `CLAUDE.md` 中「回退会让版本号倒退、App Store 拒绝上传」的显式警告
- **未开 capability 时静默失败** → 转发注册失败通知，使问题可诊断；文档把 capability 列为硬前置
- **注入推送逻辑时误删 Capacitor 代理调用** → 规格中以独立 requirement 固化 `ApplicationDelegateProxy` 的 URL / Universal Links 转发必须保留
- **`en.lproj/InfoPlist.strings` 值由 `"TPC"` 变为 `appDisplayNameEn`** → 对 `hongsuyun-cn` 该字段值为中文 `'弘塑云'`，英文系统将显示中文名；属既有配置，已记录待业务确认

## Migration Plan

1. 新增三个 iOS 模板文件（不触动现有生成物行为）
2. 修改 `build-variant.mjs` 新增步骤 6 / 7，原构建步骤顺延为 8
3. `variants.mjs` 增加两个可选字段并给 `hongsuyun-cn` 填 `iosMarketingVersion: '4.1.14'`
4. `.gitignore` 追加 iOS 生成物段
5. 执行 `node scripts/build-variant.mjs <variant> --dev` 验证；对两个不同变体各验一轮
6. 执行 `git rm --cached` 三个生成物，使命中 `.gitignore`
7. 在 Xcode 完成 capability 配置与 `JPUSHService.h` 的 Target Membership 设置
8. 真机验证推送（需 Xcode Cloud 或 Mac 环境）

**回滚**：`project.pbxproj` 已于实施前备份（`.workbuddy/tmp/project.pbxproj.bak-*`），可用 `git checkout -- ios/App/App.xcodeproj/project.pbxproj` 恢复；模板文件与脚本改动均为纯新增/追加，`git revert` 对应提交即可。**注意**：三个 iOS 生成物在 `git rm --cached` 之后不可再用 `git checkout --` 恢复（工作区文件仍在，重跑构建即可再生）。

## Open Questions

1. 其余四个变体（`hongsuyun-prod` / `hongsuyun-test` / `hongshehui-prod` / `hongshehui-test`）的 iOS 版本号与 Bundle ID 是否需要单独指定？目前除 `hongsuyun-cn` 外均走回退。
2. `ios/App/ci_scripts/ci_pre_xcodebuild.sh:13` 硬编码 `pnpm build:hongsuyun-cn`，Xcode Cloud 上无论构建哪个 App 都跑国内版变体——是否纳入后续变更参数化？
3. `ios/App/App copy-Info.plist` 疑似冗余文件（Xcode 工程中可能仍挂着引用），需要确认是否存在，以及是否应一并清理。
4. iOS 图标多套化与 `zh-Hans` / `zh-Hant` 本地化是否需要排期？
