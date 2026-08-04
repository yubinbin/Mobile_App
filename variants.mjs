// variants.mjs — 所有变体配置的唯一入口
// 新增变体：在此文件追加一个配置块 + package.json 加一条 build 命令

export const variants = {
  // 弘塑云-生产环境-国际版
  'hongsuyun-prod': {
    appName: 'hongsuyun-prod', // 服务端根据 app 参数区分是哪个 App，返回对应的最新版本信息
    appId: 'com.tmiot.tmplascloud', // 应用唯一标识符（即包名/Bundle ID）
    baseUrl: 'https://tpc.tmplascloud.net', // 应用基础 URL
    loginSocket: 'wss://tpc.tmplascloud.net', // WebSocket 地址
    projectUrl: 'https://tpc.tmplascloud.net/wx', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
    projectOID: '', // 项目 ID
    ttcVersion: '', // ttc版本号
    iconDir: 'tpc', // 定构建时复制哪套 Android 原生图标到 main/res/
    logoAsset: 'logo_hongsuyun_net.png', // 登录页显示的Logo图片
    appDisplayNameZhCN: '弘塑云', // APP名称和顶部栏显示的名称
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'TM Plas Cloud',
    iosAppName: 'TM Plas Cloud',
  },

  // 弘塑云-生产环境-国内版
  'hongsuyun-cn': {
    appName: 'hongsuyun-cn', // 服务端根据 app 参数区分是哪个 App，返回对应的最新版本信息
    appId: 'com.tmiot.tpc', // 应用唯一标识符（即包名/Bundle ID）
    baseUrl: 'https://tpc.tmplascloud.com', // 应用基础 URL
    loginSocket: 'wss://tpc.tmplascloud.com', // WebSocket 地址
    projectUrl: 'https://tpc.tmplascloud.com/wx', // 项目 URL
    projectOID: '', // 项目 ID
    ttcVersion: '', // ttc版本号
    iconDir: 'tpc_cn', // 定构建时复制哪套 Android 原生图标到 main/res/
    logoAsset: 'logo_hongsuyun.png', // 登录页显示的Logo图片
    appDisplayNameZhCN: '弘塑云', // APP名称和顶部栏显示的名称
    appDisplayNameZhTW: '弘塑雲',
    appDisplayNameEn: 'TM Plas Cloud',
    iosAppName: '弘塑云',
  },

  // 弘塑云-测试环境
  'hongsuyun-test': {
    appName: 'hongsuyun-test',
    appId: 'com.tmiot.tpc',
    baseUrl: 'https://ttc.tmiotstudio.com',
    loginSocket: 'ws://ttc.tmiotstudio.com',
    projectOID: '11275',
    ttcVersion: '2.7.0',
    projectUrl: '', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
    iconDir: 'tpc_cn',
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
    projectUrl: '', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
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
    projectUrl: '', // 项目 URL（为空时回退用 projectOID + ttcVersion 拼接）
    iconDir: 'tic',
    logoAsset: 'logo_hongshehui.png',
    appDisplayNameZhCN: '弘设汇',
    appDisplayNameZhTW: '弘設匯',
    appDisplayNameEn: 'TIC',
    iosAppName: '弘设汇',
  },
}
