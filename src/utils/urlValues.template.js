// src/utils/urlValues.template.js
// 此文件为模板，由 scripts/build-variant.mjs 读取并替换 {{...}} 占位符后生成 urlValues.js
// 不要直接修改 urlValues.js（已加入 .gitignore），修改此模板即可

export const baseUrl = '{{baseUrl}}'
export const loginSocket = '{{loginSocket}}'
export const projectOID = '{{projectOID}}'
export const ttcVersion = '{{ttcVersion}}'
export const projectUrl = '{{projectUrl}}'
export const appVersion = 'v{{appVersion}}'
export const appName = '{{appName}}'
export const logoAsset = '{{logoAsset}}'
export const navProjectTitles = {
  'zh-CN': '{{appDisplayNameZhCN}}',
  'zh-HK': '{{appDisplayNameZhTW}}',
  'en-US': '{{appDisplayNameEn}}',
}

// 以下为 baseUrl 派生地址，无需手动修改
export const login = `${baseUrl}/app/account/login`
export const loginRSA = `${baseUrl}/biz/tmIoTCloud/Interface/loginRSA`
export const validateToken = `${baseUrl}/biz/account/validateToken`
export const updateCheckUrl = `${baseUrl}/biz/tmIoTCloud/Interface/updateAppVersion`
