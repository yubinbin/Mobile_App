import { Capacitor } from '@capacitor/core'
import { JPush } from 'capacitor-plugin-jpushn'

let initialized = false

export const initializeJPush = async () => {
    if (!Capacitor.isNativePlatform() || initialized) return
    initialized = true

    await JPush.startJPush()                    // 无条件启动，与权限无关

    const status = await JPush.checkPermissions()   // 注意字段是 permission
    if (status.permission !== 'granted') {
        await JPush.requestPermissions()
    }

    JPush.addListener('notificationReceived', d => console.log('收到推送', d))
    JPush.addListener('notificationOpened', d => console.log('点击推送', d))
}
