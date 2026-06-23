import { showConfirmDialog, showDialog, showToast } from 'vant'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { t } from '../i18n'
import { isLoggedIn } from './auth.js'
import { baseUrl, appVersion, appName } from './urlValues.js'

let checking = false

/** Android 原生下载 APK 并触发安装，非 Android 降级为系统浏览器打开 */
async function downloadAndInstall(url) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    window.open(url, '_system')
    return
  }

  const plugin = Capacitor.Plugins.ApkInstaller
  const loadingToast = showToast({ message: `${t('update.downloading')} 0%`, forbidClick: true, duration: 0, type: 'loading' })

  const listener = await plugin.addListener('progress', ({ percent }) => {
    loadingToast.message = `${t('update.downloading')} ${percent}%`
  })

  try {
    await plugin.download({ url })
  } catch {
    showToast(t('update.downloadFailed'))
  } finally {
    loadingToast.close()
    listener.remove()
  }
}

/**
 * 去掉 v/V 前缀，按 . 分段后逐段比较数字。
 * 返回 -1（a < b）、0（相等）、1（a > b）
 */
export function compareVersion(a, b) {
  const v1 = a.replace(/^v/i, '').split('.').map(Number)
  const v2 = b.replace(/^v/i, '').split('.').map(Number)
  const len = Math.max(v1.length, v2.length)
  for (let i = 0; i < len; i++) {
    const n1 = v1[i] || 0
    const n2 = v2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

/** 当前应用版本 */
function getCurrentVersion() {
  return appVersion || '0.0.0'
}

/** 调用更新检查接口，5 秒超时（免登录接口） */
async function fetchVersionInfo() {
  const url = `https://manage.tmiot.com.cn/app/share/updateAppVersion?app=${appName}`

  if (Capacitor.isNativePlatform()) {
    const res = await Promise.race([
      CapacitorHttp.request({ url, method: 'GET' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** 弹出更新弹窗（可选 / 强制） */
function showUpdateDialog(info) {
  const current = getCurrentVersion()
  const msgLines = [
    `${t('update.currentVersion')}：${current}`,
    `\n${info.version}`,
  ]

  if (info.changelog) {
    msgLines.push(`\n${t('update.changelog')}：\n${info.changelog}`)
  }

  if (info.forceUpdate) {
    msgLines.push(`\n${t('update.forceMsg')}`)
  }

  const message = msgLines.join('\n')

  if (info.forceUpdate) {
    // 强制更新：不可关闭，返回键关闭后重新弹出
    function forceShow() {
      showDialog({
        title: t('update.forceTitle'),
        message,
        confirmButtonText: t('update.updateNow'),
        allowClose: false,
        closeOnPopstate: false,
      })
        .then(() => {
          downloadAndInstall(info.updateUrl)
        })
        .catch(() => {
          // 返回键关闭后重新弹出
          setTimeout(forceShow, 200)
        })
    }
    forceShow()
  } else {
    // 可选更新
    showConfirmDialog({
      title: t('update.newVersion'),
      message,
      confirmButtonText: t('update.updateNow'),
      cancelButtonText: t('update.later'),
    })
      .then(() => {
        downloadAndInstall(info.updateUrl)
      })
      .catch(() => {})
  }
}

/** 启动时自动检查（静默，失败不提示） */
export async function checkOnLaunch() {
  if (!isLoggedIn()) return
  if (checking) return

  checking = true
  try {
    const info = await fetchVersionInfo()
    if (!info || !info.version) return

    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) return

    showUpdateDialog(info)
  } catch {
    // 启动检查失败，静默忽略
  } finally {
    checking = false
  }
}

/** 手动检查（失败 Toast 提示） */
export async function checkManually() {
  if (!isLoggedIn()) return
  if (checking) return

  checking = true
  const loadingToast = showToast({ message: t('update.checking'), forbidClick: true, duration: 0 })

  try {
    const info = await fetchVersionInfo()
    loadingToast.close()

    if (!info || !info.version) {
      showToast(t('update.checkFailed'))
      return
    }

    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) {
      showToast(t('update.alreadyLatest'))
      return
    }

    showUpdateDialog(info)
  } catch {
    loadingToast.close()
    showToast(t('update.checkFailed'))
  } finally {
    checking = false
  }
}
