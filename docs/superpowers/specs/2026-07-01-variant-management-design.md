# 多变体统一管理方案设计

## 背景

弘塑云 / 弘设汇 项目目前有 4 个变体（2 产品 × 2 环境），通过 git 分支（`tpc_v1.0` / `tic_v1.0`）管理，每个分支内通过注释切换环境。新增功能代码需要在多个分支之间手动同步，效率低且容易遗漏。后续预计扩展到 6-8 个变体。

## 目标

- **单一代码库**：所有变体共享同一份代码，无需分支同步
- **一条命令构建**：`npm run build:hongsuyun-prod` 完成所有配置生成、资源复制和构建
- **易扩展**：新增变体只需添加一个配置块，无需改代码
- **可回退**：方案可逆，随时可回到手动管理方式

## 设计概览

```
variants.ts (单一配置源，提交到 git)
       │
       ▼
scripts/build-variant.mjs (构建脚本)
       │
       ├── 生成 urlValues.ts       (不提交，.gitignore)
       ├── 生成 capacitor.config.ts (不提交，.gitignore)
       ├── 替换 Android strings.xml / iOS Info.plist
       ├── 复制原生图标到对应目录
       └── 执行 vite build + cap sync
```

## 一、变体配置清单（variants.ts）

在项目根目录创建 `variants.ts`，作为所有变体的唯一定义源：

```ts
export interface VariantConfig {
  appName: string              // 应用显示名称，如 "弘塑云"
  appNameEn: string            // 英文名，如 "hongshuyun"
  appId: string                // Android 包名 / iOS Bundle ID
  baseUrl: string              // TTC 引擎地址
  loginSocket: string          // WebSocket 地址
  projectOID: string           // 项目 ID
  ttcVersion: string           // TTC 版本号
  updateCheckUrl: string       // 版本更新检查接口
  iconDir: string              // 图标资源目录名，如 "tpc" / "tic"
  logoAsset: string            // Login 页 Logo 文件名
  navProjectTitle: string      // 导航栏标题，如 "弘塑云"
  iosAppName: string           // iOS 显示名称
}

export const variants: Record<string, VariantConfig> = {
  'hongsuyun-prod': { /* 弘塑云生产 */ },
  'hongsuyun-test': { /* 弘塑云测试 */ },
  'hongshehui-prod': { /* 弘设汇生产 */ },
  'hongshehui-test': { /* 弘设汇测试 */ },
}
```

### 变体命名约定

格式：`<产品名>-<环境>`，如 `hongsuyun-prod`、`hongshehui-test`。

### appId 命名策略

- 生产：`cn.com.tmiot.<产品名>`，如 `cn.com.tmiot.hongsuyun`
- 测试：`cn.com.tmiot.<产品名>.test`，如 `cn.com.tmiot.hongsuyun.test`
- 生产和测试包名不同，可同机安装

### iconDir 约定

对应 `src/assets/logo/<iconDir>/` 目录，如 `src/assets/logo/tpc/`、`src/assets/logo/tic/`。该目录下存放 Android/iOS 所需的所有尺寸图标。

## 二、构建脚本（scripts/build-variant.mjs）

### 执行流程

```
node scripts/build-variant.mjs hongsuyun-prod [--dev]
         │
         ▼
  1. 校验: variant 名称是否在 variants.ts 中注册
         │
         ▼
  2. 生成配置文件 (写入 src/utils/urlValues.ts)
     - 从 urlValues.template.ts 模板读取
     - 替换所有 {{PLACEHOLDER}} 为变体实际值
         │
         ▼
  3. 生成 capacitor.config.ts (写入根目录)
     - 从 capacitor.config.template.ts 模板读取
     - 替换 appId、appName
         │
         ▼
  4. 复制原生资源
     - Android: strings.xml 中的 app_name
     - Android: 从 assets/logo/<iconDir>/ 复制图标到 mipmap 目录
     - iOS: Info.plist 中的显示名称
     - iOS: 同上复制图标
         │
         ▼
  5. 构建 (--dev 模式跳过)
     - npx vite build
     - npx cap sync
```

### 模板文件

- `src/utils/urlValues.template.ts`：urlValues 模板
- `capacitor.config.template.ts`：Capacitor 配置模板
- 模板使用 `{{VARIABLE_NAME}}` 占位符，由脚本读取 `variants.ts` 后替换
- 模板文件提交到 git，生成结果 `.gitignore`

### 命令入口

```json
{
  "scripts": {
    "build:hongsuyun-prod":  "node scripts/build-variant.mjs hongsuyun-prod",
    "build:hongsuyun-test":  "node scripts/build-variant.mjs hongsuyun-test",
    "build:hongshehui-prod": "node scripts/build-variant.mjs hongshehui-prod",
    "build:hongshehui-test": "node scripts/build-variant.mjs hongshehui-test",
    "dev:hongsuyun-test": "node scripts/build-variant.mjs hongsuyun-test --dev"
  }
}
```

`--dev` 模式只做步骤 1-4（配置生成和资源复制），不执行构建，方便开发时切换。

## 三、源码改造

### 需要修改的文件

| 文件 | 变化 |
|------|------|
| `src/utils/urlValues.js` | 删除硬编码，改为构建脚本动态生成（不提交） |
| `capacitor.config.ts` | 同上，构建时从模板生成 |
| `src/pages/Login.vue` | Logo 从硬编码路径改为从 urlValues 导入 `logoAsset` 字段 |
| `src/i18n/zh-CN.json` 等 | `nav.projectTitle` 改为从 urlValues 动态读取（在 `urlValues.template.ts` 中增加 `navProjectTitle` 字段），i18n 文件去掉该 key |

### 不变的文件

- `auth.js`、`appUpdater.js`、`ProjectView.vue` 等 —— 它们只从 `urlValues` import，接口不变
- 大部分 i18n 文件 —— 除 `nav.projectTitle` 外保持不变
- 图标资源 —— 位置不变，只是多目录并存

## 四、边界情况与保护

### 误操作保护

- 构建脚本校验 variant 名称，未注册则报错并列出可用名称
- 生成文件加入 `.gitignore`，防止误提交

### 模板文件保护

- 模板文件提交到 git，作为结构和默认值参考
- 模板中可保留注释说明每个占位符的用途

### 回退方案

- 删除 `.gitignore` 中对应条目
- 手动将 `.template.ts` 内容复制为正式配置
- 恢复到单分支手动管理方式

## 五、新增变体流程

后续接入新应用（如第 5、第 6 个变体）只需：

1. 准备图标放入 `src/assets/logo/<新iconDir>/`
2. 准备 Logo 图放入 `src/assets/images/`
3. 在 `variants.ts` 中新增一个配置块（~15 行）
4. 在 `package.json` 新增一条 build 命令
5. 完成，零代码改动

## 六、未覆盖项

- **iOS 图标自动复制**：由于项目当前主要面向 Android，iOS 图标复制逻辑可在后续需要时补充
- **CI/CD 集成**：构建脚本设计为命令行驱动，可直接集成到 CI 流水线中，但具体 CI 配置暂不在本次范围
