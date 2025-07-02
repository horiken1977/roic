import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { FinancialDataFromEDINET, EDINETCompany } from '@/services/edinetApi'
import { calculateAllROIC, formatROIC, formatCurrency } from './roicCalculations'

// PDF エクスポート用のインターface
export interface ROICReportData {
  company: EDINETCompany
  financialData: FinancialDataFromEDINET
  roicResults: ReturnType<typeof calculateAllROIC>
  multiYearData?: FinancialDataFromEDINET[]
}

/**
 * ROIC分析結果をPDFレポートとしてエクスポート
 */
export async function exportROICToPDF(data: ROICReportData): Promise<void> {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPosition = 20

    // ヘッダー
    pdf.setFontSize(20)
    pdf.setTextColor(31, 41, 55) // gray-800
    pdf.text('ROIC分析レポート', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // 企業情報
    pdf.setFontSize(16)
    pdf.setTextColor(59, 130, 246) // blue-600
    pdf.text(`企業名: ${data.company.companyName}`, 20, yPosition)
    yPosition += 10

    pdf.setFontSize(12)
    pdf.setTextColor(75, 85, 99) // gray-600
    pdf.text(`証券コード: ${data.company.tickerSymbol || '-'}`, 20, yPosition)
    yPosition += 7
    pdf.text(`EDINETコード: ${data.company.edinetCode}`, 20, yPosition)
    yPosition += 7
    pdf.text(`業界: ${data.company.industry || '-'}`, 20, yPosition)
    yPosition += 15

    // 財務データサマリー
    pdf.setFontSize(14)
    pdf.setTextColor(31, 41, 55)
    pdf.text('財務データサマリー', 20, yPosition)
    yPosition += 10

    const financialItems = [
      ['売上高', formatCurrency(data.financialData.netSales)],
      ['営業利益', formatCurrency(data.financialData.operatingIncome)],
      ['総資産', formatCurrency(data.financialData.totalAssets)],
      ['株主資本', formatCurrency(data.financialData.shareholdersEquity)],
      ['有利子負債', formatCurrency(data.financialData.interestBearingDebt)]
    ]

    pdf.setFontSize(11)
    financialItems.forEach(([label, value]) => {
      pdf.setTextColor(75, 85, 99)
      pdf.text(label + ':', 25, yPosition)
      pdf.setTextColor(31, 41, 55)
      pdf.text(value, 80, yPosition)
      yPosition += 6
    })

    yPosition += 10

    // ROIC計算結果
    pdf.setFontSize(14)
    pdf.setTextColor(31, 41, 55)
    pdf.text('ROIC計算結果', 20, yPosition)
    yPosition += 10

    const methodNames = {
      basic: '基本方式',
      detailed: '詳細方式', 
      asset: 'アセット方式',
      modified: '修正方式'
    }

    Object.entries(data.roicResults).forEach(([method, result]) => {
      pdf.setFontSize(12)
      pdf.setTextColor(59, 130, 246)
      pdf.text(methodNames[method as keyof typeof methodNames], 25, yPosition)
      yPosition += 7

      pdf.setFontSize(11)
      pdf.setTextColor(75, 85, 99)
      pdf.text(`ROIC: ${formatROIC(result.roic)}`, 30, yPosition)
      yPosition += 5
      pdf.text(`NOPAT: ${formatCurrency(result.nopat)}`, 30, yPosition)
      yPosition += 5
      pdf.text(`投下資本: ${formatCurrency(result.investedCapital)}`, 30, yPosition)
      yPosition += 8
    })

    // 複数年度データがある場合はトレンド情報を追加
    if (data.multiYearData && data.multiYearData.length > 1) {
      yPosition += 5
      pdf.setFontSize(14)
      pdf.setTextColor(31, 41, 55)
      pdf.text('トレンド分析', 20, yPosition)
      yPosition += 10

      const trendData = data.multiYearData
        .sort((a, b) => a.fiscalYear - b.fiscalYear)
        .map(item => {
          const convertedData = {
            operatingIncome: item.operatingIncome,
            interestIncome: item.interestIncome,
            taxRate: item.taxRate,
            totalAssets: item.totalAssets,
            cashAndEquivalents: item.cashAndEquivalents,
            shareholdersEquity: item.shareholdersEquity,
            interestBearingDebt: item.interestBearingDebt,
            accountsPayable: item.accountsPayable,
            accruedExpenses: item.accruedExpenses,
            leaseExpense: item.leaseExpense,
            leaseDebt: item.leaseDebt
          }
          const roic = calculateAllROIC(convertedData)
          return {
            year: item.fiscalYear,
            roic: roic.detailed.roic
          }
        })

      pdf.setFontSize(11)
      pdf.setTextColor(75, 85, 99)
      trendData.forEach(item => {
        pdf.text(`${item.year}年度: ${formatROIC(item.roic)}`, 25, yPosition)
        yPosition += 6
      })

      // 成長率計算
      if (trendData.length >= 2) {
        const firstYear = trendData[0]
        const lastYear = trendData[trendData.length - 1]
        const growthRate = ((lastYear.roic - firstYear.roic) / firstYear.roic) * 100
        
        yPosition += 5
        pdf.setTextColor(59, 130, 246)
        pdf.text(`${trendData.length}年間の成長率: ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`, 25, yPosition)
      }
    }

    // フッター
    const currentDate = new Date().toLocaleDateString('ja-JP')
    pdf.setFontSize(9)
    pdf.setTextColor(156, 163, 175) // gray-400
    pdf.text(`生成日時: ${currentDate}`, 20, pageHeight - 15)
    pdf.text('Generated by Claude Code ROIC Analysis', pageWidth - 20, pageHeight - 15, { align: 'right' })

    // PDFをダウンロード
    const fileName = `ROIC分析レポート_${data.company.companyName}_${currentDate}.pdf`
    pdf.save(fileName)

  } catch (error) {
    console.error('PDF export error:', error)
    throw new Error('PDFエクスポートに失敗しました')
  }
}

