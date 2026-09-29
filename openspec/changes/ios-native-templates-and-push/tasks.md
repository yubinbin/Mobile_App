## 1. iOS 模板文件

- [x] 1.1 创建 `ios/App/App/templates/AppDelegate.swift.template`，内嵌 jpushn 所需的三段通知转发
- [x] 1.2 创建 `ios/App/App/templates/Info.plist.template`，`CFBundleDisplayName` 使用 `{{appDisplayNameZhCN}}`
- [x] 1.3 创建 `ios/App/App/templates/InfoPlist.strings.template.en`，英文显示名使用 `{{appDisplayNameEn}}`
- [x] 1.4 三个模板头部加入「由模板生成、请勿直接编辑、已加入 .gitignore」警示注释
- [x] 1.5 模板统一使用 `.template` 后缀，确保不被 Xcode 编译

## 2. 构建脚本改造

- [x] 2.1 `build-variant.mjs` 新增步骤 6：渲染三个 iOS 模板到 `ios/App/App/` 对应路径
- [x] 2.2 新增步骤 7：以正则 `KEY = [^;\n]+;` 精准替换 pbxproj 的三个 build setting 值
- [x] 2.3 原「构建」步骤顺延为步骤 8，`--dev` 模式短路行为保持不变
- [x] 2.4 模板或 pbxproj 缺失时降级为告警，不以非零码退出、不影响其余步骤
- [x] 2.5 替换处数在日志中报告（预期 6 处 = Debug/Release × 3 键）

## 3. 变体配置

- [x] 3.1 `variants.mjs` 支持可选字段 `iosMarketingVersion` / `iosBuildNumber`，缺省回退 `appVersion` / `versionCode`
- [x] 3.2 `hongsuyun-cn` 显式配置 `iosMarketingVersion: '4.1.14'`，避免版本号从 4.1.14 倒退至 4.1.4
- [x] 3.3 `variants.mjs` 文件头注释说明 iOS 版本号独立语义与版本倒退的后果

## 4. 入库边界

- [x] 4.1 `.gitignore` 追加 iOS 三个生成物
- [x] 4.2 `.gitignore` 注释块载明「克隆后须先执行一次变体构建，否则 Xcode 缺 Info.plist 无法打开工程」
- [x] 4.3 确认 `project.pbxproj` 不被忽略、仍处于 git 跟踪状态
- [x] 4.4 执行 `git rm --cached` 移除三个 iOS 生成物的跟踪，使 `.gitignore` 生效（`git check-ignore` 已验证命中 `.gitignore:58/59/60`；工作区文件保留）
- [x] 4.5 提交模板文件、脚本与配置改动（仅纳入本变更相关文件；`pnpm-lock.yaml` 与 `docs/` 下未跟踪文档未混入）

## 5. 验证

- [x] 5.1 执行 `node scripts/build-variant.mjs hongsuyun-cn --dev`，核对 Bundle ID / 版本号 / 显示名
- [x] 5.2 执行 `node scripts/build-variant.mjs hongshehui-prod --dev`，确认变体切换后三处值正确变化
- [x] 5.3 `diff` 证明 pbxproj 与介入前逐字节一致（幂等且零副作用）
- [x] 5.4 检查生成文件，确认三段通知转发各存在且仅一处
- [x] 5.5 执行 `git check-ignore` 校验生成物忽略状态——**结果为未忽略**（因文件已被跟踪），衍生任务 4.4
- [x] 5.6 验证结束后还原两端变体状态至介入前（Android=`hongshehui-prod`，iOS=`hongsuyun-cn`）

## 6. 文档同步

- [x] 6.1 `CLAUDE.md` 项目结构树补充 `ios/App/App/templates/`
- [x] 6.2 `CLAUDE.md` 变体字段说明补充两个 iOS 字段与版本号倒退警告
- [x] 6.3 `CLAUDE.md` 构建流程更新为 1–8 步，并说明 pbxproj 为何不做整文件模板
- [x] 6.4 `CLAUDE.md` 新增 iOS 推送人工前置条件与「iOS 图标未模板化」说明
- [x] 6.5 `CLAUDE.md` 记录 `ci_pre_xcodebuild.sh` 硬编码与 `appDisplayNameEn` 为中文两项遗留

## 7. Xcode 侧人工前置

> 以下事项属本变更的**部署前置条件**，脚本不代管，需在 Mac / Xcode 环境人工完成，**不计入本变更完成度**。

- **Push Notifications capability**：在 Xcode 为 target 开启，生成 `App.entitlements`
- **Apple 开发者后台**：为每个 Bundle ID 单独开通 Push Notifications 能力
- **插件头文件可见性**：将 `JPUSHService.h` 的 Target Membership 设为 `CapacitorPluginJPush`、访问级别 `Public`
- **端到端验证**：真机验证推送收发（需 Mac / Xcode Cloud 环境）

## 8. 后续事项

> 对应 design 的 Open Questions，**不属本变更范围**，决策后另开变更处理。

- 确认其余四个变体是否需要显式配置 iOS 版本号与 Bundle ID
- `ios/App/ci_scripts/ci_pre_xcodebuild.sh` 变体参数化——当前硬编码 `pnpm build:hongsuyun-cn`，Xcode Cloud 上无论构建哪个 App 都跑国内版
- 确认 `ios/App/App copy-Info.plist` 是否冗余文件及其 Xcode 引用处理
- 评估 iOS 图标多套化与 `zh-Hans` / `zh-Hant` 本地化的排期
