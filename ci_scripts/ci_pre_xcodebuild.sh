#!/bin/sh
set -e
# 安装Node
brew install node@22
# 全局安装pnpm
npm install -g pnpm

# 安装依赖（等价npm ci，锁定lockfile）
pnpm install --frozen-lockfile

# 生产打包
pnpm build:hongsuyun-prod

# capacitor同步
npx cap sync ios

# pod安装
cd ios/App
pod install