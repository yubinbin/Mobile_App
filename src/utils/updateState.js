// src/utils/updateState.js
import { reactive } from 'vue'

export const updateState = reactive({
  hasUpdate: false,
  updateInfo: null,
  downloadState: 'idle',
  downloadProgress: 0,
  downloadedSize: '',
  totalSize: '',
})
