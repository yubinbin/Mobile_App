<template>
  <div class="login-page">
    <div class="safe-area-top"></div>

    <div class="logo-section">
      <img src="@/assets/images/logo_hongsuyun.png" alt="弘塑云" class="logo-img" />
    </div>

    <div class="form-section">
      <div class="input-wrapper">
        <van-field
          v-model="userAID"
          :placeholder="$t('login.username')"
          :border="false"
          @keyup.enter="doLogin"
        >
          <template #left-icon>
            <van-icon name="contact-o" class="field-icon" />
          </template>
        </van-field>
      </div>

      <div class="input-wrapper">
        <van-field
          v-model="password"
          :type="showPwd ? 'text' : 'password'"
          :placeholder="$t('login.password')"
          :border="false"
          @keyup.enter="doLogin"
        >
          <template #left-icon>
            <van-icon name="lock" class="field-icon" />
          </template>
          <template #right-icon>
            <van-icon
              :name="showPwd ? 'eye-o' : 'closed-eye'"
              class="eye-icon"
              @click="showPwd = !showPwd"
            />
          </template>
        </van-field>
      </div>

      <div class="auto-login">
        <van-checkbox v-model="autoLogin" shape="square" icon-size="16px">
          <span class="auto-login-text">{{ $t('login.autoLogin') }}</span>
        </van-checkbox>
      </div>
    </div>

    <div class="button-section">
      <van-button type="primary" block round class="login-btn" :loading="loading" @click="doLogin">
        {{ $t('login.button') }}
      </van-button>
    </div>

    <div class="lang-row" @click="showLangPicker = true">
      <span>{{ $t('user.langSwitch') }}：{{ langLabel }}</span>
      <van-icon name="arrow-down" size="14" color="#999" />
    </div>

    <div class="footer">
      <p class="version">{{ appVersion }}</p>
      <p class="copyright">{{ $t('login.footer') }}</p>
    </div>
  </div>

    <van-popup v-model:show="showLangPicker" round position="bottom">
      <van-picker :columns="langOptions" :default-index="langIndex" @confirm="onLangConfirm" @cancel="showLangPicker = false" />
    </van-popup>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { setLocale, getLocale, t } from '../i18n'
import { loginRSA, login, baseUrl, projectOID, ttcVersion, loginSocket, appVersion } from '../utils/urlValues.js'
import { setToken, setUserInfo, clearAuth } from '../utils/auth.js'
import { checkOnLaunch } from '../utils/appUpdater.js'

const route = useRoute()
const router = useRouter()

const userAID = ref('')
const password = ref('')
const autoLogin = ref(false)
const loading = ref(false)
const showPwd = ref(false)

const showLangPicker = ref(false)

const langOptions = computed(() => [
  { text: t('lang.zhCN'), value: 'zh-CN' },
  { text: t('lang.zhTW'), value: 'zh-HK' },
  { text: t('lang.en'), value: 'en-US' },
])

const langIndex = computed(() => langOptions.value.findIndex(o => o.value === getLocale()))

const langLabel = computed(() => langOptions.value.find(o => o.value === getLocale())?.text || '')

const onLangConfirm = ({ selectedOptions }) => {
  setLocale(selectedOptions[0].value)
  showLangPicker.value = false
}

onMounted(() => {
  if (window.loginSocket) {
    window.loginSocket.close()
    window.loginSocket = null
  }

  window.addEventListener('forceLogout', handleForceLogout)

  const saved = localStorage.getItem('LoginData')
  if (saved) {
    try {
      const info = JSON.parse(saved)
      userAID.value = info.userAID
      password.value = info.password
      autoLogin.value = true
      if (!route.query.exitApp) doLogin()
    } catch {}
  }
})

