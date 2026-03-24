#!/bin/bash
set -e

SERVER="root@<服务器IP>"  # 修改为你的服务器地址
DIR="/www/wwwroot/gift-card"

echo "同步代码..."
rsync -avz --delete \
  --exclude 'node_modules' --exclude 'database/*.db' \
  --exclude 'database/backups' --exclude '.git' \
  --exclude '.env' --exclude '*.log' \
  "$(dirname "$0")/" "$SERVER:$DIR/"

echo "远程部署..."
ssh "$SERVER" "cd $DIR && bash deploy.sh"
