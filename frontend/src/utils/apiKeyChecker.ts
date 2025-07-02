/**
 * EDINET APIキー設定チェッカー
 * セキュアなAPIキー管理を支援
 */

export interface ApiKeyStatus {
  isConfigured: boolean;
  isValid?: boolean;
  isDefault?: boolean;
  message: string;
}

/**
 * APIキーの設定状況をチェック
 */
export function checkApiKeyConfiguration(): ApiKeyStatus {
  const apiKey = process.env.EDINET_API_KEY;
  
  if (!apiKey) {
    return {
      isConfigured: false,
      message: 'EDINET_API_KEYが設定されていません。.env.localファイルで設定してください。'
    };
  }
  
  // デフォルト値のチェック
  const defaultValues = [
    'your_edinet_api_key_here',
    '実際のAPIキーをここに入力してください',
    'YOUR_API_KEY',
    'api_key_here'
  ];
  
  if (defaultValues.includes(apiKey)) {
    return {
      isConfigured: true,
      isDefault: true,
      message: 'デフォルト値が設定されています。実際のEDINET APIキーに変更してください。'
    };
  }
  
  // キー形式の基本チェック（EDINETのAPIキーは通常32文字の英数字）
  if (apiKey.length < 16 || !/^[a-zA-Z0-9]+$/.test(apiKey)) {
    return {
      isConfigured: true,
      isValid: false,
      message: 'APIキーの形式が正しくない可能性があります。EDINET APIキーを確認してください。'
    };
  }
  
  return {
    isConfigured: true,
    isValid: true,
    message: 'APIキーが正常に設定されています。'
  };
}

/**
 * 本番環境での環境変数チェック
 */
export function validateProductionEnvironment(): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // APIキーがデフォルト値でないかチェック
  const apiKeyStatus = checkApiKeyConfiguration();
  if (apiKeyStatus.isDefault) {
    warnings.push('本番環境でデフォルトのAPIキーが使用されています');
  }
  
  // 開発フラグが本番で有効になっていないかチェック
  if (process.env.NODE_ENV === 'production' && 
      process.env.NEXT_PUBLIC_USE_REAL_EDINET_API !== 'true') {
    warnings.push('本番環境でサンプルデータモードが有効になっています');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * セキュリティベストプラクティスの確認
 */
export function getSecurityRecommendations(): string[] {
  return [
    '1. APIキーを .env.local に設定し、.gitignore で除外する',
    '2. 本番環境では環境変数で直接設定する',
    '3. APIキーは定期的にローテーションする',
    '4. 不要になったキーは無効化する',
    '5. ログにAPIキーが出力されないよう注意する'
  ];
}