const doLogin = async () => {
  const uid = userAID.value.trim()
  if (!uid) { showToast(t('error.validate')); return }
  const pwd = password.value.trim()
  if (!pwd) { showToast(t('error.validatePwd')); return }

  loading.value = true
  try {
    const rsaUrl = `${loginRSA}?password=${encodeURIComponent(pwd)}`
    const rsaRes = await fetch(rsaUrl, { headers: { 'content-type': 'application/json', 'yujiang-from-app': 'true' } })
    const bytes = await rsaRes.arrayBuffer()
    const rsaPwd = new TextDecoder().decode(bytes)

    const params = { userAID: uid, encryptedPassword: rsaPwd, rememberMe: true, loginType: 'userID', _: Date.now().toString(), terminalType: 2 }
    const loginRes = await fetch(login, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'yujiang-from-app': 'true' },
      body: JSON.stringify(params),
    })

    const userInfo = await loginRes.json()
    if (loginRes.status === 400) {
      showToast(userInfo.message || t('error.wrongPwd'))
      loading.value = false
      return
    }

    const token = userInfo.access_token
    if (!token) {
      showToast(t('error.userNotFound'))
      loading.value = false
      return
    }

    setToken(token)
    setUserInfo(userInfo)
    localStorage.setItem('CurrentUser', JSON.stringify(userInfo))

    if (autoLogin.value) {
      localStorage.setItem('LoginData', JSON.stringify({ userAID: uid, password: pwd }))
    } else {
      localStorage.removeItem('LoginData')
    }

    connectSocket(uid, token)

    checkOnLaunch()

    const projectUrl = encodeURIComponent(`${baseUrl}/app/ttcEngineDefalut?ttcVersion=${ttcVersion}&projectOID=${projectOID}&access_token=${token}`)
    window.location.replace(`#/project-view?userOID=${uid}&projectUrl=${projectUrl}`)
  } catch (err) {
    console.error('login error:', err)
    showToast(t('error.network'))
  } finally {
    loading.value = false
  }
}

const connectSocket = (uid, token) => {
  try {
    const ws = new WebSocket(`${loginSocket}?token=${token}`)
    let heartbeat = null

    ws.onopen = () => {
      ws.send(JSON.stringify({ cmd: 'subscribe', room: `${uid}_2` }))
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ cmd: 'ping' }))
      }, 30000)
    }

    ws.onmessage = () => {
      clearAuth()
      if (ws) ws.close()
      showDialog({ title: t('dialog.title'), message: t('error.kicked'), confirmButtonText: t('error.reLogin') }).then(() => {
        router.push({ path: '/login', query: { exitApp: 'true' } })
      })
    }

    ws.onclose = () => { if (heartbeat) clearInterval(heartbeat) }
    window.loginSocket = ws
  } catch {}
}

onUnmounted(() => {
  window.removeEventListener('forceLogout', handleForceLogout)
})

const handleForceLogout = () => {
  showDialog({ title: t('dialog.title'), message: t('error.kicked'), confirmButtonText: t('error.reLogin') }).then(() => {
    userAID.value = ''
    password.value = ''
    autoLogin.value = false
    router.replace('/login')
  })
}
</script>

<style scoped>
.login-page { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
.safe-area-top { height: env(safe-area-inset-top); }
.logo-section { display: flex; justify-content: center; padding-top: 80px; padding-bottom: 60px; }
.logo-img { width: 260px; }
.form-section { padding: 0 32px; }
.input-wrapper { margin-bottom: 24px; border: 1px solid #e5e5e5; border-radius: 28px; overflow: hidden; }
.field-icon { font-size: 22px; color: #999; }
.eye-icon { font-size: 22px; color: #2c5aa0; cursor: pointer; }
:deep(.van-field__left-icon) { margin-right: 12px; display: flex; align-items: center; }
:deep(.van-field__control) { font-size: 16px; color: #333; }
:deep(.van-field__control::placeholder) { color: #ccc; font-size: 16px; }
.auto-login { margin-top: 16px; }
.auto-login-text { font-size: 15px; color: #333; margin-left: 4px; }
.lang-row { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 0 8px; font-size: 14px; color: #999; cursor: pointer; }
:deep(.van-checkbox__icon) { border-color: #ccc; }
:deep(.van-checkbox__icon--checked .van-icon) { background-color: #2c5aa0; border-color: #2c5aa0; }
.button-section { padding: 40px 32px 0; }
.login-btn { height: 48px; font-size: 18px; font-weight: 500; background: linear-gradient(135deg, #2c5aa0 0%, #1e4a8a 100%); border: none; }
.login-btn:active { opacity: 0.9; }
.footer { margin-top: auto; padding-bottom: 40px; text-align: center; }
.version { font-size: 14px; color: #333; margin-bottom: 8px; }
.copyright { font-size: 14px; color: #333; }
</style>
