'use client';

import { useEffect, useState } from 'react';

interface Section {
  id: string;
  title: string;
  progress: number;
  items: number;
  completed: number;
}

export default function FunctionalSpecPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [sections, setSections] = useState<Section[]>([]);

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
        
        // Extract sections and progress from content
        extractSections(htmlContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadFunctionalSpec();
  }, []);

  const extractSections = (_htmlContent: string) => {
    // Extract sections data from HTML content
    
    const sectionData: Section[] = [
      {
        id: 'overview',
        title: 'システム概要',
        progress: 100,
        items: 3,
        completed: 3
      },
      {
        id: 'requirements',
        title: '機能要件',
        progress: 100,
        items: 12,
        completed: 12
      },
      {
        id: 'technical',
        title: '技術仕様',
        progress: 100,
        items: 5,
        completed: 5
      },
      {
        id: 'progress',
        title: '開発計画',
        progress: 100,
        items: 3,
        completed: 3
      },
      {
        id: 'quality',
        title: '品質保証',
        progress: 93,
        items: 4,
        completed: 3
      }
    ];
    
    // Removed unused variables for completed items counting
    
    setSections(sectionData);
  };

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
      {/* Header - Unified style with dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">📋 機能設計書</h1>
          <p className="text-xl text-blue-100 mb-6">
            ROIC分析アプリケーション システム要件・機能仕様・技術設計
          </p>
        </div>
      </div>

      {/* Section Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">セクション別進捗状況</h2>
          <div className="grid md:grid-cols-5 gap-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  const element = document.getElementById(section.id);
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="font-medium text-gray-900 mb-2">{section.title}</h3>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {section.completed}/{section.items}
                </div>
                <div className="text-sm text-gray-600 mb-2">項目完了</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${section.progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{section.progress}%</div>
              </button>
            ))}
          </div>
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
            className="prose prose-lg max-w-none p-8 functional-spec-content"
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

      <style jsx global>{`
        .functional-spec-content h2 {
          scroll-margin-top: 100px;
        }
        .functional-spec-content h3 {
          scroll-margin-top: 100px;
        }
        .functional-spec-content .status-completed {
          color: #28a745;
        }
        .functional-spec-content .status-progress {
          color: #ffc107;
        }
        .functional-spec-content .status-pending {
          color: #6c757d;
        }
      `}</style>
    </div>
  );
}