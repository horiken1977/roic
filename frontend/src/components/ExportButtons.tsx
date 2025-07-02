'use client'

import { useState } from 'react'
import { exportROICToPDF, exportROICToExcel, exportChartAsImage, ROICReportData } from '@/utils/exportUtils'

interface ExportButtonsProps {
  reportData?: ROICReportData
  chartElementId?: string
  showPDF?: boolean
  showExcel?: boolean
  showChart?: boolean
  className?: string
}

export default function ExportButtons({
  reportData,
  chartElementId,
  showPDF = true,
  showExcel = true,
  showChart = false,
  className = ''
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null)

  const handlePDFExport = async () => {
    if (!reportData) return
    
    setIsExporting('pdf')
    try {
      await exportROICToPDF(reportData)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('PDFエクスポートに失敗しました。再度お試しください。')
    } finally {
      setIsExporting(null)
    }
  }

  const handleExcelExport = () => {
    if (!reportData) return
    
    setIsExporting('excel')
    try {
      exportROICToExcel(reportData)
    } catch (error) {
      console.error('Excel export failed:', error)
      alert('Excelエクスポートに失敗しました。再度お試しください。')
    } finally {
      setIsExporting(null)
    }
  }

  const handleChartExport = async () => {
    if (!chartElementId) return
    
    setIsExporting('chart')
    try {
      const fileName = `ROICチャート_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.png`
      await exportChartAsImage(chartElementId, fileName)
    } catch (error) {
      console.error('Chart export failed:', error)
      alert('チャート画像のエクスポートに失敗しました。再度お試しください。')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {showPDF && reportData && (
        <button
          onClick={handlePDFExport}
          disabled={isExporting !== null}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isExporting === 'pdf' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              生成中...
            </>
          ) : (
            <>
              <span className="mr-2">📄</span>
              PDFレポート
            </>
          )}
        </button>
      )}

      {showExcel && reportData && (
        <button
          onClick={handleExcelExport}
          disabled={isExporting !== null}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isExporting === 'excel' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              生成中...
            </>
          ) : (
            <>
              <span className="mr-2">📊</span>
              Excelデータ
            </>
          )}
        </button>
      )}

      {showChart && chartElementId && (
        <button
          onClick={handleChartExport}
          disabled={isExporting !== null}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isExporting === 'chart' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              保存中...
            </>
          ) : (
            <>
              <span className="mr-2">🖼️</span>
              チャート画像
            </>
          )}
        </button>
      )}

      {/* エクスポート説明ツールチップ */}
      {(showPDF || showExcel || showChart) && (
        <div className="ml-2 inline-flex items-center">
          <div className="relative group">
            <span className="text-gray-400 cursor-help">ℹ️</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              {showPDF && 'PDF: 完全な分析レポート'}<br />
              {showExcel && 'Excel: 生データと計算式'}<br />
              {showChart && 'PNG: チャート画像ファイル'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 簡易エクスポートボタン（PDF + Excelのみ）
 */
export function QuickExportButtons({ reportData }: { reportData?: ROICReportData }) {
  return (
    <ExportButtons
      reportData={reportData}
      showPDF={true}
      showExcel={true}
      showChart={false}
      className="justify-center"
    />
  )
}

/**
 * チャートエクスポート専用ボタン
 */
export function ChartExportButton({ 
  chartElementId, 
  label = 'チャート保存' 
}: { 
  chartElementId: string
  label?: string 
}) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const fileName = `ROICチャート_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.png`
      await exportChartAsImage(chartElementId, fileName)
    } catch (error) {
      console.error('Chart export failed:', error)
      alert('チャート画像のエクスポートに失敗しました。')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 text-sm"
    >
      {isExporting ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
          保存中...
        </>
      ) : (
        <>
          <span className="mr-2">💾</span>
          {label}
        </>
      )}
    </button>
  )
}