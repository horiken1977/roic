'use client'

import { useState, useEffect } from 'react';
import { checkApiKeyConfiguration, getSecurityRecommendations, type ApiKeyStatus } from '@/utils/apiKeyChecker';

export default function ApiKeyStatus() {
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    // サーバーサイドでのみ実行
    if (typeof window === 'undefined') {
      setApiKeyStatus(checkApiKeyConfiguration());
    }
  }, []);

  // クライアントサイドでは表示しない
  if (typeof window !== 'undefined') {
    return null;
  }

  if (!apiKeyStatus) {
    return null;
  }

  const getStatusColor = () => {
    if (!apiKeyStatus.isConfigured) return 'bg-red-50 border-red-200';
    if (apiKeyStatus.isDefault) return 'bg-yellow-50 border-yellow-200';
    if (apiKeyStatus.isValid === false) return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (!apiKeyStatus.isConfigured) return '❌';
    if (apiKeyStatus.isDefault) return '⚠️';
    if (apiKeyStatus.isValid === false) return '⚠️';
    return '✅';
  };

  const getStatusTextColor = () => {
    if (!apiKeyStatus.isConfigured) return 'text-red-800';
    if (apiKeyStatus.isDefault) return 'text-yellow-800';
    if (apiKeyStatus.isValid === false) return 'text-orange-800';
    return 'text-green-800';
  };

  return (
    <div className="space-y-4">
      {/* APIキー設定状況 */}
      <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{getStatusIcon()}</span>
          <div className="flex-1">
            <h3 className={`font-medium ${getStatusTextColor()}`}>
              EDINET APIキー設定状況
            </h3>
            <p className={`text-sm mt-1 ${getStatusTextColor()}`}>
              {apiKeyStatus.message}
            </p>
            
            {/* 設定手順 */}
            {(!apiKeyStatus.isConfigured || apiKeyStatus.isDefault) && (
              <div className="mt-3 p-3 bg-white rounded border">
                <h4 className="font-medium text-gray-900 mb-2">設定手順:</h4>
                <ol className="text-sm text-gray-700 space-y-1">
                  <li>1. <a href="https://disclosure.edinet-fsa.go.jp/EKW0EZ1001.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">EDINET API</a> でAPIキーを取得</li>
                  <li>2. .env.local ファイルでEDINET_API_KEYを設定</li>
                  <li>3. アプリケーションを再起動</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* セキュリティ推奨事項 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-blue-900">🔒 セキュリティ推奨事項</h3>
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="text-blue-600 text-sm hover:text-blue-800"
          >
            {showRecommendations ? '非表示' : '表示'}
          </button>
        </div>
        
        {showRecommendations && (
          <div className="mt-3">
            <ul className="text-sm text-blue-800 space-y-1">
              {getSecurityRecommendations().map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 現在の設定 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">現在の設定</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>実API使用: {process.env.NEXT_PUBLIC_USE_REAL_EDINET_API === 'true' ? '有効' : '無効（サンプルデータ）'}</div>
          <div>環境: {process.env.NODE_ENV || 'development'}</div>
        </div>
      </div>
    </div>
  );
}