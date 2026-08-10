// src/utils/updateState.js
import { reactive } from 'vue'

export const updateState = reactive({
  hasUpdate: false,
  updateInfo: null,
  updateInProgress: false,   // Play 更新进行中（flexible 下载 / immediate 流程），拦截重复手动检查
  updateDialogVisible: false,   // 更新弹框是否显示
  forceUpdate: false,           // 是否强制更新
})
