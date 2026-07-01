<template>
  <div class="about-page">
    <van-nav-bar :title="$t('user.about')" style="--van-nav-bar-background: #006dd8; --van-nav-bar-title-text-color: #fff; --van-nav-bar-icon-color: #fff; --van-nav-bar-height: 44px; --van-nav-bar-title-font-size: 17px;">
      <template #left>
        <van-icon name="arrow-left" size="18" color="#fff" @click="router.replace('/user-info')" />
      </template>
    </van-nav-bar>

    <div class="content">
      <div class="item" v-for="item in items" :key="item.key">
        <strong>{{ $t(item.key) }}</strong>
        <span>{{ $t(item.val) }}</span>
      </div>
    </div>
    <div class="version">
      <p>{{ $t('about.version') }}:{{ appVersion }}</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { appVersion } from '../utils/urlValues.js'

const router = useRouter()

const items = [
  { key: 'about.platform', val: 'about.platform.value' },
  { key: 'about.owner',    val: 'about.owner.value' },
  { key: 'about.address',  val: 'about.address.value' },
  { key: 'about.contact',  val: 'about.contact.value' },
  { key: 'about.phone',    val: 'about.phone.value' },
  { key: 'about.fax',      val: 'about.fax.value' },
  { key: 'about.mail',     val: 'about.mail.value' },
]
</script>

<style scoped>
.about-page { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }

.content { padding: 25px 30px; display: flex; flex-direction: column; gap: 16px; }

.item { display: flex; flex-direction: column; gap: 2px; }

.item strong { font-size: 13px; color: #333; }

.item span { font-size: 15px; color: #333; word-break: break-all; }

.version {
  position: fixed; left: 0; right: 0; bottom: 10px;
  text-align: center; font-size: 12px; color: gray; line-height: 20px;
}

</style>
