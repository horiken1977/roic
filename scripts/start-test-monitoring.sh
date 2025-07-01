#!/bin/bash

# テスト監視システム起動スクリプト
# Test Monitoring System Startup Script

set -e

echo "🚀 Starting ROIC Test Monitoring System"
echo "======================================="

# プロセス管理用PIDファイル
PID_DIR="./tmp/pids"
mkdir -p "$PID_DIR"

# ログディレクトリ
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

# 既存プロセスの確認と停止
echo "🔍 Checking for existing processes..."

if [ -f "$PID_DIR/test-progress-updater.pid" ]; then
    PID=$(cat "$PID_DIR/test-progress-updater.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⏹️  Stopping existing test progress updater (PID: $PID)"
        kill "$PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$PID_DIR/test-progress-updater.pid"
fi

if [ -f "$PID_DIR/auto-test-generator.pid" ]; then
    PID=$(cat "$PID_DIR/auto-test-generator.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⏹️  Stopping existing auto test generator (PID: $PID)"
        kill "$PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$PID_DIR/auto-test-generator.pid"
fi

if [ -f "$PID_DIR/auto-error-fix.pid" ]; then
    PID=$(cat "$PID_DIR/auto-error-fix.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⏹️  Stopping existing auto error fix (PID: $PID)"
        kill "$PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$PID_DIR/auto-error-fix.pid"
fi

# 初回HTMLドキュメント生成
echo "📄 Generating initial test documentation..."
node scripts/test-docs-generator.js

# テスト進捗更新システムの起動
echo "📊 Starting Test Progress Updater..."
nohup node scripts/test-progress-updater.js > "$LOG_DIR/test-progress-updater.log" 2>&1 &
TEST_PROGRESS_PID=$!
echo $TEST_PROGRESS_PID > "$PID_DIR/test-progress-updater.pid"
echo "✅ Test Progress Updater started (PID: $TEST_PROGRESS_PID)"

# 自動テスト生成システムの起動
echo "🤖 Starting Auto Test Generator..."
nohup node scripts/auto-test-generator.js --watch > "$LOG_DIR/auto-test-generator.log" 2>&1 &
AUTO_TEST_PID=$!
echo $AUTO_TEST_PID > "$PID_DIR/auto-test-generator.pid"
echo "✅ Auto Test Generator started (PID: $AUTO_TEST_PID)"

# 自動エラー修正システムの起動
echo "🔧 Starting Auto Error Fix..."
nohup node scripts/auto-error-fix.js > "$LOG_DIR/auto-error-fix.log" 2>&1 &
AUTO_ERROR_PID=$!
echo $AUTO_ERROR_PID > "$PID_DIR/auto-error-fix.pid"
echo "✅ Auto Error Fix started (PID: $AUTO_ERROR_PID)"

# 起動確認
sleep 3

echo ""
echo "🎉 ROIC Test Monitoring System Started Successfully!"
echo "=================================================="
echo ""
echo "📊 Active Services:"
echo "  - Test Progress Updater (PID: $TEST_PROGRESS_PID)"
echo "  - Auto Test Generator (PID: $AUTO_TEST_PID)"
echo "  - Auto Error Fix (PID: $AUTO_ERROR_PID)"
echo ""
echo "📁 Log Files:"
echo "  - Test Progress: $LOG_DIR/test-progress-updater.log"
echo "  - Auto Test Gen: $LOG_DIR/auto-test-generator.log"
echo "  - Auto Error Fix: $LOG_DIR/auto-error-fix.log"
echo ""
echo "🌐 Services:"
echo "  - WebSocket Server: ws://localhost:3002"
echo "  - Test Documents: http://localhost:3000/test-docs/"
echo "  - Dashboard: http://localhost:3000/dashboard"
echo ""
echo "🛑 To stop all services, run: ./scripts/stop-test-monitoring.sh"
echo ""

# ヘルスチェック
echo "🏥 Running health check..."
sleep 2

if kill -0 $TEST_PROGRESS_PID 2>/dev/null; then
    echo "✅ Test Progress Updater: Running"
else
    echo "❌ Test Progress Updater: Failed to start"
fi

if kill -0 $AUTO_TEST_PID 2>/dev/null; then
    echo "✅ Auto Test Generator: Running"
else
    echo "❌ Auto Test Generator: Failed to start"
fi

if kill -0 $AUTO_ERROR_PID 2>/dev/null; then
    echo "✅ Auto Error Fix: Running"
else
    echo "❌ Auto Error Fix: Failed to start"
fi

# WebSocketサーバーのチェック
if curl -s --max-time 2 http://localhost:3002 > /dev/null 2>&1; then
    echo "✅ WebSocket Server: Accessible"
else
    echo "⚠️  WebSocket Server: May be starting up..."
fi

echo ""
echo "📝 Tip: テスト進捗はダッシュボードでリアルタイム確認できます"
echo "💡 Tip: ファイルを編集すると自動的にテストが実行されます"
echo ""

# バックグラウンドで実行継続
echo "🔄 Monitoring system is running in background..."
echo "📜 Use 'tail -f $LOG_DIR/*.log' to view logs"