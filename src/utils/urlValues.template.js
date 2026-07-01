// src/utils/urlValues.template.js
// 此文件为模板，由 scripts/build-variant.mjs 读取并替换 {{...}} 占位符后生成 urlValues.js
// 不要直接修改 urlValues.js（已加入 .gitignore），修改此模板即可

export const baseUrl = '{{baseUrl}}'
export const loginSocket = '{{loginSocket}}'
export const projectOID = '{{projectOID}}'
export const ttcVersion = '{{ttcVersion}}'
export const appVersion = 'v1.0.0'
export const appName = '{{appNameEn}}'
export const updateCheckUrl = '{{updateCheckUrl}}'
export const logoAsset = '{{logoAsset}}'
export const navProjectTitle = '{{navProjectTitle}}'

// 以下为 baseUrl 派生地址，无需手动修改
export const login = `${baseUrl}/app/account/login`
export const loginRSA = `${baseUrl}/biz/tmIoTCloud/Interface/loginRSA`
export const getProccessData = `${baseUrl}/biz/tmIoTCloud/Interface/getProccessData`
export const validateToken = `${baseUrl}/app/account/validateToken`