/**
 * ROIC分析結果をExcelファイルとしてエクスポート
 */
export function exportROICToExcel(data: ROICReportData): void {
  try {
    const workbook = XLSX.utils.book_new()

    // 企業情報シート
    const companyData = [
      ['項目', '値'],
      ['企業名', data.company.companyName],
      ['証券コード', data.company.tickerSymbol || '-'],
      ['EDINETコード', data.company.edinetCode],
      ['業界', data.company.industry || '-'],
      ['分析対象年度', data.financialData.fiscalYear]
    ]
    const companySheet = XLSX.utils.aoa_to_sheet(companyData)
    XLSX.utils.book_append_sheet(workbook, companySheet, '企業情報')

    // 財務データシート
    const financialData = [
      ['項目', '金額（百万円）'],
      ['売上高', Math.round(data.financialData.netSales / 1000000)],
      ['総利益', Math.round(data.financialData.grossProfit / 1000000)],
      ['営業利益', Math.round(data.financialData.operatingIncome / 1000000)],
      ['受取利息', Math.round(data.financialData.interestIncome / 1000000)],
      ['総資産', Math.round(data.financialData.totalAssets / 1000000)],
      ['現金及び現金同等物', Math.round(data.financialData.cashAndEquivalents / 1000000)],
      ['株主資本', Math.round(data.financialData.shareholdersEquity / 1000000)],
      ['有利子負債', Math.round(data.financialData.interestBearingDebt / 1000000)],
      ['買掛金', Math.round(data.financialData.accountsPayable / 1000000)],
      ['未払金', Math.round(data.financialData.accruedExpenses / 1000000)],
      ['実効税率', `${(data.financialData.taxRate * 100).toFixed(1)}%`]
    ]
    const financialSheet = XLSX.utils.aoa_to_sheet(financialData)
    XLSX.utils.book_append_sheet(workbook, financialSheet, '財務データ')

    // ROIC計算結果シート
    const roicData = [
      ['計算方式', 'ROIC(%)', 'NOPAT（百万円）', '投下資本（百万円）'],
      ['基本方式', (data.roicResults.basic.roic * 100).toFixed(2), Math.round(data.roicResults.basic.nopat / 1000000), Math.round(data.roicResults.basic.investedCapital / 1000000)],
      ['詳細方式', (data.roicResults.detailed.roic * 100).toFixed(2), Math.round(data.roicResults.detailed.nopat / 1000000), Math.round(data.roicResults.detailed.investedCapital / 1000000)],
      ['アセット方式', (data.roicResults.asset.roic * 100).toFixed(2), Math.round(data.roicResults.asset.nopat / 1000000), Math.round(data.roicResults.asset.investedCapital / 1000000)],
      ['修正方式', (data.roicResults.modified.roic * 100).toFixed(2), Math.round(data.roicResults.modified.nopat / 1000000), Math.round(data.roicResults.modified.investedCapital / 1000000)]
    ]
    const roicSheet = XLSX.utils.aoa_to_sheet(roicData)
    XLSX.utils.book_append_sheet(workbook, roicSheet, 'ROIC計算結果')

    // 複数年度データがある場合はトレンドシートを追加
    if (data.multiYearData && data.multiYearData.length > 0) {
      const trendHeaders = ['年度', '売上高（百万円）', '営業利益（百万円）', 'ROIC基本(%)', 'ROIC詳細(%)', 'ROICアセット(%)', 'ROIC修正(%)']
      const trendRows = data.multiYearData
        .sort((a, b) => a.fiscalYear - b.fiscalYear)
        .map(item => {
          const convertedData = {
            operatingIncome: item.operatingIncome,
            interestIncome: item.interestIncome,
            taxRate: item.taxRate,
            totalAssets: item.totalAssets,
            cashAndEquivalents: item.cashAndEquivalents,
            shareholdersEquity: item.shareholdersEquity,
            interestBearingDebt: item.interestBearingDebt,
            accountsPayable: item.accountsPayable,
            accruedExpenses: item.accruedExpenses,
            leaseExpense: item.leaseExpense,
            leaseDebt: item.leaseDebt
          }
          const roic = calculateAllROIC(convertedData)
          return [
            item.fiscalYear,
            Math.round(item.netSales / 1000000),
            Math.round(item.operatingIncome / 1000000),
            (roic.basic.roic * 100).toFixed(2),
            (roic.detailed.roic * 100).toFixed(2),
            (roic.asset.roic * 100).toFixed(2),
            (roic.modified.roic * 100).toFixed(2)
          ]
        })

      const trendData = [trendHeaders, ...trendRows]
      const trendSheet = XLSX.utils.aoa_to_sheet(trendData)
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'トレンドデータ')
    }

    // Excelファイルをダウンロード
    const currentDate = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')
    const fileName = `ROIC分析データ_${data.company.companyName}_${currentDate}.xlsx`
    XLSX.writeFile(workbook, fileName)

  } catch (error) {
    console.error('Excel export error:', error)
    throw new Error('Excelエクスポートに失敗しました')
  }
}

