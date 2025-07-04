#!/bin/bash

# 自動対話記録システム起動スクリプト
# Auto Dialogue Recorder Startup Script

echo "🎙️ Starting Auto Dialogue Recorder..."

# プロジェクトルートディレクトリに移動
cd "$(dirname "$0")/.."

# Node.jsの存在確認
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# 自動対話記録システムを起動
echo "📝 Starting dialogue recording system..."
echo "⏰ Recording every 2 hours"
echo "🔄 Press Ctrl+C to stop"

# バックグラウンドで実行
nohup npm run dialogue-recorder > dialogue-recorder.log 2>&1 &

# プロセスIDを保存
echo $! > dialogue-recorder.pid

echo "✅ Auto Dialogue Recorder started successfully"
echo "📄 Logs: dialogue-recorder.log"
echo "🆔 PID: $(cat dialogue-recorder.pid)"
echo ""
echo "Commands:"
echo "  Stop recorder: ./scripts/stop-dialogue-recorder.sh"
echo "  Manual record: npm run dialogue-manual"
echo "  View logs: tail -f dialogue-recorder.log"