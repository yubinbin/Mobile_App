// src/utils/webFetch.js
// Web 端统一请求：dev 模式直接走 Vite 代理（避免浏览器跨域报错），
// 生产环境先直连，CORS/网络不通时回退到代理。
// 仅用于 Web 浏览器；原生平台请走 CapacitorHttp（见 auth.js），不要用本函数。
import { baseUrl } from './urlValues.js'

export async function webFetch(url, options = {}) {
  const proxyUrl = `/api${url.replace(baseUrl, '')}`
  if (import.meta.env.DEV) {
    return fetch(proxyUrl, options)
  }
  try {
    return await fetch(url, options)
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      return fetch(proxyUrl, options)
    }
    throw err
  }
}
