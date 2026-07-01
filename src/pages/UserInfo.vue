<template>
  <div class="user-page">
    <van-nav-bar :title="$t('nav.userCenter')" style="--van-nav-bar-background: #006dd8; --van-nav-bar-title-text-color: #fff; --van-nav-bar-icon-color: #fff; --van-nav-bar-height: 44px; --van-nav-bar-title-font-size: 17px;">
      <template #left>
        <van-icon name="arrow-left" size="18" color="#fff" @click="handleBack" />
      </template>
    </van-nav-bar>

    <div class="user-profile">
      <img src="@/assets/images/defaultAvatar.png" class="avatar" />
      <div class="user-info">
        <p class="user-name">{{ userInfo?.Name || userInfo?.AID || $t('user.unknown') }}</p>
        <p class="user-dept">{{ userInfo?.org?.data?.Name }}</p>
      </div>
    </div>

    <div class="content">
      <van-cell-group inset class="menu-group">
        <van-cell is-link @click="showLangPicker = true" style="--van-cell-vertical-padding: 19px;">
          <template #title>
            <div class="menu-title-wrap">
              <img src="@/assets/images/language.png" class="menu-img" />
              <span class="menu-text">{{ $t('user.langSwitch') }}</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group inset class="menu-group" style="margin-top: 8px;">
        <van-cell is-link @click="handleCheckUpdate" style="--van-cell-vertical-padding: 19px;">
          <template #title>
            <div class="menu-title-wrap">
              <img src="@/assets/images/checkUpdate.png" class="menu-img" />
              <span class="menu-text">{{ $t('update.checkUpdate') }}</span>
            </div>
          </template>
          <template #value>
            <span class="version-text">{{ appVersion }}</span>
            <span v-if="updateState.hasUpdate" class="update-dot"></span>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group inset class="menu-group" style="margin-top: 8px;">
        <van-cell is-link @click="router.push('/about')" style="--van-cell-vertical-padding: 19px;">
          <template #title>
            <div class="menu-title-wrap">
              <img src="@/assets/images/about.png" class="menu-img" />
              <span class="menu-text">{{ $t('user.about') }}</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="logout-wrap">
        <van-cell-group inset>
          <van-cell :title="$t('user.logout')" @click="handleLogout" class="logout-cell" style="--van-cell-vertical-padding: 12px;" />
        </van-cell-group>
      </div>
    </div>

    <van-popup v-model:show="showLangPicker" round position="bottom">
      <van-picker :columns="langOptions" :default-index="langIndex" @confirm="onLangConfirm" @cancel="showLangPicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo, clearAuth } from '../utils/auth.js'
import { showConfirmDialog } from 'vant'
import { setLocale, getLocale, t } from '../i18n'
import { checkManually } from '../utils/appUpdater.js'
import { updateState } from '../utils/updateState.js'
import { appVersion } from '../utils/urlValues.js'

const router = useRouter()
const userInfo = ref({})
const showLangPicker = ref(false)

const langOptions = computed(() => [
  { text: t('lang.zhCN'), value: 'zh-CN' },
  { text: t('lang.zhTW'), value: 'zh-HK' },
  { text: t('lang.en'), value: 'en-US' },
])

const langIndex = computed(() => langOptions.value.findIndex(o => o.value === getLocale()))

onMounted(() => { userInfo.value = getUserInfo() || {} })

const handleBack = () => router.replace('/project-view')

const onLangConfirm = ({ selectedOptions }) => {
  setLocale(selectedOptions[0].value)
  showLangPicker.value = false
}

const handleCheckUpdate = () => {
  checkManually()
}

const handleLogout = () => {
  showConfirmDialog({ title: t('dialog.title'), message: t('user.logoutConfirm') }).then(() => {
    clearAuth()
    localStorage.removeItem('LoginData')
    localStorage.removeItem('CurrentUser')
    router.replace('/login')
  }).catch(() => {})
}
</script>

<style scoped>
.user-page { min-height: 100vh; background: #f0f2f7; display: flex; flex-direction: column; }

.user-profile { display: flex; align-items: center; gap: 16px; background: #006dd8; height: 112px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; margin-left: 18px; background: rgba(255,255,255,0.3); }
.user-name { font-size: 24px; font-weight: medium; color: #fff; margin: 0 0 4px; }
.user-dept { font-size: 16px; color: #DAEAFA; margin: 0; }

.content { flex: 1; padding: 20px 0; display: flex; flex-direction: column; }
.menu-group { margin-bottom: 0; }

.menu-title-wrap { display: flex; align-items: center; }
.menu-img { width: 24px; height: 24px; margin-right: 10px; }
.menu-text { font-size: 16px; line-height: 24px; color: #334155; white-space: nowrap; }

.logout-wrap { margin-top: auto; margin-bottom: 55px; padding: 0 16px; }
:deep(.logout-cell .van-cell__title) { color: #f05050; text-align: center; font-size: 16px; }

:deep(.van-hairline--bottom::after) { border-bottom-width: 0; }

.version-text {
  font-size: 14px; color: #999; margin-right: 6px; vertical-align: middle;
}

.update-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: #FF4444; vertical-align: middle;
}
</style>
