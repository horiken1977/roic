#!/bin/bash

# ROIC対話記録サービス - launchd インストールスクリプト

echo "🔧 ROIC対話記録サービスのインストール開始..."

# 現在実行中のサービスを停止
echo "⏹️  既存サービス停止中..."
./scripts/stop-dialogue-recorder.sh 2>/dev/null || true

# plistファイルをLaunchAgentsにコピー
echo "📋 plistファイルをLaunchAgentsにコピー..."
cp com.roic.dialogue-recorder.plist ~/Library/LaunchAgents/

# 権限設定
echo "🔐 権限設定..."
chmod 644 ~/Library/LaunchAgents/com.roic.dialogue-recorder.plist

# サービス登録
echo "📝 launchdサービス登録..."
launchctl load ~/Library/LaunchAgents/com.roic.dialogue-recorder.plist

# サービス開始
echo "🚀 サービス開始..."
launchctl start com.roic.dialogue-recorder

echo "✅ インストール完了！"
echo ""
echo "📊 サービス管理コマンド:"
echo "  開始: launchctl start com.roic.dialogue-recorder"
echo "  停止: launchctl stop com.roic.dialogue-recorder"
echo "  状態確認: launchctl list | grep roic"
echo "  ログ確認: tail -f dialogue-recorder.log"
echo "  アンインストール: launchctl unload ~/Library/LaunchAgents/com.roic.dialogue-recorder.plist"
echo ""
echo "🔄 PC再起動後も自動で開始されます"