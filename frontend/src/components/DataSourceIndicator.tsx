'use client'

import { useState, useEffect } from 'react';
import { staticDataService } from '@/services/staticDataService';

interface DataSourceInfo {
  source: 'github_actions' | 'vercel_functions' | 'backend_api' | 'sample_data';
  lastUpdated?: string;
  companiesCount?: number;
  isRealTime: boolean;
  status: 'loading' | 'available' | 'unavailable';
}

export default function DataSourceIndicator() {
  const [dataInfo, setDataInfo] = useState<DataSourceInfo>({
    source: 'sample_data',
    isRealTime: false,
    status: 'loading'
  });

  useEffect(() => {
    checkDataSources();
  }, []);

  const checkDataSources = async () => {
    try {
      // GitHub Actions静的データをチェック
      const staticDataAvailable = await staticDataService.isDataAvailable();
      
      if (staticDataAvailable) {
        const metadata = await staticDataService.getMetadata();
        
        setDataInfo({
          source: 'github_actions',
          lastUpdated: metadata?.lastUpdated,
          companiesCount: metadata?.companiesCount,
          isRealTime: false,
          status: 'available'
        });
        return;
      }

      // Vercel Functions（リアルタイムAPI）をチェック
      try {
        const vercelApiUrl = process.env.NEXT_PUBLIC_VERCEL_API_URL || 'https://roic-api.vercel.app/api';
        const response = await fetch(`${vercelApiUrl}/edinet/companies?q=test`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          
          setDataInfo({
            source: 'vercel_functions',
            isRealTime: true,
            status: result.source === 'edinet_api_vercel' ? 'available' : 'unavailable'
          });
          return;
        }
      } catch {
        // Vercel Functionsエラー
      }

      // バックエンドAPIをチェック（localhost環境のみ）
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${backendUrl}/edinet/status`);
          
          if (response.ok) {
            const result = await response.json();
            
            setDataInfo({
              source: 'backend_api',
              isRealTime: true,
              status: result.data?.apiConfigured ? 'available' : 'unavailable'
            });
            return;
          }
        } catch {
          // バックエンドAPIエラー
        }
      }

      // エラー: 利用可能なデータソースなし
      setDataInfo({
        source: 'sample_data',
        isRealTime: false,
        status: 'unavailable'
      });

    } catch (error) {
      console.error('データソースチェックエラー:', error);
      setDataInfo({
        source: 'sample_data',
        isRealTime: false,
        status: 'unavailable'
      });
    }
  };

  const getSourceInfo = () => {
    switch (dataInfo.source) {
      case 'github_actions':
        return {
          name: 'GitHub Actions取得データ',
          icon: '🤖',
          color: 'bg-green-50 border-green-200 text-green-800',
          description: 'EDINET APIから定期取得された実データ'
        };
      case 'vercel_functions':
        return {
          name: 'Vercel Functions（リアルタイム）',
          icon: '⚡',
          color: 'bg-purple-50 border-purple-200 text-purple-800',
          description: 'Vercel Functions経由でEDINET APIにリアルタイムアクセス'
        };
      case 'backend_api':
        return {
          name: 'バックエンドAPI',
          icon: '🔄',
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          description: 'サーバー経由でEDINET APIにリアルタイムアクセス'
        };
      case 'sample_data':
      default:
        return {
          name: 'データ接続エラー',
          icon: '⚠️',
          color: 'bg-red-50 border-red-200 text-red-800',
          description: 'EDINET APIへの接続ができません'
        };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '不明';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (dataInfo.status === 'loading') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          <span className="text-sm text-gray-600">データソースを確認中...</span>
        </div>
      </div>
    );
  }

  const sourceInfo = getSourceInfo();

  return (
    <div className={`border rounded-lg p-3 ${sourceInfo.color}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{sourceInfo.icon}</span>
          <div>
            <div className="font-medium text-sm">{sourceInfo.name}</div>
            <div className="text-xs opacity-75">{sourceInfo.description}</div>
          </div>
        </div>
        
        {dataInfo.isRealTime && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs">リアルタイム</span>
          </div>
        )}
      </div>
      
      {dataInfo.source === 'github_actions' && (
        <div className="mt-2 pt-2 border-t border-green-300/30">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">最終更新:</span>
              <div>{formatDate(dataInfo.lastUpdated)}</div>
            </div>
            <div>
              <span className="font-medium">企業数:</span>
              <div>{dataInfo.companiesCount || 0}社</div>
            </div>
          </div>
        </div>
      )}
      
      {dataInfo.source === 'vercel_functions' && (
        <div className="mt-2 pt-2 border-t border-purple-300/30">
          <div className="text-xs">
            Vercel Functions経由でEDINET APIからリアルタイムデータを取得中
          </div>
        </div>
      )}
      
      {dataInfo.source === 'sample_data' && (
        <div className="mt-2 pt-2 border-t border-red-300/30">
          <div className="text-xs">
            EDINET APIへの接続に失敗しました。ネットワーク接続を確認するか、管理者にお問い合わせください。
          </div>
        </div>
      )}
    </div>
  );
}