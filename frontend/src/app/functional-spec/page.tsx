'use client';

import { useEffect, useState } from 'react';

export default function FunctionalSpecPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function loadFunctionalSpec() {
      try {
        const basePath = '/roic';
        const response = await fetch(`${basePath}/functional-spec.html`);
        
        if (!response.ok) {
          throw new Error(`Failed to load functional specification: ${response.status}`);
        }
        
        const htmlContent = await response.text();
        setContent(htmlContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadFunctionalSpec();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">機能設計書を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            機能設計書の読み込みに失敗しました
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">機能設計書</h1>
          <p className="text-green-100">
            ROIC分析アプリケーション システム要件・機能仕様・技術設計
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-8 py-4">
            <button 
              onClick={() => {
                const element = document.getElementById('overview');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              システム概要
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('requirements');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              機能要件
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('technical');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              技術仕様
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('progress');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              開発計画
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('quality');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              品質保証
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md">
          <div 
            className="prose prose-lg max-w-none p-8"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => window.print()}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            📄 PDF出力
          </button>
          <a
            href="https://github.com/horiken1977/roic/blob/main/docs/functional-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            📝 GitHubで編集
          </a>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            🔄 最新版を取得
          </button>
        </div>

        {/* Auto-update Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">🤖</span>
            <span className="text-blue-800 font-medium">
              この文書は開発進捗に応じて自動更新されます
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}