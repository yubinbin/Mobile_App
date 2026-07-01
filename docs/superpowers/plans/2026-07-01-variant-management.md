# 多变体统一管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有变体（弘塑云/弘设汇 × 生产/测试）统一到一个代码分支管理，通过一条命令构建指定变体。

**Architecture:** `variants.mjs` 作为唯一配置源 → `scripts/build-variant.mjs` 读取配置、从模板生成运行时文件、复制原生资源、执行构建。生成的文件（`urlValues.js`、`capacitor.config.ts`、`strings.xml`）加入 `.gitignore`，不提交。

**Tech Stack:** Node.js (built-in fs/path/child_process), Vite, Capacitor

## Global Constraints

- 变体命名格式：`<产品名>-<环境>`（如 `hongsuyun-prod`）
- 生产和测试使用不同 appId（包名），可同机安装
- 构建命令格式：`npm run build:<variant>` 或 `node scripts/build-variant.mjs <variant> [--dev]`
- 模板文件使用 `{{VARIABLE_NAME}}` 占位符
- 生成文件不提交到 git

---

### Task 1: 创建变体配置清单 `variants.mjs`

**Files:**
- Create: `variants.mjs`

**Interfaces:**
- Produces: `variants` 对象，每个 key 为 variant 名称，value 为 VariantConfig 对象

- [ ] **Step 1: 创建 `variants.mjs`**

```js
// variants.mjs — 所有变体配置的唯一入口
// 新增变体：在此文件追加一个配置块 + package.json 加一条 build 命令

export const variants = {
  'hongsuyun-prod': {
    appName: '弘塑云',
    appNameEn: 'hongsuyun',
    appId: 'cn.com.tmiot.hongsuyun',
    baseUrl: 'http://47.236.252.168:8209',
    loginSocket: 'wss://47.236.252.168:8209',
    projectOID: '11024',
    ttcVersion: '2.7.0',
    updateCheckUrl: 'http://47.236.252.168:8209/biz/tmIoTCloud/Interface/updateAppVersion',
    iconDir: 'tpc',
    logoAsset: 'logo_hongsuyun.png',
    navProjectTitle: '弘塑云',
    iosAppName: '弘塑云',
  },

  'hongsuyun-test': {
    appName: '弘塑云',
    appNameEn: 'hongsuyun',
    appId: 'cn.com.tmiot.hongsuyun.test',
    baseUrl: 'http://1.82.232.147:8209',
    loginSocket: 'wss://1.82.232.147:8209',
    projectOID: '10994',
    ttcVersion: '2.7.0',
    updateCheckUrl: 'http://1.82.232.147:8209/biz/tmIoTCloud/Interface/updateAppVersion',
    iconDir: 'tpc',
    logoAsset: 'logo_hongsuyun.png',
    navProjectTitle: '弘塑云',
    iosAppName: '弘塑云',
  },

  'hongshehui-prod': {
    appName: '弘设汇',
    appNameEn: 'hongshehui',
    appId: 'cn.com.tmiot.hongshehui',
    baseUrl: 'https://tmplascloud.com',
    loginSocket: 'wss://tmplascloud.com',
    projectOID: '10238',
    ttcVersion: '2.6.0',
    updateCheckUrl: 'https://manage.tmiot.com.cn/app/share/updateAppVersion',
    iconDir: 'tic',
    logoAsset: 'logo_hongshehui.png',
    navProjectTitle: '弘设汇',
    iosAppName: '弘设汇',
  },

  'hongshehui-test': {
    appName: '弘设汇',
    appNameEn: 'hongshehui',
    appId: 'cn.com.tmiot.hongshehui.test',
    baseUrl: 'https://imro.tmiot.com.cn',
    loginSocket: 'wss://imro.tmiot.com.cn',
    projectOID: '10591',
    ttcVersion: '2.6.0',
    updateCheckUrl: 'https://manage.tmiot.com.cn/app/share/updateAppVersion',
    iconDir: 'tic',
    logoAsset: 'logo_hongshehui.png',
    navProjectTitle: '弘设汇',
    iosAppName: '弘设汇',
  },
}
```

