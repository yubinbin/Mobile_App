import 'vant/lib/index.css'

import { Button, Field, Icon, NavBar, Checkbox, Loading, Empty, Dialog, Toast, Cell, CellGroup, Popup, Picker } from 'vant'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { t } from './i18n'

const app = createApp(App)
app.use(router)
app.config.globalProperties.$t = t
;[Button, Field, Icon, NavBar, Checkbox, Loading, Empty, Dialog, Toast, Cell, CellGroup, Popup, Picker].forEach(c => app.use(c))
app.mount('#app')
