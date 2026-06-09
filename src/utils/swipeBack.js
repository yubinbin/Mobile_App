import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { showToast } from 'vant'

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
  showToast({ message: '再按一次退出弘设汇', duration: 3000 })
  exitTimer = setTimeout(() => { exitPending = false }, 3000)
}