- [ ] **Step 2: 验证文件语法正确**

```bash
node -e "import('./variants.mjs').then(m => console.log(Object.keys(m.variants)))"
```

Expected: `[ 'hongsuyun-prod', 'hongsuyun-test', 'hongshehui-prod', 'hongshehui-test' ]`

- [ ] **Step 3: 提交**

```bash
git add variants.mjs
git commit -m "feat: 添加变体配置清单 variants.mjs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 创建 `urlValues.template.js` 模板

**Files:**
- Create: `src/utils/urlValues.template.js`
- Modify: `src/utils/urlValues.js` → 内容将被模板替换（本次不改，由构建脚本生成）

**Interfaces:**
- Produces: 模板文件，包含 `{{PLACEHOLDER}}` 标记，由构建脚本替换为实际变体值后生成 `urlValues.js`

- [ ] **Step 1: 创建模板文件**

```js
// src/utils/urlValues.template.js
// 此文件为模板，由 scripts/build-variant.mjs 读取并替换 {{...}} 占位符后生成 urlValues.js
// 不要直接修改 urlValues.js（已加入 .gitignore），修改此模板即可

export const baseUrl = '{{baseUrl}}'
export const loginSocket = '{{loginSocket}}'
export const projectOID = '{{projectOID}}'
export const ttcVersion = '{{ttcVersion}}'
export const appVersion = 'v1.0.0'
export const appName = '{{appNameEn}}'
export const updateCheckUrl = '{{updateCheckUrl}}'
export const logoAsset = '{{logoAsset}}'
export const navProjectTitle = '{{navProjectTitle}}'

// 以下为 baseUrl 派生地址，无需手动修改
export const login = `${baseUrl}/app/account/login`
export const loginRSA = `${baseUrl}/biz/tmIoTCloud/Interface/loginRSA`
export const getProccessData = `${baseUrl}/biz/tmIoTCloud/Interface/getProccessData`
export const validateToken = `${baseUrl}/app/account/validateToken`
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/urlValues.template.js
git commit -m "feat: 添加 urlValues 模板文件

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 创建 `capacitor.config.template.ts` 模板

**Files:**
- Create: `capacitor.config.template.ts`

**Interfaces:**
- Produces: 模板文件，由构建脚本替换后生成 `capacitor.config.ts`

- [ ] **Step 1: 创建模板文件**

```ts
// capacitor.config.template.ts
// 此文件为模板，由 scripts/build-variant.mjs 读取并替换 {{...}} 占位符后生成 capacitor.config.ts
// 不要直接修改 capacitor.config.ts（已加入 .gitignore），修改此模板即可

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: '{{appId}}',
  appName: '{{appName}}',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
}

export default config
```

- [ ] **Step 2: 提交**

```bash
git add capacitor.config.template.ts
git commit -m "feat: 添加 capacitor.config 模板文件

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 创建 Android `strings.template.xml` 模板

**Files:**
- Create: `android/app/src/main/res/values/strings.template.xml`

**Interfaces:**
- Produces: 模板文件，由构建脚本替换后生成 `strings.xml`

- [ ] **Step 1: 创建模板文件**

```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">{{appName}}</string>
</resources>
```

- [ ] **Step 2: 提交**

```bash
git add android/app/src/main/res/values/strings.template.xml
git commit -m "feat: 添加 Android strings 模板文件

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 创建构建脚本 `scripts/build-variant.mjs`

**Files:**
- Create: `scripts/build-variant.mjs`

**Interfaces:**
- Consumes: `variants.mjs`（import）、所有 `.template.*` 文件（读取）
- Produces: `urlValues.js`、`capacitor.config.ts`、`strings.xml`、复制 Android 图标

- [ ] **Step 1: 创建构建脚本**

