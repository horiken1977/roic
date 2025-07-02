'use client'

interface ErrorDisplayProps {
  error: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, message, onRetry }: ErrorDisplayProps) {
  const getErrorIcon = (errorCode: string) => {
    switch (errorCode) {
      case 'API_KEY_NOT_CONFIGURED':
        return '🔑';
      case 'XBRL_PARSING_NOT_IMPLEMENTED':
        return '🚧';
      case 'NO_DATA_SOURCE_AVAILABLE':
      case 'ALL_DATA_SOURCES_UNAVAILABLE':
        return '🌐';
      case 'CORS_ERROR':
        return '🚫';
      case 'VERCEL_API_ERROR':
      case 'NETWORK_ERROR':
        return '📡';
      case 'SEARCH_ERROR':
      case 'FINANCIAL_DATA_ERROR':
        return '⚠️';
      default:
        return '❌';
    }
  };

  const getErrorColor = (errorCode: string) => {
    switch (errorCode) {
      case 'API_KEY_NOT_CONFIGURED':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'XBRL_PARSING_NOT_IMPLEMENTED':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'CORS_ERROR':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'VERCEL_API_ERROR':
      case 'NETWORK_ERROR':
        return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      case 'NO_DATA_SOURCE_AVAILABLE':
      case 'ALL_DATA_SOURCES_UNAVAILABLE':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getErrorColor(error)}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{getErrorIcon(error)}</span>
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">
            エラーコード: {error}
          </div>
          <div className="text-sm">
            {message}
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-3 py-1 text-xs bg-white border border-current rounded hover:bg-gray-50 transition-colors"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}