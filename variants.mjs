// variants.mjs — 所有变体配置的唯一入口
// 新增变体：在此文件追加一个配置块 + package.json 加一条 build 命令

export const variants = {
  // 弘塑云-生产环境-国际版
  'hongsuyun-prod': {
    appName: 'hongsuyun', // 服务端根据 app 参数区分是哪个 App，返回对应的最新版本信息
    appId: 'com.tmiot.tmplascloud', // 应用唯一标识符（即包名/Bundle ID）
    baseUrl: 'https://tmplascloud.net', // 应用基础 URL
    loginSocket: 'wss://tmplascloud.net', // WebSocket 地址
    projectOID: '11024', // 项目 ID
    ttcVersion: '2.7.0', // ttc版本号
    iconDir: 'tpc', // 定构建时复制哪套 Android 原生图标到 main/res/
    logoAsset: 'logo_hongsuyun.png', // 登录页显示的Logo图片
    appDisplayNameZhCN: '弘塑云', // APP名称和顶部栏显示的名称
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'TM Plas Cloud',
    iosAppName: '弘塑云',
  },

  // 弘塑云-测试环境
  'hongsuyun-test': {
    appName: 'hongsuyun',
    appId: 'cn.com.tmiot.hongsuyun.test',
    baseUrl: 'http://1.82.232.147:8209',
    loginSocket: 'ws://1.82.232.147:8209',
    projectOID: '10994',
    ttcVersion: '2.7.0',
    iconDir: 'tpc',
    logoAsset: 'logo_hongsuyun.png',
    appDisplayNameZhCN: '弘塑云',
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'TM Plas Cloud',
    iosAppName: '弘塑云',
  },

  // 弘设汇-生产环境
  'hongshehui-prod': {
    appName: 'hongshehui',
    appId: 'cn.com.tmiot.tic',
    baseUrl: 'https://tmplascloud.com',
    loginSocket: 'wss://tmplascloud.com',
    projectOID: '10238',
    ttcVersion: '2.6.0',
    iconDir: 'tic',
    logoAsset: 'logo_hongshehui.png',
    appDisplayNameZhCN: '弘设汇',
    appDisplayNameZhTW: '弘設匯',
    appDisplayNameEn: 'TIC',
    iosAppName: '弘设汇',
  },

  // 弘设汇-测试环境
  'hongshehui-test': {
    appName: 'hongshehui',
    appId: 'cn.com.tmiot.hongshehui.test',
    baseUrl: 'https://imro.tmiot.com.cn',
    loginSocket: 'wss://imro.tmiot.com.cn',
    projectOID: '10591',
    ttcVersion: '2.6.0',
    iconDir: 'tic',
    logoAsset: 'logo_hongshehui.png',
    appDisplayNameZhCN: '弘设汇',
    appDisplayNameZhTW: '弘設匯',
    appDisplayNameEn: 'TIC',
    iosAppName: '弘设汇',
  },
}
