// variants.mjs — 所有变体配置的唯一入口
// 新增变体：在此文件追加一个配置块 + package.json 加一条 build 命令

// 版本号唯一入口：发版只需改这里，5 个变体同步生效
// APP_VERSION 不含 v 前缀（web 端 appVersion 由模板自动加 v），VERSION_CODE 为 Android 版本号（每次发版递增）
export const APP_VERSION = '4.3.0'
export const VERSION_CODE = 1

export const variants = {
  // 弘塑云-生产环境-国际版
  'hongsuyun-prod': {
    appName: 'hongsuyun-prod', // 服务端根据 app 参数区分是哪个 App，返回对应的最新版本信息
    appVersion: APP_VERSION, // App 版本号（versionName，web 端 appVersion 自动加 v 前缀）
    versionCode: VERSION_CODE, // Android 版本号（每次发版递增）
    appId: 'com.tmiot.tmplascloud', // 应用唯一标识符（即包名/Bundle ID）
    baseUrl: 'https://tpc.tmplascloud.net', // 应用基础 URL
    loginSocket: 'wss://tpc.tmplascloud.net', // WebSocket 地址
    projectUrl: 'https://tpc.tmplascloud.net/wx', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
    projectOID: '11197', // 项目 ID（必填，用于登录时判断用户是否有项目权限）
    ttcVersion: '', // ttc版本号
    iconDir: 'tpc', // 定构建时复制哪套 Android 原生图标到 main/res/
    logoAsset: 'logo_hongsuyun_net.png', // 登录页显示的Logo图片
    appDisplayNameZhCN: '弘塑云', // APP名称和顶部栏显示的名称
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'tmPlasCloud',
    updateChannel: 'play', // 更新渠道：'play'=Google Play（In-app Updates），'store'=浏览器打开 updateUrl
  },

  // 弘塑云-生产环境-国内版
  'hongsuyun-cn': {
    appName: 'hongsuyun-cn', // 服务端根据 app 参数区分是哪个 App，返回对应的最新版本信息
    appVersion: APP_VERSION, // App 版本号（versionName，web 端 appVersion 自动加 v 前缀）
    versionCode: VERSION_CODE, // Android 版本号（每次发版递增）
    appId: 'com.tmiot.tpc', // 应用唯一标识符（即包名/Bundle ID）
    baseUrl: 'https://tpc.tmplascloud.com', // 应用基础 URL
    loginSocket: 'wss://tpc.tmplascloud.com', // WebSocket 地址
    projectUrl: 'https://tpc.tmplascloud.com/wx', // 项目 URL
    projectOID: '', // 项目 ID（必填，用于登录时判断用户是否有项目权限）
    ttcVersion: '', // ttc版本号
    iconDir: 'tpc_cn', // 定构建时复制哪套 Android 原生图标到 main/res/
    logoAsset: 'logo_hongsuyun.png', // 登录页显示的Logo图片
    appDisplayNameZhCN: '弘塑云', // APP名称和顶部栏显示的名称
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'tmPlasCloud',
    updateChannel: 'store', // 更新渠道：'play'=Google Play（In-app Updates），'store'=浏览器打开 updateUrl
  },

  // 弘塑云-测试环境
  'hongsuyun-test': {
    appName: 'hongsuyun-test',
    appVersion: APP_VERSION, // App 版本号（versionName，web 端 appVersion 自动加 v 前缀）
    versionCode: VERSION_CODE, // Android 版本号（每次发版递增）
    appId: 'com.tmiot.tpc',
    baseUrl: 'https://ttc.tmiotstudio.com',
    loginSocket: 'ws://ttc.tmiotstudio.com',
    projectOID: '11275', // 项目 ID（必填，用于登录时判断用户是否有项目权限）
    ttcVersion: '2.7.0',
    projectUrl: '', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
    iconDir: 'tpc',
    logoAsset: 'logo_hongsuyun_net.png',
    appDisplayNameZhCN: '弘塑云',
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'tmPlasCloud',
    updateChannel: 'store', // 更新渠道：'play'=Google Play（In-app Updates），'store'=浏览器打开 updateUrl
  },

  // 弘设汇-生产环境
  'hongshehui-prod': {
    appName: 'hongshehui',
    appVersion: APP_VERSION, // App 版本号（versionName，web 端 appVersion 自动加 v 前缀）
    versionCode: VERSION_CODE, // Android 版本号（每次发版递增）
    appId: 'cn.com.tmiot.tic',
    baseUrl: 'https://tmplascloud.com',
    loginSocket: 'wss://tmplascloud.com',
    projectOID: '10238',
    ttcVersion: '2.6.0',
    projectUrl: '', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
    iconDir: 'tic',
    logoAsset: 'logo_hongshehui.png',
    appDisplayNameZhCN: '弘设汇',
    appDisplayNameZhTW: '弘設匯',
    appDisplayNameEn: 'TIC',
    updateChannel: 'store', // 更新渠道：'play'=Google Play（In-app Updates），'store'=浏览器打开 updateUrl
  },

  // 弘设汇-测试环境
  'hongshehui-test': {
    appName: 'hongshehui',
    appVersion: APP_VERSION, // App 版本号（versionName，web 端 appVersion 自动加 v 前缀）
    versionCode: VERSION_CODE, // Android 版本号（每次发版递增）
    appId: 'cn.com.tmiot.hongshehui.test',
    baseUrl: 'https://imro.tmiot.com.cn',
    loginSocket: 'wss://imro.tmiot.com.cn',
    projectOID: '10591',
    ttcVersion: '2.6.0',
    projectUrl: '', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
    iconDir: 'tic',
    logoAsset: 'logo_hongshehui.png',
    appDisplayNameZhCN: '弘设汇',
    appDisplayNameZhTW: '弘設匯',
    appDisplayNameEn: 'TIC',
    updateChannel: 'store', // 更新渠道：'play'=Google Play（In-app Updates），'store'=浏览器打开 updateUrl
  },
}
