<template>
  <div class="user-page">
    <div class="header">
      <van-icon name="arrow-left" class="back-btn" @click="handleBack" />
      <span class="header-title">{{ $t('nav.userCenter') }}</span>
      <div class="user-profile">
        <img src="@/assets/images/user.png" class="avatar" />
        <div class="user-info">
          <p class="user-name">{{ userInfo?.Name || userInfo?.userAID || userInfo?.AID || $t('user.unknown') }}</p>
          <p class="user-dept">{{ $t('user.company') }} - {{ $t('user.dept') }}</p>
        </div>
      </div>
    </div>

    <div class="content">
      <van-cell-group inset class="menu-group">
        <van-cell is-link @click="showLangPicker = true">
          <template #title>
            <span class="menu-icon lang-icon">文<sub>A</sub></span>
            <span class="menu-text">{{ $t('user.langSwitch') }}</span>
          </template>
        </van-cell>
        <van-cell is-link>
          <template #title>
            <van-icon name="info-o" class="menu-icon info-icon" />
            <span class="menu-text">{{ $t('user.about') }}</span>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="logout-wrap">
        <van-cell-group inset>
          <van-cell class="logout-cell" @click="handleLogout">
            <template #title>
              <span class="logout-text">{{ $t('user.logout') }}</span>
            </template>
          </van-cell>
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

const handleBack = () => router.back()

const onLangConfirm = ({ selectedOptions }) => {
  setLocale(selectedOptions[0].value)
  showLangPicker.value = false
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

.header {
  background: linear-gradient(160deg, #1a6bbf 0%, #1255a0 100%);
  padding: 48px 20px 32px;
  position: relative;
}
.back-btn { position: absolute; top: 52px; left: 16px; font-size: 20px; color: #fff; }
.header-title { display: block; text-align: center; font-size: 18px; color: #fff; font-weight: 500; margin-bottom: 24px; }
.user-profile { display: flex; align-items: center; gap: 14px; padding: 0 4px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.3); }
.user-name { font-size: 22px; font-weight: bold; color: #fff; margin: 0 0 4px; }
.user-dept { font-size: 14px; color: rgba(255,255,255,0.85); margin: 0; }

.content { flex: 1; padding: 20px 16px; display: flex; flex-direction: column; }
.menu-group { margin-bottom: 0; }

.menu-icon { font-size: 20px; color: #1a6bbf; margin-right: 10px; vertical-align: middle; }
.lang-icon { font-size: 15px; font-weight: bold; color: #1a6bbf; display: inline-block; margin-right: 10px; vertical-align: middle; }
.info-icon { vertical-align: middle; }
.menu-text { font-size: 15px; color: #333; vertical-align: middle; }

.logout-wrap { margin-top: auto; padding-top: 16px; }
.logout-cell { text-align: center; }
.logout-text { color: #f05050; font-size: 16px; display: block; text-align: center; }
</style>