```mjs
// scripts/build-variant.mjs
// 用法: node scripts/build-variant.mjs <variant-name> [--dev]
// --dev 模式：只生成配置和复制资源，不执行 vite build 和 cap sync

import { readFileSync, writeFileSync, cpSync, rmSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ---- 解析参数 ----
const args = process.argv.slice(2)
const flags = args.filter(a => a.startsWith('--'))
const nonFlags = args.filter(a => !a.startsWith('--'))
const variantName = nonFlags[0]
const isDev = flags.includes('--dev')

if (!variantName) {
  console.error('Usage: node scripts/build-variant.mjs <variant-name> [--dev]')
  console.error('Run with --list to see available variants')
  process.exit(1)
}

// ---- 导入变体配置 ----
const { variants } = await import(resolve(root, 'variants.mjs'))

if (variantName === '--list') {
  console.log('Available variants:')
  for (const [name, cfg] of Object.entries(variants)) {
    console.log(`  ${name}  →  ${cfg.appName} (${cfg.appId})`)
  }
  process.exit(0)
}

const cfg = variants[variantName]
if (!cfg) {
  console.error(`Error: Unknown variant "${variantName}"`)
  console.error('Available variants: ' + Object.keys(variants).join(', '))
  process.exit(1)
}

console.log(`\n🔧 Building variant: ${variantName}`)
console.log(`   ${cfg.appName} | ${cfg.appId} | ${cfg.baseUrl}\n`)

// ---- 工具函数：模板替换 ----
function render(templatePath, outputPath) {
  const dir = dirname(outputPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  let content = readFileSync(templatePath, 'utf-8')
  for (const [key, value] of Object.entries(cfg)) {
    content = content.replaceAll(`{{${key}}}`, value)
  }
  writeFileSync(outputPath, content, 'utf-8')
  console.log(`  ✓ Generated: ${outputPath}`)
}

// ---- 步骤 1: 生成 urlValues.js ----
render(
  resolve(root, 'src/utils/urlValues.template.js'),
  resolve(root, 'src/utils/urlValues.js')
)

// ---- 步骤 2: 生成 capacitor.config.ts ----
render(
  resolve(root, 'capacitor.config.template.ts'),
  resolve(root, 'capacitor.config.ts')
)

// ---- 步骤 3: 生成 Android strings.xml ----
render(
  resolve(root, 'android/app/src/main/res/values/strings.template.xml'),
  resolve(root, 'android/app/src/main/res/values/strings.xml')
)

// ---- 步骤 4: 复制 Android 原生图标 ----
const srcIconDir = resolve(root, 'android/app/src', cfg.iconDir)
const dstMain = resolve(root, 'android/app/src/main')

if (existsSync(srcIconDir)) {
  // 删除旧的 main/res 下的图标目录（保留其他资源）
  const resDirs = ['mipmap-anydpi-v26', 'mipmap-hdpi', 'mipmap-mdpi',
                   'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi']
  for (const d of resDirs) {
    const target = resolve(dstMain, 'res', d)
    if (existsSync(target)) rmSync(target, { recursive: true })
  }
  // 复制 values/ic_launcher_background.xml
  const srcValues = resolve(srcIconDir, 'res', 'values')
  const dstValues = resolve(dstMain, 'res', 'values')
  if (existsSync(srcValues)) {
    cpSync(srcValues, dstValues, { recursive: true, force: true })
  }
  // 复制 playstore 图标
  const playstoreIcon = resolve(srcIconDir, 'ic_launcher-playstore.png')
  if (existsSync(playstoreIcon)) {
    cpSync(playstoreIcon, resolve(dstMain, 'ic_launcher-playstore.png'))
  }
  // 复制各 mipmap 目录
  for (const d of resDirs) {
    const src = resolve(srcIconDir, 'res', d)
    if (existsSync(src)) {
      cpSync(src, resolve(dstMain, 'res', d), { recursive: true })
    }
  }
  console.log(`  ✓ Copied icons from android/app/src/${cfg.iconDir}/`)
} else {
  console.warn(`  ⚠ Icon directory not found: ${srcIconDir}`)
}

// ---- 步骤 5: 构建 (--dev 模式跳过) ----
if (isDev) {
  console.log('\n✅ Dev setup complete. Run `npx vite` to start dev server.')
} else {
  console.log('\n📦 Running vite build...')
  execSync('npx vite build', { cwd: root, stdio: 'inherit' })

  console.log('\n📦 Running cap sync...')
  execSync('npx cap sync', { cwd: root, stdio: 'inherit' })

  console.log('\n✅ Build complete!')
}
```

