'use client'

import { useEffect, useState } from 'react'

export default function TestSpecPage() {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTestSpec = async () => {
      try {
        const response = await fetch('/test-docs/test-spec.html')
        if (!response.ok) {
          throw new Error(`Failed to load test specification: ${response.status}`)
        }
        const content = await response.text()
        setHtmlContent(content)
      } catch (err) {
        console.error('Error loading test specification:', err)
        setError(err instanceof Error ? err.message : 'Failed to load test specification')
      } finally {
        setLoading(false)
      }
    }

    loadTestSpec()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">テスト仕様書を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl mb-2">エラー</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className="test-spec-content"
    />
  )
}