/**
 * チャートを画像としてエクスポート
 */
export async function exportChartAsImage(elementId: string, fileName: string): Promise<void> {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('チャート要素が見つかりません')
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // 高解像度
      logging: false
    })

    // 画像をダウンロード
    const link = document.createElement('a')
    link.download = fileName
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

  } catch (error) {
    console.error('Chart export error:', error)
    throw new Error('チャート画像のエクスポートに失敗しました')
  }
}

/**
 * 業界比較データをExcelエクスポート用に整形
 */
export function exportIndustryComparisonToExcel(industryData: any[], fileName: string): void {
  try {
    const workbook = XLSX.utils.book_new()

    // 業界比較データシート
    const headers = ['順位', '企業名', '証券コード', 'ROIC(%)', '四分位', '業界', '売上高（百万円）']
    const rows = industryData.map((company, index) => [
      index + 1,
      company.name,
      company.code,
      (company.roic * 100).toFixed(2),
      company.quartile,
      company.industry,
      Math.round(company.revenue / 1000000) || '-'
    ])

    const sheetData = [headers, ...rows]
    const sheet = XLSX.utils.aoa_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(workbook, sheet, '業界比較')

    // 統計情報シート
    const stats = calculateIndustryStats(industryData)
    const statsData = [
      ['統計項目', '値'],
      ['企業数', industryData.length],
      ['平均ROIC(%)', (stats.average * 100).toFixed(2)],
      ['中央値ROIC(%)', (stats.median * 100).toFixed(2)],
      ['標準偏差', stats.standardDeviation.toFixed(3)],
      ['最大値(%)', (stats.max * 100).toFixed(2)],
      ['最小値(%)', (stats.min * 100).toFixed(2)],
      ['第1四分位(%)', (stats.q1 * 100).toFixed(2)],
      ['第3四分位(%)', (stats.q3 * 100).toFixed(2)]
    ]
    const statsSheet = XLSX.utils.aoa_to_sheet(statsData)
    XLSX.utils.book_append_sheet(workbook, statsSheet, '統計情報')

    const currentDate = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')
    XLSX.writeFile(workbook, `${fileName}_${currentDate}.xlsx`)

  } catch (error) {
    console.error('Industry comparison export error:', error)
    throw new Error('業界比較データのエクスポートに失敗しました')
  }
}

/**
 * 業界統計を計算
 */
function calculateIndustryStats(data: any[]) {
  const roicValues = data.map(d => d.roic).sort((a, b) => a - b)
  const n = roicValues.length
  
  const average = roicValues.reduce((sum, val) => sum + val, 0) / n
  const median = n % 2 === 0 
    ? (roicValues[n/2 - 1] + roicValues[n/2]) / 2 
    : roicValues[Math.floor(n/2)]
  
  const variance = roicValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / n
  const standardDeviation = Math.sqrt(variance)
  
  const q1 = roicValues[Math.floor(n * 0.25)]
  const q3 = roicValues[Math.floor(n * 0.75)]
  
  return {
    average,
    median,
    standardDeviation,
    max: roicValues[n - 1],
    min: roicValues[0],
    q1,
    q3
  }
}