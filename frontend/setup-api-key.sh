#!/bin/bash

# EDINET APIキー設定スクリプト
# 使用方法: ./setup-api-key.sh YOUR_ACTUAL_API_KEY

echo "🔑 EDINET APIキー設定スクリプト"
echo "================================"

# 現在の.env.localファイルパス
ENV_FILE="/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/roic/frontend/.env.local"

# APIキーが引数で渡されているかチェック
if [ $# -eq 0 ]; then
    echo "❌ エラー: APIキーが指定されていません"
    echo ""
    echo "使用方法:"
    echo "  ./setup-api-key.sh YOUR_ACTUAL_API_KEY"
    echo ""
    echo "または対話式で設定:"
    echo "  ./setup-api-key.sh"
    echo ""
    
    # 対話式でAPIキーを入力
    read -p "🔐 EDINET APIキーを入力してください: " API_KEY
    
    if [ -z "$API_KEY" ]; then
        echo "❌ APIキーが入力されませんでした。終了します。"
        exit 1
    fi
else
    API_KEY="$1"
fi

echo "📝 現在の設定を確認中..."
echo "--- 現在の.env.local ---"
cat "$ENV_FILE"
echo "----------------------"

# バックアップ作成
echo "💾 バックアップを作成中..."
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# APIキーを設定
echo "🔧 APIキーを設定中..."
sed -i '' "s/実際のAPIキーをここに入力してください/$API_KEY/" "$ENV_FILE"

# 設定確認
echo "✅ 設定完了！"
echo ""
echo "--- 更新後の.env.local ---"
cat "$ENV_FILE"
echo "------------------------"

# セキュリティチェック
echo ""
echo "🔒 セキュリティチェック:"
if grep -q "your_edinet_api_key_here\|実際のAPIキーをここに入力してください" "$ENV_FILE"; then
    echo "⚠️  警告: デフォルト値がまだ残っています"
else
    echo "✅ APIキーが正常に設定されました"
fi

# 次のステップ
echo ""
echo "📋 次のステップ:"
echo "1. アプリケーションを再起動してください:"
echo "   npm run dev"
echo ""
echo "2. 実際のAPIを使用する場合:"
echo "   NEXT_PUBLIC_USE_REAL_EDINET_API=true に変更"
echo ""
echo "3. APIキー取得がまだの場合:"
echo "   https://disclosure.edinet-fsa.go.jp/EKW0EZ1001.html"