import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { showToast } from 'vant'
import { t, locale } from '../i18n'
import { navProjectTitles } from './urlValues.js'

let exitPending = false
let exitTimer = null

export function handleHomeSwipe() {
  if (exitPending) {
    clearTimeout(exitTimer)
    exitPending = false
    if (Capacitor.isNativePlatform()) App.exitApp()
    return
  }
  exitPending = true
  // 应用名按当前变体 + 当前语言取（如 弘塑云/弘设汇），不能写死
  const appName = navProjectTitles[locale.value] || navProjectTitles['zh-CN']
  showToast({ message: t('nav.exitApp', { appName }), duration: 3000 })
  exitTimer = setTimeout(() => { exitPending = false }, 3000)
}
