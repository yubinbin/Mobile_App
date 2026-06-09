import { showConfirmDialog, showDialog, showToast } from 'vant'
import { t } from '../i18n'
import { isLoggedIn, authRequest } from './auth.js'
import { baseUrl } from './urlValues.js'

let checking = false

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

/** 从 i18n 读取当前版本 */
function getCurrentVersion() {
  return t('version') || '0.0.0'
}

/** 调用 GET /api/app/version，5 秒超时 */
async function fetchVersionInfo() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const data = await authRequest(`${baseUrl}/app/version`, {
      signal: controller.signal,
    })
    return data
  } finally {
    clearTimeout(timeout)
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
          window.open(info.updateUrl, '_system')
          // 打开链接后重新弹出（用户可能没完成更新）
          setTimeout(forceShow, 1000)
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
        window.open(info.updateUrl, '_system')
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
  showToast({ message: t('update.checking'), forbidClick: true, duration: 0 })

  try {
    const info = await fetchVersionInfo()
    showToast.clear()

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
    showToast.clear()
    showToast(t('update.checkFailed'))
  } finally {
    checking = false
  }
}
