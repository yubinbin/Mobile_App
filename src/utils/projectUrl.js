// src/utils/projectUrl.js
// 项目 iframe 链接的统一构建，Login.vue 与 ProjectView.vue 共用，避免两处拼接逻辑漂移。
// 规则：优先取配置的 projectUrl（variants.mjs 中配置）；为空时回退为 baseUrl + projectOID + ttcVersion 拼接。
// 两种情况都统一在末尾拼接 userOID、access_token、lang。
import { baseUrl, projectOID, ttcVersion, projectUrl as configProjectUrl } from './urlValues.js'
import { locale } from '../i18n'

export function buildProjectUrl(token, uid) {
  const base = configProjectUrl || `${baseUrl}/app/ttcEngineDefalut?ttcVersion=${ttcVersion}&projectOID=${projectOID}`
  const url = new URL(base)
  url.searchParams.set('userOID', uid)
  url.searchParams.set('access_token', token)
  url.searchParams.set('lang', locale.value)
  return url.toString()
}
