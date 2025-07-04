#!/bin/bash

# 自動対話記録システム停止スクリプト
# Auto Dialogue Recorder Stop Script

echo "🛑 Stopping Auto Dialogue Recorder..."

# プロジェクトルートディレクトリに移動
cd "$(dirname "$0")/.."

# PIDファイルの確認
if [ ! -f dialogue-recorder.pid ]; then
    echo "❌ PID file not found. Recorder may not be running."
    exit 1
fi

# プロセスIDを読み込み
PID=$(cat dialogue-recorder.pid)

# プロセスの存在確認
if ps -p $PID > /dev/null; then
    echo "📝 Stopping process $PID..."
    kill $PID
    
    # プロセス終了を待機
    sleep 2
    
    # 強制終了が必要な場合
    if ps -p $PID > /dev/null; then
        echo "⚠️ Force stopping process $PID..."
        kill -9 $PID
    fi
    
    echo "✅ Auto Dialogue Recorder stopped successfully"
else
    echo "⚠️ Process $PID is not running"
fi

# PIDファイルを削除
rm -f dialogue-recorder.pid

echo "🧹 Cleanup completed"