- [ ] **Step 2: 验证脚本可用（--list 模式）**

```bash
node scripts/build-variant.mjs --list
```

Expected: 列出 4 个变体及其信息

- [ ] **Step 3: 提交**

```bash
git add scripts/build-variant.mjs
git commit -m "feat: 添加变体构建脚本

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 更新 `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 在 `.gitignore` 末尾追加生成文件规则**

编辑 `.gitignore`，在文件末尾追加：

```gitignore
# 由 build-variant.mjs 生成，不提交
src/utils/urlValues.js
capacitor.config.ts
android/app/src/main/res/values/strings.xml
```

- [ ] **Step 2: 从 git 追踪中移除现有的生成文件**

```bash
git rm --cached src/utils/urlValues.js 2>/dev/null || true
git rm --cached capacitor.config.ts 2>/dev/null || true
git rm --cached android/app/src/main/res/values/strings.xml 2>/dev/null || true
```

> 注意：这些文件不再提交，但本地仍保留供当前开发使用。之后每次切换变体时由构建脚本覆写。

- [ ] **Step 3: 提交**

```bash
git add .gitignore
git commit -m "chore: 将变体生成文件加入 .gitignore

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 修改 `Login.vue` — Logo 动态导入

**Files:**
- Modify: `src/pages/Login.vue:6,78`

- [ ] **Step 1: 修改 import 行（第 78 行），增加 `logoAsset`**

```js
// 修改前:
import { loginRSA, login, baseUrl, projectOID, ttcVersion, loginSocket, appVersion } from '../utils/urlValues.js'

// 修改后:
import { loginRSA, login, baseUrl, projectOID, ttcVersion, loginSocket, appVersion, logoAsset } from '../utils/urlValues.js'
```

- [ ] **Step 2: 修改模板中的 Logo 图片（第 6 行）**

```html
<!-- 修改前: -->
<img src="@/assets/images/logo_hongsuyun.png" alt="弘塑云" class="logo-img" />

<!-- 修改后: -->
<img :src="`/src/assets/images/${logoAsset}`" alt="弘塑云" class="logo-img" />
```

> 注：Vite 对 `/src/assets/` 下的静态资源处理需要保持一致。或者用动态 import：
> ```js
> // 在 <script setup> 中添加:
> const logoUrl = new URL(`../assets/images/${logoAsset}`, import.meta.url).href
> ```
> 然后在模板中用 `:src="logoUrl"`。

- [ ] **Step 3: 在 `<script setup>` 中添加 computed logo URL**

在 `Login.vue` 的 `<script setup>` 中（import 之后、变量声明附近）添加：

```js
const logoUrl = computed(() => new URL(`../assets/images/${logoAsset}`, import.meta.url).href)
```

将模板中第 6 行改为：

```html
<img :src="logoUrl" alt="弘塑云" class="logo-img" />
```

> `computed` 已从 vue 导入（已在现有 import 中），无需额外 import。

- [ ] **Step 4: 提交**

```bash
git add src/pages/Login.vue
git commit -m "feat: Login 页 Logo 改为从 urlValues 动态读取

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 修改 `ProjectView.vue` — 导航标题动态化

**Files:**
- Modify: `src/pages/ProjectView.vue:3,54`

- [ ] **Step 1: 修改 import 行（第 54 行），增加 `navProjectTitle`**

```js
// 修改前:
import { baseUrl, projectOID, ttcVersion } from '../utils/urlValues.js'

// 修改后:
import { baseUrl, projectOID, ttcVersion, navProjectTitle } from '../utils/urlValues.js'
```

