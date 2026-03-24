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

# ==========================================
# [新增] 关键步骤：从云效工作区同步代码到目标目录
# ==========================================
# 云效默认将代码拉取到当前工作目录 (.) 或配置的子目录
# 假设云效流水线的工作目录就是当前脚本执行的目录 (.)
SOURCE_DIR="$(pwd)"

log "正在从 [$SOURCE_DIR] 同步代码到 [$DIR] ..."

# 1. 创建目标目录
mkdir -p "$DIR"

# 2. 清理目标目录中的旧代码 (保留数据库备份以防万一，可选)
# 这里我们选择全量覆盖，确保文件一致性
rm -rf "$DIR"/*
rm -rf "$DIR"/.[!.]*  # 删除隐藏文件，但保留 . 和 ..

# 3. 复制所有文件 (包括 package.json, src, database 等)
# 使用 cp -a 保持属性，或 rsync
cp -a "$SOURCE_DIR/." "$DIR/"

log "代码同步完成!"
# ==========================================

# 初始化子目录 & 安装依赖
mkdir -p "$DIR/database/backups" "$DIR/src/public/qrcodes"
cd "$DIR"

# [安全检查] 确认 package.json 存在
if [ ! -f "package.json" ]; then
  err "致命错误：$DIR/package.json 不存在！请检查云效代码拉取配置。"
  ls -la "$DIR"
  exit 1
fi

log "开始安装依赖..."
npm install --production

# PM2 启动/重启
if pm2 describe "$APP" &>/dev/null; then
  log "重启应用..."
  pm2 restart "$APP" --update-env
else
  log "首次启动应用..."
  pm2 start src/server/index.js --name "$APP"
fi

pm2 save
pm2 startup 2>/dev/null || true

# 健康检查
log "等待服务启动..."
sleep 5
if curl -sf "http://localhost:$PORT/h5" >/dev/null; then
  log "✅ 部署成功! 健康检查通过。"
else
  err "❌ 启动失败或健康检查未通过。请查看日志: pm2 logs $APP"
fi

log "🌐 H5: http://<IP>:$PORT/h5"
log "🔧 管理后台: http://<IP>:$PORT/admin"
pm2 list