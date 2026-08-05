// src/utils/updateState.js
import { reactive } from 'vue'

export const updateState = reactive({
  hasUpdate: false,
  updateInfo: null,
  downloadState: 'idle',
  downloadProgress: 0,
  downloadedSize: '',
  totalSize: '',
  updateDialogVisible: false,   // 更新弹框是否显示
  forceUpdate: false,           // 是否强制更新
})
