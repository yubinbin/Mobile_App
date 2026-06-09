<template>
  <div class="about-page">
    <van-nav-bar :title="$t('user.about')" style="--van-nav-bar-background: #006dd8; --van-nav-bar-title-text-color: #fff; --van-nav-bar-icon-color: #fff; --van-nav-bar-height: 44px; --van-nav-bar-title-font-size: 17px;">
      <template #left>
        <van-icon name="arrow-left" size="18" color="#fff" @click="router.back()" />
      </template>
    </van-nav-bar>

    <!-- <div class="content">
    </div> -->
    <div class="content">
      <p>{{ $t('about.platform') }}：tmIoT物联网云平台</p>
      <p>{{ $t('about.owner') }}：宁波弘讯软件开发有限公司</p>
      <p>{{ $t('about.address') }}：西安市雁塔区锦业一路宝德云谷国际</p>
      <p>{{ $t('about.contact') }}：宋先生</p>
      <p>{{ $t('about.phone') }}：029-35697841</p>
      <p>{{ $t('about.fax') }}：029-35697841</p>
      <p>{{ $t('about.mail') }}：xian@techamtion.com.cn</p>
    </div>
    <div class="version">
      <p>{{ $t('about.version') }}:v1.0.7</p>
      <p class="check-update" @click="handleCheckUpdate">{{ $t('update.checkUpdate') }}</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { checkManually } from '../utils/appUpdater.js'

const router = useRouter()

const handleCheckUpdate = () => {
  checkManually()
}
</script>

<style scoped>
.about-page { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }

.content {
  padding: 25px 30px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.content p {
  margin: 0 0 8px 0;
  font-size: 15px;
  color: #333;
  word-break: break-all;
}

.version {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 10px;
  text-align: center;
  font-size: 12px;
  color: gray;
  line-height: 20px;
}

.check-update {
  margin-top: 6px;
  color: #006dd8;
  text-decoration: underline;
  cursor: pointer;
}
</style>
