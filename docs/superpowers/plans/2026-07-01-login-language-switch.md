# 登录页增加语言切换功能 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在登录页的自动登录复选框和登录按钮之间增加语言切换入口

**Architecture:** 仅修改 `Login.vue`，复用现有的 `setLocale`/`getLocale`/`t` 和 Vant Popup/Picker 组件，与 UserInfo.vue 实现模式一致

**Tech Stack:** Vue 3, Vant 4 (Popup, Picker, Icon)

## Global Constraints

- 复用 i18n 现有 key（`user.langSwitch`、`lang.zhCN`、`lang.zhTW`、`lang.en`），不新增
- 语言值键名与 `src/i18n/index.js` 中 `messages` 一致：`'zh-CN'`、`'zh-HK'`、`'en-US'`
- Popup 和 Picker 已在 main.js 全局注册，无需 import

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/pages/Login.vue` | 修改 | 模板新增语言行 + script 新增语言选择逻辑 + 样式 |

---

### Task 1: Login.vue 增加语言切换功能

**Files:**
- Modify: `src/pages/Login.vue`

**Interfaces:**
- Consumes: `setLocale`, `getLocale` from `../i18n`；`t` 已导入
- Consumes: `Popup`, `Picker` from vant（全局注册）

- [ ] **Step 1: 新增 import 和响应式变量**

在 `<script setup>` 中修改：

```js
import { ref, computed, onMounted, onUnmounted } from 'vue'
```

新增 import：

```js
import { setLocale, getLocale, t } from '../i18n'
```

新增响应式变量和计算属性（放在 `const showPwd = ref(false)` 之后）：

```js
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
```

注意：`import { t } from '../i18n'` 已存在于第 68 行，只需扩展为 `import { setLocale, getLocale, t } from '../i18n'`。

- [ ] **Step 2: 模板新增语言行**

在 `</div>`（form-section 的结束标签，第 49 行 `</div>` 之前）和 `<div class="button-section">` 之间插入：

```html
      <div class="lang-row" @click="showLangPicker = true">
        <span>{{ $t('user.langSwitch') }}：{{ langLabel }}</span>
        <van-icon name="arrow-down" size="14" color="#999" />
      </div>
```

在 `</template>` 之前（footer div 之后）添加 Popup：

```html
    <van-popup v-model:show="showLangPicker" round position="bottom">
      <van-picker :columns="langOptions" :default-index="langIndex" @confirm="onLangConfirm" @cancel="showLangPicker = false" />
    </van-popup>
```

- [ ] **Step 3: 样式新增**

在 `<style scoped>` 中 `.auto-login` 样式之后添加：

```css
.lang-row { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 0 8px; font-size: 14px; color: #999; cursor: pointer; }
```

- [ ] **Step 4: 构建验证 + 提交**

执行构建：

```bash
npx vite build
```

预期：构建成功，无错误。

提交：

```bash
git add src/pages/Login.vue
git commit -m "feat: 登录页增加语言切换功能"
```

---

## 验证清单

| # | 验证场景 | 预期行为 |
|---|---------|---------|
| 1 | 登录页点击语言行 | 弹出底部 Picker，当前语言高亮 |
| 2 | 选择繁体中文 | 所有文案切换为繁体 |
| 3 | 选择 English | 所有文案切换为英文 |
| 4 | 切换后再次切换 | 正常切换，Picker 高亮正确 |
| 5 | 登录后进入用户中心 | 语言设置保持，用户中心也显示对应语言 |
| 6 | Popup 点击遮罩关闭 | 语言不变，Picker 消失 |
