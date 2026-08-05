import { showToast } from 'vant'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { t } from '../i18n'
import { isLoggedIn } from './auth.js'
import { baseUrl, appVersion, appName, updateCheckUrl } from './urlValues.js'
import { updateState } from './updateState.js'

let checking = false
let downloading = false
let currentDownloadCleanup = null
let currentDownloadId = null

/** Format byte count to human-readable string */
export function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return ''
  const n = Number(bytes)
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

/** Cancel the current download — removes the native listener and resets Vue state */
export function cancelCurrentDownload() {
  // 真正取消原生下载：防止其继续下载、触发安装，或遗留事件干扰下一次下载
  const plugin = Capacitor.Plugins.ApkInstaller
  if (plugin && currentDownloadId != null) {
    plugin.cancelDownload({ downloadId: currentDownloadId }).catch(() => {})
  }
  currentDownloadCleanup?.()
  updateState.downloadState = 'idle'
  updateState.downloadProgress = 0
  updateState.downloadedSize = ''
  updateState.totalSize = ''
}

/** Android 原生下载 APK 并触发安装，非 Android 降级为系统浏览器打开 */
export async function downloadAndInstall(url) {
  // Re-entrancy guard: ignore duplicate calls while a download is in progress
  if (downloading) return

  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    window.open(url, '_system')
    return
  }

  const plugin = Capacitor.Plugins.ApkInstaller
  if (!plugin) {
    updateState.downloadState = 'failed'
    return
  }

  downloading = true
  updateState.downloadState = 'downloading'
  updateState.downloadProgress = 0
  updateState.downloadedSize = ''
  updateState.totalSize = ''

  // Populate totalSize from API response if available
  if (updateState.updateInfo?.fileSize) {
    updateState.totalSize = formatBytes(updateState.updateInfo.fileSize)
  }

  let progressListener = null
  let doneListener = null
  let finished = false

  // 收尾：移除监听、复位 downloading。由完成事件或取消触发。
  const cleanup = () => {
    progressListener?.remove()
    doneListener?.remove()
    currentDownloadCleanup = null
    downloading = false
    currentDownloadId = null
  }

  // 真实下载结束（成功/失败）时更新状态并收尾
  const finish = (success) => {
    if (finished) return
    finished = true
    if (success) {
      updateState.downloadState = 'completed'
      updateState.downloadProgress = 100
    } else {
      updateState.downloadState = 'failed'
    }
    cleanup()
  }

  try {
    progressListener = await plugin.addListener('progress', ({ percent, downloadId }) => {
      // 忽略上一次下载（取消后仍在跑）遗留的事件
      if (downloadId != null && downloadId !== currentDownloadId) return
      // Guard: skip updates when download was cancelled
      if (updateState.downloadState !== 'downloading') return
      updateState.downloadProgress = percent
      // Calculate downloadedSize from percentage if totalSize is known
      if (updateState.updateInfo?.fileSize) {
        const downloaded = (updateState.updateInfo.fileSize * percent) / 100
        updateState.downloadedSize = formatBytes(downloaded)
      }
    })

    doneListener = await plugin.addListener('downloadComplete', ({ success, downloadId }) => {
      // 忽略上一次下载遗留的完成事件
      if (downloadId != null && downloadId !== currentDownloadId) return
      finish(!!success)
    })
    currentDownloadCleanup = cleanup

    // 注意：plugin.download 只代表"已入队"，真实下载进度/结果由 progress / downloadComplete 事件通知。
    const { downloadId } = await plugin.download({ url })
    currentDownloadId = downloadId
  } catch (err) {
    // 入队失败或 addListener 抛错（极端情况），避免 downloading 标志泄漏
    finish(false)
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
  const platform = Capacitor.getPlatform()
  const url = `${updateCheckUrl}?app=${appName}&platform=${platform}`

  if (Capacitor.isNativePlatform()) {
    const res = await Promise.race([
      CapacitorHttp.request({ url, method: 'GET' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  }

  // Web 开发模式走 Vite 代理，避免跨域
  const proxyUrl = `/api/biz/tmIoTCloud/Interface/updateAppVersion?app=${appName}&platform=${platform}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal })
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** 弹出更新弹窗（可选 / 强制）——由 UpdateDialog.vue 组件渲染卡片内容 */
function showUpdateDialog(info) {
  updateState.updateInfo = info
  updateState.forceUpdate = !!info.forceUpdate
  updateState.updateDialogVisible = true
}

/** 启动时自动检查（静默，失败不提示） */
export async function checkOnLaunch() {
  if (!isLoggedIn()) return
  if (checking) return
  if (downloading) return

  checking = true
  updateState.hasUpdate = false
  updateState.downloadState = 'idle'

  try {
    const info = await fetchVersionInfo()
    if (!info || !info.version) return

    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) {
      updateState.hasUpdate = false
      return
    }

    updateState.hasUpdate = true
    updateState.updateInfo = info
    updateState.downloadState = 'idle'
    // 启动检查不弹窗，仅设置红点状态，用户手动点击"检查更新"时才会弹窗
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
  if (downloading) {
    showToast(t('update.downloading'))
    return
  }

  checking = true
  updateState.hasUpdate = false
  updateState.downloadState = 'idle'

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

    updateState.hasUpdate = true
    updateState.updateInfo = info
    updateState.downloadState = 'idle'

    showUpdateDialog(info)
  } catch {
    loadingToast.close()
    showToast(t('update.checkFailed'))
  } finally {
    checking = false
  }
}
