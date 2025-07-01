#!/bin/bash

# テスト監視システム停止スクリプト
# Test Monitoring System Stop Script

set -e

echo "🛑 Stopping ROIC Test Monitoring System"
echo "======================================"

# プロセス管理用PIDファイル
PID_DIR="./tmp/pids"

if [ ! -d "$PID_DIR" ]; then
    echo "ℹ️  No PID directory found. System may not be running."
    exit 0
fi

STOPPED_COUNT=0

# Test Progress Updater の停止
if [ -f "$PID_DIR/test-progress-updater.pid" ]; then
    PID=$(cat "$PID_DIR/test-progress-updater.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⏹️  Stopping Test Progress Updater (PID: $PID)"
        kill "$PID" 2>/dev/null || true
        
        # Graceful shutdown wait
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "⚠️  Force killing Test Progress Updater"
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    else
        echo "ℹ️  Test Progress Updater was not running"
    fi
    rm -f "$PID_DIR/test-progress-updater.pid"
else
    echo "ℹ️  Test Progress Updater PID file not found"
fi

# Auto Test Generator の停止
if [ -f "$PID_DIR/auto-test-generator.pid" ]; then
    PID=$(cat "$PID_DIR/auto-test-generator.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⏹️  Stopping Auto Test Generator (PID: $PID)"
        kill "$PID" 2>/dev/null || true
        
        # Graceful shutdown wait
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "⚠️  Force killing Auto Test Generator"
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    else
        echo "ℹ️  Auto Test Generator was not running"
    fi
    rm -f "$PID_DIR/auto-test-generator.pid"
else
    echo "ℹ️  Auto Test Generator PID file not found"
fi

# Auto Error Fix の停止
if [ -f "$PID_DIR/auto-error-fix.pid" ]; then
    PID=$(cat "$PID_DIR/auto-error-fix.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⏹️  Stopping Auto Error Fix (PID: $PID)"
        kill "$PID" 2>/dev/null || true
        
        # Graceful shutdown wait
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "⚠️  Force killing Auto Error Fix"
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    else
        echo "ℹ️  Auto Error Fix was not running"
    fi
    rm -f "$PID_DIR/auto-error-fix.pid"
else
    echo "ℹ️  Auto Error Fix PID file not found"
fi

# 関連プロセスの確認と停止（念のため）
echo "🔍 Checking for any remaining test monitoring processes..."

# Node.js プロセスで test-progress-updater を含むものを探す
REMAINING_PIDS=$(pgrep -f "test-progress-updater\|auto-test-generator\|auto-error-fix" 2>/dev/null || true)

if [ -n "$REMAINING_PIDS" ]; then
    echo "⚠️  Found remaining test monitoring processes:"
    echo "$REMAINING_PIDS" | while read pid; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "  - Stopping process: $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done
    sleep 2
    
    # Force kill if still there
    STILL_REMAINING=$(pgrep -f "test-progress-updater\|auto-test-generator\|auto-error-fix" 2>/dev/null || true)
    if [ -n "$STILL_REMAINING" ]; then
        echo "⚠️  Force killing remaining processes..."
        echo "$STILL_REMAINING" | while read pid; do
            kill -9 "$pid" 2>/dev/null || true
        done
    fi
fi

# PIDディレクトリのクリーンアップ
if [ -d "$PID_DIR" ] && [ -z "$(ls -A $PID_DIR)" ]; then
    rmdir "$PID_DIR" 2>/dev/null || true
fi

echo ""
if [ $STOPPED_COUNT -gt 0 ]; then
    echo "✅ Successfully stopped $STOPPED_COUNT service(s)"
else
    echo "ℹ️  No services were running"
fi

echo ""
echo "🎉 ROIC Test Monitoring System Stopped"
echo "======================================"
echo ""
echo "📁 Log files are preserved in ./logs/"
echo "📄 Generated test documents are preserved in ./frontend/public/test-docs/"
echo ""
echo "🚀 To restart the system, run: ./scripts/start-test-monitoring.sh"
echo ""