- [ ] **Step 2: 修改模板中的标题（第 3 行）**

```html
<!-- 修改前: -->
<van-nav-bar v-show="!scanning" :title="$t('nav.projectTitle')" ...>

<!-- 修改后: -->
<van-nav-bar v-show="!scanning" :title="navProjectTitle" ...>
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/ProjectView.vue
git commit -m "feat: ProjectView 导航标题改为从 urlValues 动态读取

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 清理 i18n 文件 — 移除 `nav.projectTitle`

**Files:**
- Modify: `src/i18n/zh-CN.json:9`
- Modify: `src/i18n/zh-TW.json:9`
- Modify: `src/i18n/en.json:9`

- [ ] **Step 1: 从三个 i18n 文件中删除 `nav.projectTitle` 行**

> 删除以下行（具体行号在各语言文件中均为第 9 行）：

```
zh-CN.json:  "nav.projectTitle": "弘塑云",
zh-TW.json:  "nav.projectTitle": "弘塑雲",
en.json:     "nav.projectTitle": "TPC",
```

- [ ] **Step 2: 提交**

```bash
git add src/i18n/zh-CN.json src/i18n/zh-TW.json src/i18n/en.json
git commit -m "feat: i18n 移除 nav.projectTitle（改为从 urlValues 读取）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: 更新 `package.json` — 添加变体构建命令

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 在 `scripts` 中添加构建命令**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "build:hongsuyun-prod": "node scripts/build-variant.mjs hongsuyun-prod",
    "build:hongsuyun-test": "node scripts/build-variant.mjs hongsuyun-test",
    "build:hongshehui-prod": "node scripts/build-variant.mjs hongshehui-prod",
    "build:hongshehui-test": "node scripts/build-variant.mjs hongshehui-test",
    "dev:hongsuyun-test": "node scripts/build-variant.mjs hongsuyun-test --dev && vite",
    "dev:hongshehui-test": "node scripts/build-variant.mjs hongshehui-test --dev && vite"
  }
}
```

> 保留原有的 `dev`、`build`、`preview` 命令不变。`dev:*` 命令先运行配置生成（--dev），再启动 Vite 开发服务器。

- [ ] **Step 2: 提交**

```bash
git add package.json
git commit -m "feat: 添加变体构建快捷命令

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: 端到端验证

**Files:**
- 无新建/修改文件

- [ ] **Step 1: 测试 hongsuyun-test 变体的 --dev 模式**

```bash
node scripts/build-variant.mjs hongsuyun-test --dev
```

验证：
- `src/utils/urlValues.js` 已生成，内容与变体配置一致
- `capacitor.config.ts` 已生成，appId 为 `cn.com.tmiot.hongsuyun.test`
- `android/app/src/main/res/values/strings.xml` 已生成，app_name 为 `弘塑云`
- Android 图标已从 `android/app/src/tpc/` 复制到 `main/`

- [ ] **Step 2: 测试 hongshehui-test 变体的 --dev 模式**

```bash
node scripts/build-variant.mjs hongshehui-test --dev
```

验证：
- `src/utils/urlValues.js` 中 baseUrl 为 `https://imro.tmiot.com.cn`
- `capacitor.config.ts` 中 appId 为 `cn.com.tmiot.hongshehui.test`
- 图标从 `android/app/src/tic/` 复制

- [ ] **Step 3: 测试 --list 和非法参数**

```bash
node scripts/build-variant.mjs --list          # 应列出 4 个变体
node scripts/build-variant.mjs invalid-name     # 应报错并列出可用变体
node scripts/build-variant.mjs                  # 应提示用法
```

- [ ] **Step 4: 验证 `npm run dev:hongsuyun-test` 能启动开发服务器**

```bash
npm run dev:hongsuyun-test
```

预期：浏览器打开后，登录页正常显示（Logo 正确、后续登录跳转地址正确）。

- [ ] **Step 5: 提交（如有修正）**

```bash
git add -A
git commit -m "chore: 多变体方案端到端验证完成

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
