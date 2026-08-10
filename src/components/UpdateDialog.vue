<template>
  <van-dialog
    v-model:show="visible"
    class="update-dialog"
    :close-on-click-overlay="!forceUpdate"
    :close-on-popstate="false"
    :show-cancel-button="!forceUpdate"
    :confirm-button-text="t('update.updateNow')"
    :cancel-button-text="t('update.later')"
    @confirm="onConfirm"
    @cancel="onClose"
  >
    <template #title>
      <div class="update-header">
        <p class="update-header-title">{{ title }}</p>
        <span v-if="version" class="update-header-version">v{{ version }}</span>
      </div>
    </template>
    <div class="update-content">
      <p class="update-current">{{ t('update.currentVersion') }} v{{ currentVersion }}</p>
      <div v-if="changelogLines.length" class="update-changelog">
        <p class="update-changelog-label">{{ t('update.changelog') }}</p>
        <ul class="update-changelog-list">
          <li v-for="(line, index) in changelogLines" :key="index">{{ line }}</li>
        </ul>
      </div>
      <p v-if="sizeText" class="update-size">{{ t('update.packageSize') }} {{ sizeText }}</p>
      <p v-if="forceUpdate" class="update-force">{{ t('update.forceMsg') }}</p>
    </div>
  </van-dialog>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue'
import { t, getLocale } from '../i18n'
import { updateState } from '../utils/updateState.js'
import { confirmUpdate, formatBytes } from '../utils/appUpdater.js'
import { appVersion } from '../utils/urlValues.js'

const CHANGELOG_FIELD_MAP = {
  'zh-CN': 'changelog_zh_cn',
  'zh-HK': 'changelog_zh_tw',
  'en-US': 'changelog_en',
}

/** 按当前语言取 changelog 字段；为空时回退 简体 → 英文 → 繁体 → 旧单字段 */
function pickChangelog(info, locale) {
  const preferred = CHANGELOG_FIELD_MAP[locale]
  const candidates = [preferred, 'changelog_zh_cn', 'changelog_en', 'changelog_zh_tw', 'changelog']
  for (const key of candidates) {
    if (info && typeof info[key] === 'string' && info[key]) return info[key]
  }
  return ''
}

const visible = computed({
  get: () => updateState.updateDialogVisible,
  set: (value) => {
    updateState.updateDialogVisible = value
  },
})

const forceUpdate = computed(() => updateState.forceUpdate)
const info = computed(() => updateState.updateInfo)

const title = computed(() => (forceUpdate.value ? t('update.forceTitle') : t('update.newVersion')))
const version = computed(() => String(info.value?.version || '').replace(/^v/i, ''))
const currentVersion = computed(() => String(appVersion || '0.0.0').replace(/^v/i, ''))
const changelogLines = computed(() =>
  pickChangelog(info.value, getLocale())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
)
const sizeText = computed(() => {
  if (info.value?.fileSize == null) return ''
  return formatBytes(info.value.fileSize)
})

// 确认：关闭弹框并触发渠道化更新（Play 走 In-app Updates，store 走浏览器打开 updateUrl）
let confirmedClose = false
let reopenTimer = null
function onConfirm() {
  confirmedClose = true
  updateState.updateDialogVisible = false
  confirmUpdate().catch(() => {})
}

function onClose() {
  confirmedClose = false
  updateState.updateDialogVisible = false
}

// 强制更新防退出：被非确认方式关闭（如系统返回键）时 200ms 后重新弹出
watch(
  () => updateState.updateDialogVisible,
  (nowVisible) => {
    if (nowVisible) {
      // 弹框打开：清除待执行的重新弹出定时器，并重置 confirmedClose
      clearTimeout(reopenTimer)
      confirmedClose = false
      return
    }
    if (confirmedClose) return
    if (!forceUpdate.value) return
    clearTimeout(reopenTimer)
    reopenTimer = setTimeout(() => {
      // 触发时再校验一次强制更新状态，避免状态已变化仍强制弹回
      if (forceUpdate.value) updateState.updateDialogVisible = true
    }, 200)
  }
)

// 组件卸载时清除待执行的重新弹出定时器，避免泄漏
onUnmounted(() => clearTimeout(reopenTimer))
</script>

<style scoped>
.update-dialog {
  /* 弹框内按钮主色统一定为品牌蓝 */
  --van-primary-color: #006dd8;
  overflow: hidden;
}
.update-dialog :deep(.van-dialog__header) {
  padding: 0;
  margin: 0;
}
.update-dialog :deep(.van-dialog__footer) {
  padding-top: 10px;
}
.update-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px 14px;
  border-bottom: 1px solid #eef0f3;
}
.update-header-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #2c5aa0;
}
.update-header-version {
  display: inline-block;
  background: linear-gradient(135deg, #2c5aa0, #006dd8);
  color: #fff;
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}
.update-content {
  padding: 14px 22px 12px;
  text-align: left;
}
.update-current {
  margin: 0 0 14px;
  font-size: 12px;
  color: #9aa0a8;
}
.update-changelog-label {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2430;
}
.update-changelog-list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 150px;
  overflow-y: auto;
}
.update-changelog-list li {
  position: relative;
  padding-left: 18px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #3f4650;
  line-height: 1.6;
}
.update-changelog-list li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2c5aa0, #006dd8);
}
.update-size {
  margin: 12px 0 0;
  font-size: 12px;
  color: #9aa0a8;
}
.update-force {
  margin: 12px 0 0;
  background: #fef2f2;
  color: #d92d20;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
}
</style>
