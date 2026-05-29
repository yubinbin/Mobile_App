import { ref } from 'vue'
import { Locale as VantLocale } from 'vant'

import zhCN from './zh-CN.json'
import zhTW from './zh-TW.json'
import en from './en.json'
import enUS from 'vant/es/locale/lang/en-US'
import zhCNVant from 'vant/es/locale/lang/zh-CN'
import zhTWVant from 'vant/es/locale/lang/zh-TW'

const messages = { 'zh-CN': zhCN, 'zh-TW': zhTW, en }
const vantLocales = { 'zh-CN': zhCNVant, 'zh-TW': zhTWVant, en: enUS }
const STORAGE_KEY = 'app_language'

function getDefault() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && messages[saved]) return saved
  const nav = navigator.language
  if (nav.startsWith('zh-TW') || nav.startsWith('zh-HK')) return 'zh-TW'
  if (nav.startsWith('zh')) return 'zh-CN'
  return 'en'
}

const locale = ref(getDefault())

VantLocale.use(locale.value, vantLocales[locale.value])

export function t(key) {
  return messages[locale.value]?.[key] ?? key
}

export function setLocale(lang) {
  locale.value = lang
  localStorage.setItem(STORAGE_KEY, lang)
  VantLocale.use(lang, vantLocales[lang])
}

export function getLocale() {
  return locale.value
}
