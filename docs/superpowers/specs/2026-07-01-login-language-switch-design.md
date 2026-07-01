# 登录页增加语言切换功能 — 设计文档

**日期**: 2026-07-01  
**状态**: 设计中

---

## 1. 概述

在登录页增加语言切换入口，让用户在登录前即可选择界面语言。复用现有的国际化体系和用户中心已有的语言选择器模式。

## 2. 设计

### 位置

在自动登录复选框和登录按钮之间，插入一行语言选择入口：

```
┌──────────────────────────────────┐
│  [用户名输入框]                    │
│  [密码输入框]                      │
│  ☐ 自动登录                       │
│                                  │
│  语言：简体中文            ▼      │  ← 新增
│                                  │
│  [        登  录        ]         │
└──────────────────────────────────┘
```

### 交互

- 显示当前语言名称 + 右侧箭头
- 点击后弹出底部 Picker（复用 Vant Popup + Picker）
- 选择语言后即时切换，登录页本身文案实时更新

### 实现

| 操作 | 说明 |
|------|------|
| 修改 `src/pages/Login.vue` | 模板新增语言行 + script 新增语言选择逻辑 + 少量样式 |

**需新增的 imports**：
- `setLocale`、`getLocale` from `../i18n`（`t` 已导入）
- `Popup`、`Picker` from `vant`（已在 main.js 全局注册，组件可直接用）

**需新增的响应式变量**：
- `showLangPicker: ref(false)`
- `langOptions`（computed，与 UserInfo.vue 一致）
- `langIndex`（computed，当前选中索引）

**模板新增**（插入在自动登录和登录按钮之间）：
```html
<div class="lang-row" @click="showLangPicker = true">
  <span>{{ $t('user.langSwitch') }}：{{ langLabel }}</span>
  <van-icon name="arrow-down" size="14" color="#999" />
</div>

<van-popup v-model:show="showLangPicker" round position="bottom">
  <van-picker :columns="langOptions" :default-index="langIndex" @confirm="onLangConfirm" @cancel="showLangPicker = false" />
</van-popup>
```

**computed 新增**：
```js
const langOptions = computed(() => [
  { text: t('lang.zhCN'), value: 'zh-CN' },
  { text: t('lang.zhTW'), value: 'zh-HK' },
  { text: t('lang.en'), value: 'en-US' },
])
const langIndex = computed(() => langOptions.value.findIndex(o => o.value === getLocale()))
const langLabel = computed(() => langOptions.value.find(o => o.value === getLocale())?.text || '')
```

**onLangConfirm**：
```js
const onLangConfirm = ({ selectedOptions }) => {
  setLocale(selectedOptions[0].value)
  showLangPicker.value = false
}
```

**样式**：
```css
.lang-row { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 0 8px; font-size: 14px; color: #999; cursor: pointer; }
```

## 3. 与现有实现的关系

- 完全复用 UserInfo.vue 的语言选择模式（Popup + Picker + `setLocale`/`getLocale`）
- 语言选项和值与 `src/i18n/index.js` 中的 `messages` 键名一致
- 切换后登录页本身会因 `$t()` 响应式更新而实时切换
- 不新增国际化 key，复用已有的 `user.langSwitch`、`lang.zhCN`、`lang.zhTW`、`lang.en`

## 4. 测试要点

| 场景 | 预期 |
|------|------|
| 登录页点击语言行 | 弹出底部 Picker，当前语言高亮 |
| 选择繁体中文 | 登录页所有文案切换为繁体（用户名、密码、自动登录、登录按钮、底部版权） |
| 选择 English | 同上，切换为英文 |
| 选择后再次切换 | 正常切换 |
| 登录后进入用户中心 | 语言设置保持 |
| Popup 点击遮罩关闭 | 语言不变 |
