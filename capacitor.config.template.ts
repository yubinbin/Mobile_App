// capacitor.config.template.ts
// 此文件为模板，由 scripts/build-variant.mjs 读取并替换 {{...}} 占位符后生成 capacitor.config.ts
// 不要直接修改 capacitor.config.ts（已加入 .gitignore），修改此模板即可

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: '{{appId}}',
  appName: '{{appDisplayNameZhCN}}',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
}

export default config
