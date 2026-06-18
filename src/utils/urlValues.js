// 生产环境
export const baseUrl = 'https://tmplascloud.com'
export const loginSocket = `wss://tmplascloud.com`
export const projectOID = '10238' // 项目id
export const ttcVersion = '2.6.0' // ttc版本号

// 测试环境
// export const baseUrl = 'https://imro.tmiot.com.cn'
// export const loginSocket = `wss://imro.tmiot.com.cn`
// export const projectOID = '10591' // 项目id
// export const ttcVersion = '2.6.0' // 版本号

// 应用版本号（升级时只改这一处）
export const appVersion = 'v1.0.0'

export const login = `${baseUrl}/app/account/login`
export const loginRSA = `${baseUrl}/biz/tmIoTCloud/Interface/loginRSA`
export const getProccessData = `${baseUrl}/biz/tmIoTCloud/Interface/getProccessData`
export const validateToken = `${baseUrl}/app/account/validateToken`
