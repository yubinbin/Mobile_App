#!/bin/sh
set -e

# 切换到仓库根目录（前端代码在这里）
cd "$CI_PRIMARY_REPOSITORY_PATH"

# 安装Nodejs与pnpm
brew install node
npm install -g pnpm

# 安装依赖、构建前端
pnpm install
pnpm build:hongsuyun-prod

# Capacitor同步资源到ios
npx cap sync ios