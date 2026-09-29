# iOS 变体构建 — 规格

## ADDED Requirements

### Requirement: iOS 模板目录与 Android 同构

仓库 SHALL 在 `ios/App/App/templates/` 下提供三个模板文件，与 `android/app/templates/` 保持同构的「模板提交入库、生成物不入库」约定：

- `AppDelegate.swift.template`
- `Info.plist.template`
- `InfoPlist.strings.template.en`

模板文件 MUST 使用 `.template` 后缀，以确保不被 Xcode 编译。

#### Scenario: 模板文件存在且不被编译

- **WHEN** 检查 `ios/App/App/templates/` 目录
- **THEN** 三个 `.template` 文件均存在，且无任何 `.swift` 后缀文件

#### Scenario: 生成物与模板同构关系可辨识

- **WHEN** 打开任一生成物（如 `ios/App/App/AppDelegate.swift`）
- **THEN** 文件头部包含「由模板生成、请勿直接编辑、已加入 .gitignore」的说明注释

### Requirement: 单命令注入 iOS 原生配置

`scripts/build-variant.mjs` SHALL 在渲染 Android 文件之后、执行 `vite build` 之前，渲染 iOS 三个模板到对应目标路径，并替换 `project.pbxproj` 的包名与版本号。执行一次 `pnpm build:<variant>` 或 `pnpm dev:<variant>` MUST 足以让整个 iOS 工程切换到目标变体。

#### Scenario: 渲染目标路径正确

- **WHEN** 执行 `node scripts/build-variant.mjs <variant> --dev`
- **THEN** 日志依次输出三个 iOS 生成项，落点为 `ios/App/App/AppDelegate.swift`、`ios/App/App/Info.plist`、`ios/App/App/en.lproj/InfoPlist.strings`

#### Scenario: pbxproj 被替换的处数

- **WHEN** 执行一次变体构建
- **THEN** 日志报告 `project.pbxproj` 被替换 6 处（`Debug` 与 `Release` 各含三个 build setting）

#### Scenario: 模板缺失时不中断构建

- **WHEN** `project.pbxproj` 或某模板文件不存在
- **THEN** 脚本输出告警但 MUST NOT 以非零码退出，其余步骤照常执行

### Requirement: pbxproj 仅做值替换

对 `ios/App/App.xcodeproj/project.pbxproj` 的处理 MUST 限于替换三个 build setting 的赋值，MUST NOT 整文件模板化、MUST NOT 增删任何键、MUST NOT 改动文件结构或格式。

被替换的键为：

| 键 | 取值来源 |
|----|----------|
| `PRODUCT_BUNDLE_IDENTIFIER` | `appId` |
| `MARKETING_VERSION` | `iosMarketingVersion`，缺省回退 `appVersion` |
| `CURRENT_PROJECT_VERSION` | `iosBuildNumber`，缺省回退 `versionCode` |

替换 SHALL 幂等：对同一变体重复执行，文件内容 MUST 保持不变。

#### Scenario: 重复执行不产生漂移

- **WHEN** 对同一变体连续执行两次构建
- **THEN** `project.pbxproj` 与首次执行结果逐字节相同

#### Scenario: 仅赋值行发生变化

- **WHEN** 对比构建前后的 `project.pbxproj`
- **THEN** 差异仅落在上述三个键的赋值行，且行数与执行前一致

#### Scenario: Xcode 改写工程结构后仍可替换

- **WHEN** 在 Xcode 中增删文件或调整 Build Settings 后再次执行构建
- **THEN** 三个键的值仍被正确替换，工程结构改动未被回退

### Requirement: iOS 版本号可独立于 Android

变体配置 SHALL 支持可选字段 `iosMarketingVersion`（对应 `CFBundleShortVersionString`）与 `iosBuildNumber`（对应 `CFBundleVersion`）；未提供时 SHALL 回退到 `appVersion` / `versionCode`。

已上架的 App MUST 显式配置 `iosMarketingVersion`，以高于 App Store 当前版本的取值，避免版本号倒退导致上传被拒。

#### Scenario: 显式配置优先

- **WHEN** 变体同时提供 `appVersion` 与 `iosMarketingVersion`
- **THEN** pbxproj 的 `MARKETING_VERSION` 取 `iosMarketingVersion` 的值，`appVersion` 不被使用于 iOS 侧

#### Scenario: 缺省时回退 Android 版本号

- **WHEN** 变体未配置 `iosMarketingVersion` / `iosBuildNumber`
- **THEN** `MARKETING_VERSION` 取 `appVersion`、`CURRENT_PROJECT_VERSION` 取 `versionCode`

#### Scenario: 已知已上架变体保持既有版本

- **WHEN** 构建 `hongsuyun-cn` 变体
- **THEN** `MARKETING_VERSION` 为 `4.1.14`（而非其 `appVersion` 的 `4.1.4`）

### Requirement: iOS 显示名随变体变化

iOS 桌面显示名 SHALL 由变体配置注入：`Info.plist` 的 `CFBundleDisplayName` 取 `appDisplayNameZhCN` 作为回退值，`en.lproj/InfoPlist.strings` 的 `CFBundleDisplayName` 取 `appDisplayNameEn` 作为英文系统覆盖值。

#### Scenario: 中文系统显示中文名

- **WHEN** 设备系统语言为简体或繁体中文
- **THEN** 桌面显示 `Info.plist` 注入的 `appDisplayNameZhCN` 取值

#### Scenario: 英文系统显示英文名

- **WHEN** 设备系统语言为英文
- **THEN** 桌面显示 `en.lproj/InfoPlist.strings` 注入的 `appDisplayNameEn` 取值

#### Scenario: 切换变体后显示名跟随

- **WHEN** 先后构建两个 `appDisplayNameZhCN` 不同的变体
- **THEN** `Info.plist` 中的显示名相应变化，无需在 Xcode 手工修改

### Requirement: iOS 生成物与工程文件的入库边界

三个 iOS 生成物 MUST 列入 `.gitignore`：`ios/App/App/AppDelegate.swift`、`ios/App/App/Info.plist`、`ios/App/App/en.lproj/InfoPlist.strings`。

`ios/App/App.xcodeproj/project.pbxproj` MUST NOT 被忽略，因为脚本仅对其做值替换，它仍是工程的权威结构来源。

#### Scenario: 生成物被 git 忽略

- **WHEN** 对三个 iOS 生成物执行 `git check-ignore`
- **THEN** 三者均被匹配到 `.gitignore` 中的 iOS 段

#### Scenario: 工程文件仍在版本控制内

- **WHEN** 对 `ios/App/App.xcodeproj/project.pbxproj` 执行 `git ls-files --error-unmatch`
- **THEN** 命令成功，文件处于跟踪状态

#### Scenario: 克隆后须先构建

- **WHEN** 新克隆仓库后未执行任何变体构建即尝试打开 iOS 工程
- **THEN** `CLAUDE.md` 与 `.gitignore` 注释中均载明「须先执行一次 `pnpm build:<variant>` 或 `pnpm dev:<variant>`」，否则缺 `Info.plist` 将导致 Xcode 无法打开工程
