<template>
  <div class="user-page">
    <van-nav-bar :title="$t('nav.userCenter')" left-arrow @click-left="handleBack" fixed placeholder />

    <div class="user-content">
      <div class="avatar-section">
        <img src="@/assets/images/user.png" class="user-avatar" />
        <p class="user-name">{{ userInfo?.Name || userInfo?.userAID || userInfo?.AID || $t('user.unknown') }}</p>
      </div>

      <div class="info-list">
        <van-cell-group inset>
          <van-cell :title="$t('user.userId')" :value="userInfo?.AID || '-'" />
          <van-cell :title="$t('user.username')" :value="userInfo?.Name || '-'" />
          <van-cell :title="$t('user.version')" :value="$t('version')" />
        </van-cell-group>
      </div>

      <div class="info-list">
        <van-cell-group inset>
          <van-cell :title="$t('lang.label')" is-link :value="langLabel" @click="showLangPicker = true" />
        </van-cell-group>
      </div>

      <div class="logout-section">
        <van-button type="danger" block round @click="handleLogout">{{ $t('user.logout') }}</van-button>
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
  { text: t('lang.zhTW'), value: 'zh-TW' },
  { text: t('lang.en'), value: 'en' },
])

const langIndex = computed(() => {
  const cur = getLocale()
  return langOptions.value.findIndex(o => o.value === cur)
})

const langLabel = computed(() => {
  const opt = langOptions.value.find(o => o.value === getLocale())
  return opt ? opt.text : ''
})

onMounted(() => {
  userInfo.value = getUserInfo() || {}
})

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
.user-page { min-height: 100vh; background: #f7f8fa; }
.user-content { padding: 16px; }
.avatar-section { display: flex; flex-direction: column; align-items: center; padding: 32px 0; }
.user-avatar { width: 72px; height: 72px; border-radius: 50%; background: #e5e5e5; }
.user-name { margin-top: 12px; font-size: 18px; color: #333; font-weight: 500; }
.info-list { margin-bottom: 16px; }
.logout-section { padding: 0 16px; }
</style>
