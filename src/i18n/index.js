import { ref } from 'vue'
import { Locale as VantLocale } from 'vant'

import zhCN from './zh-CN.json'
import zhHK from './zh-TW.json'
import enUS from './en.json'
import enUSVant from 'vant/es/locale/lang/en-US'
import zhCNVant from 'vant/es/locale/lang/zh-CN'
import zhTWVant from 'vant/es/locale/lang/zh-TW'

const messages = { 'zh-CN': zhCN, 'zh-HK': zhHK, 'en-US': enUS }
const vantLocales = { 'zh-CN': zhCNVant, 'zh-HK': zhTWVant, 'en-US': enUSVant }
const STORAGE_KEY = 'app_language'

function getDefault() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && messages[saved]) return saved
  const nav = navigator.language
  if (nav.startsWith('zh-TW') || nav.startsWith('zh-HK')) return 'zh-HK'
  if (nav.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

const locale = ref(getDefault())

VantLocale.use(locale.value, vantLocales[locale.value])

export function t(key, params) {
  let msg = messages[locale.value]?.[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replaceAll(`{${k}}`, v)
    }
  }
  return msg
}

export function setLocale(lang) {
  locale.value = lang
  localStorage.setItem(STORAGE_KEY, lang)
  VantLocale.use(lang, vantLocales[lang])
}

export function getLocale() {
  return locale.value
}

export { locale }
