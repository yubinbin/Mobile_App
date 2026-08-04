import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 读取当前生成的 urlValues.js 中的 baseUrl 作为 /api 代理目标，
// 使本地开发时代理始终指向当前变体对应的环境（测试/生产一致），
// 避免 /api 回退请求打到错误的服务器。urlValues.js 未生成时回退到测试环境。
const urlValuesPath = fileURLToPath(new URL('./src/utils/urlValues.js', import.meta.url))
let apiTarget = 'http://1.82.232.147:8209'
try {
  const content = readFileSync(urlValuesPath, 'utf-8')
  const match = content.match(/^export const baseUrl = '([^']+)'/m)
  if (match) apiTarget = match[1]
} catch {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: { 'yujiang-from-app': 'true' },
      },
    },
  },
})
