import { baseUrl } from './urlValues.js'

let _token = null
let _userInfo = null

export const getToken = () => _token
export const setToken = (token) => { _token = token }
export const removeToken = () => { _token = null }
export const getUserInfo = () => _userInfo
export const setUserInfo = (info) => { _userInfo = info }
export const removeUserInfo = () => { _userInfo = null }
export const isLoggedIn = () => !!_token

export const clearAuth = () => {
  removeToken()
  removeUserInfo()
  if (window.loginSocket) {
    window.loginSocket.close()
    window.loginSocket = null
  }
}

// 校验响应状态和 token 有效性
const validateResponse = async (res) => {
  if (res.status === 401) { clearAuth(); throw new Error('登录已失效') }
  const data = await res.json()
  if (data.code === 'tm.err.foil.tokenInvalid' || data.code === 'tm.err.foil.tokenWhiteListInvalid') {
    clearAuth(); throw new Error('账号异地登录')
  }
  return data
}

// 发起带认证的请求
export const authRequest = async (url, options = {}) => {
  const token = getToken()
  if (!token) throw new Error('未登录')

  const headers = { 'content-type': 'application/json', 'x-access-token': token, 'yujiang-from-app': 'true', ...options.headers }

  try {
    const res = await fetch(url, { ...options, headers })
    return await validateResponse(res)
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      return authRequestWithProxy(url, options)
    }
    throw err
  }
}

// 代理请求
const authRequestWithProxy = async (url, options = {}) => {
  const token = getToken()
  if (!token) throw new Error('未登录')
  const path = url.replace(baseUrl, '')
  const proxyUrl = `/api${path}?access_token=${encodeURIComponent(token)}`
  const headers = { 'content-type': 'application/json', 'yujiang-from-app': 'true', ...options.headers }
  const res = await fetch(proxyUrl, { ...options, headers })
  return validateResponse(res)
}

// 获取RSA加密后的密码
export const getRSAPwd = async (password) => {
  const url = `${baseUrl}/biz/tmIoTCloud/Interface/loginRSA?password=${encodeURIComponent(password)}`
  const res = await fetch(url, { headers: { 'content-type': 'application/json', 'yujiang-from-app': 'true' } })
  if (!res.ok) throw new Error('获取加密信息失败')
  const bytes = await res.arrayBuffer()
  return new TextDecoder().decode(bytes)
}

// 执行登录
export const login = async (userAID, rsaPwd) => {
  const res = await fetch(`${baseUrl}/app/account/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'yujiang-from-app': 'true' },
    body: JSON.stringify({ userAID, encryptedPassword: rsaPwd, rememberMe: true, loginType: 'userID', _: Date.now().toString(), terminalType: 2 })
  })
  if (!res.ok) throw new Error('登录请求失败')
  const data = await res.json()
  if (data.code && data.code !== '0') throw new Error(data.message || '登录失败')
  return data.access_token
}

// WebSocket连接（多设备登录互踢）
export const connectWebSocket = (token, userAID, terminalType = 2, onForceLogout) => {
  try {
    const socket = new WebSocket(`wss://tmplascloud.com?token=${token}`)
    let heartbeat = null
    let reconnectAttempts = 0

    socket.onopen = () => {
      console.log('WebSocket连接成功')
      reconnectAttempts = 0
      socket.send(JSON.stringify({ cmd: 'subscribe', room: `${userAID}_${terminalType}` }))
      heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ cmd: 'ping' }))
      }, 30000)
    }

    socket.onmessage = (event) => {
      console.log('收到WebSocket消息，检测到其他设备登录:', event.data)
      clearAuth()
      window.__forceLogout = true
      window.dispatchEvent(new CustomEvent('forceLogout'))
      setTimeout(() => { window.location.href = '#/login' }, 2000)
      if (onForceLogout) onForceLogout()
    }

    socket.onclose = (event) => {
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null }
      if (!event.wasClean && token && reconnectAttempts < 5) {
        reconnectAttempts++
        setTimeout(() => connectWebSocket(token, userAID, terminalType, onForceLogout), 5000)
      }
    }

    socket.onerror = (e) => console.error('WebSocket连接错误:', e)
    window.loginSocket = socket
    return socket
  } catch (e) {
    console.error('WebSocket连接失败:', e)
    return null
  }
}
