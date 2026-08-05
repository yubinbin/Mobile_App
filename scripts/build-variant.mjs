// scripts/build-variant.mjs
// 用法: node scripts/build-variant.mjs <variant-name> [--dev]
// --dev 模式：只生成配置和复制资源，不执行 vite build 和 cap sync

import { readFileSync, writeFileSync, cpSync, rmSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ---- 解析参数 ----
const args = process.argv.slice(2)
const flags = args.filter(a => a.startsWith('--'))
const nonFlags = args.filter(a => !a.startsWith('--'))
const variantName = nonFlags[0]
const isDev = flags.includes('--dev')

// ---- 导入变体配置 ----
const variantsPath = pathToFileURL(resolve(root, 'variants.mjs')).href
const { variants } = await import(variantsPath)

if (flags.includes('--list')) {
  console.log('Available variants:')
  for (const [name, cfg] of Object.entries(variants)) {
    console.log(`  ${name}  →  ${cfg.appName} (${cfg.appId})`)
  }
  process.exit(0)
}

if (!variantName) {
  console.error('Usage: node scripts/build-variant.mjs <variant-name> [--dev]')
  console.error('Run with --list to see available variants')
  process.exit(1)
}

const cfg = variants[variantName]
if (!cfg) {
  console.error(`Error: Unknown variant "${variantName}"`)
  console.error('Available variants: ' + Object.keys(variants).join(', '))
  process.exit(1)
}

console.log(`\n🔧 Building variant: ${variantName}`)
console.log(`   ${cfg.appDisplayNameZhCN} | ${cfg.appId} | ${cfg.baseUrl}\n`)

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

// ---- 步骤 3: 生成 Android build.gradle（applicationId 来自 cfg.appId） ----
render(
  resolve(root, 'android/app/templates/build.gradle.template'),
  resolve(root, 'android/app/build.gradle')
)

// ---- 步骤 4: 生成 Android strings.xml（三语言） ----
render(
  resolve(root, 'android/app/templates/strings.template.xml'),
  resolve(root, 'android/app/src/main/res/values/strings.xml')
)
render(
  resolve(root, 'android/app/templates/strings.template.en.xml'),
  resolve(root, 'android/app/src/main/res/values-en/strings.xml')
)
render(
  resolve(root, 'android/app/templates/strings.template.zh-rTW.xml'),
  resolve(root, 'android/app/src/main/res/values-zh-rTW/strings.xml')
)

// ---- 步骤 5: 复制 Android 原生图标 ----
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

// ---- 步骤 6: 构建 (--dev 模式跳过) ----
if (isDev) {
  console.log('\n✅ Dev setup complete. Run `npx vite` to start dev server.')
} else {
  console.log('\n📦 Running vite build...')
  execSync('npx vite build', { cwd: root, stdio: 'inherit' })

  console.log('\n📦 Running cap sync...')
  execSync('npx cap sync', { cwd: root, stdio: 'inherit' })

  console.log('\n✅ Build complete!')
}
