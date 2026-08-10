import { showToast } from 'vant'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { t } from '../i18n'
import { isLoggedIn } from './auth.js'
import { appVersion, appName, updateChannel, updateCheckUrl } from './urlValues.js'
import { updateState } from './updateState.js'

let checking = false
let updateCancelledListener = null
let flexStateListener = null

const isPlayChannel = () => updateChannel === 'play'
const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

/** Format byte count to human-readable string */
export function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return ''
  const n = Number(bytes)
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
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

/** 查询 Play 更新信息；非 Android 原生 / 无 Play 服务 / 非商店安装返回 null */
async function fetchPlayUpdateInfo() {
  if (!isNativeAndroid()) return null
  const plugin = Capacitor.Plugins.PlayUpdate
  if (!plugin) return null
  try {
    return await plugin.getUpdateInfo()
  } catch {
    return null
  }
}

/**
 * 组装 Play 变体弹窗信息：
 * 后端仅在存在该变体记录时补充 changelog/version/forceUpdate；缺失则通用文案。
 * force 优先取后端 forceUpdate，否则按 Play updatePriority >= 3 推断为强制。
 */
function buildPlayUpdateInfo(playInfo, backendInfo) {
  const force = backendInfo?.forceUpdate ? true : (playInfo.updatePriority ?? 0) >= 3
  return {
    ...backendInfo,
    version: backendInfo?.version ?? null,
    forceUpdate: force,
    updateUrl: backendInfo?.updateUrl ?? null,
    packageName: playInfo.packageName,
    availableVersionCode: playInfo.availableVersionCode,
  }
}

/** 弹出更新弹窗（可选 / 强制）——由 UpdateDialog.vue 组件渲染卡片内容 */
function showUpdateDialog(info) {
  updateState.updateInfo = info
  updateState.forceUpdate = !!info.forceUpdate
  updateState.updateDialogVisible = true
}

/** 启动时自动检查（静默，失败不提示；Play 变体以 Play API 为准） */
export async function checkOnLaunch() {
  if (!isLoggedIn()) return
  if (checking) return
  checking = true
  updateState.hasUpdate = false
  try {
    if (isPlayChannel()) {
      const playInfo = await fetchPlayUpdateInfo()
      if (playInfo?.updateAvailable) updateState.hasUpdate = true
      return
    }
    const info = await fetchVersionInfo()
    if (!info || !info.version) return
    const current = getCurrentVersion()
    if (compareVersion(current, info.version) >= 0) return
    updateState.hasUpdate = true
    updateState.updateInfo = info
  } catch {
    // 启动检查失败，静默忽略
  } finally {
    checking = false
  }
}

/** 手动检查（失败 Toast 提示；Play 变体以 Play API 为准） */
export async function checkManually() {
  if (!isLoggedIn()) return
  if (checking) return
  if (updateState.updateInProgress) {
    showToast(t('update.downloading'))
    return
  }
  checking = true
  updateState.hasUpdate = false
  const loadingToast = showToast({ message: t('update.checking'), forbidClick: true, duration: 0 })
  try {
    if (isPlayChannel()) {
      const playInfo = await fetchPlayUpdateInfo()
      loadingToast.close()
      if (!playInfo?.updateAvailable) {
        showToast(t('update.alreadyLatest'))
        return
      }
      // 尽力拉后端补 changelog/force；失败或该变体无记录则忽略
      let backendInfo = null
      try {
        const info = await fetchVersionInfo()
        if (info?.version) backendInfo = info
      } catch { /* 忽略，Play 信息足够弹窗 */ }
      updateState.hasUpdate = true
      showUpdateDialog(buildPlayUpdateInfo(playInfo, backendInfo))
      return
    }
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
    showUpdateDialog(info)
  } catch {
    loadingToast.close()
    showToast(t('update.checkFailed'))
  } finally {
    checking = false
  }
}

function cleanupUpdateListeners() {
  updateCancelledListener?.remove()
  updateCancelledListener = null
  flexStateListener?.remove()
  flexStateListener = null
}

/** 启动 Play 更新流程；失败回退浏览器打开 Play 商店页 */
async function startPlayUpdate(info) {
  const plugin = Capacitor.Plugins.PlayUpdate
  if (!plugin) return
  const type = info.forceUpdate ? 'immediate' : 'flexible'
  updateState.updateInProgress = true
  try {
    // 强制（IMMEDIATE）被用户取消时，Play 会发 updateCancelled —— 重新拉起保持"不可退出"
    updateCancelledListener = await plugin.addListener('updateCancelled', () => {
      plugin.startUpdate({ type: 'immediate', force: true }).catch(() => {
        updateState.updateInProgress = false
      })
    })
    if (type === 'flexible') {
      // FLEXIBLE：下载完成触发安装；失败/取消复位拦截标志。
      // 注意：以权威的 installStatus === 'DOWNLOADED' 为触发条件（play-core 的 downloadStatus 由
      // installStatus 派生，在安装期仍为 DOWNLOADED，用它判断会重复拉起 completeUpdate）。
      flexStateListener = await plugin.addListener('stateChange', ({ installStatus }) => {
        if (installStatus === 'DOWNLOADED') {
          plugin.completeUpdate().catch(() => {})
        } else if (installStatus === 'FAILED' || installStatus === 'CANCELED') {
          updateState.updateInProgress = false
        }
      })
    }
    await plugin.startUpdate({ type, force: info.forceUpdate })
  } catch (err) {
    updateState.updateInProgress = false
    cleanupUpdateListeners()
    // 用户主动取消非强制更新：不打扰；其他失败：回退浏览器打开 Play 商店页
    if (err?.code === 'USER_CANCELLED') return
    if (info.packageName) {
      window.open(`https://play.google.com/store/apps/details?id=${info.packageName}`, '_system')
    }
  }
}

/** 更新弹窗确认动作——按渠道分发：Play 启动 In-app Updates，store 浏览器打开 updateUrl */
export async function confirmUpdate() {
  const info = updateState.updateInfo
  if (!info) return
  if (isPlayChannel() && isNativeAndroid()) {
    await startPlayUpdate(info)
  } else if (info.updateUrl) {
    window.open(info.updateUrl, '_system')
  }
}
