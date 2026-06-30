// 弘设汇 生产环境
// export const baseUrl = 'https://tmplascloud.com'
// export const loginSocket = `wss://tmplascloud.com`
// export const projectOID = '10238' // 项目id
// export const ttcVersion = '2.6.0' // ttc版本号

// 弘设汇 测试环境
// export const baseUrl = 'https://imro.tmiot.com.cn'
// export const loginSocket = `wss://imro.tmiot.com.cn`
// export const projectOID = '10591' // 项目id
// export const ttcVersion = '2.6.0' // ttc版本号

// 弘塑云 生产环境（新加坡）
export const baseUrl = 'http://47.236.252.168:8209'
export const loginSocket = `wss://47.236.252.168:8209`
export const projectOID = '11024' // 项目id
export const ttcVersion = '2.7.0' // ttc版本号

// 弘塑云 测试环境（国内）
// export const baseUrl = 'http://1.82.232.147:8209'
// export const loginSocket = `wss://1.82.232.147:8209`
// export const projectOID = '10994' // 项目id
// export const ttcVersion = '2.7.0' // ttc版本号

// 应用版本号（升级时只改这一处）
export const appVersion = 'v1.0.0'
// 应用名
// export const appName = 'hongshehui'
export const appName = 'hongsuyun'

export const login = `${baseUrl}/app/account/login`
export const loginRSA = `${baseUrl}/biz/tmIoTCloud/Interface/loginRSA`
export const getProccessData = `${baseUrl}/biz/tmIoTCloud/Interface/getProccessData`
export const validateToken = `${baseUrl}/app/account/validateToken`
