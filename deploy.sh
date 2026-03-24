#!/bin/bash
set -e

APP="gift-card"
DIR="/opt/$APP"
PORT=3001

log() { echo -e "\033[32m[INFO]\033[0m $1"; }
err() { echo -e "\033[31m[ERROR]\033[0m $1"; exit 1; }

# 环境检查
command -v node &>/dev/null || err "请先安装 Node.js 18+"
command -v npm &>/dev/null  || err "请先安装 npm"
command -v pm2 &>/dev/null  || npm install -g pm2

log "环境: Node $(node -v) | PM2 $(pm2 -v)"

# 初始化目录 & 安装依赖
mkdir -p "$DIR/database/backups" "$DIR/src/public/qrcodes"
cd "$DIR"
npm install --production

# PM2 启动/重启
if pm2 describe "$APP" &>/dev/null; then
  pm2 restart "$APP" --update-env
else
  pm2 start src/server/index.js --name "$APP"
fi
pm2 save
pm2 startup 2>/dev/null || true

# 健康检查
sleep 3
curl -sf "http://localhost:$PORT/h5" >/dev/null && log "部署成功!" || err "启动失败，查看日志: pm2 logs $APP"

log "H5: http://<IP>:$PORT/h5  管理后台: http://<IP>:$PORT/admin"
pm2 list
