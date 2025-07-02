import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
 * ROIC分析結果をPDFレポートとしてエクスポート（文字化け対応版）
 */
export async function exportROICToPDF(data: ROICReportData): Promise<void> {
  try {
    console.log('Starting PDF export with data:', data)
    
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPosition = 20

    // 日本語ヘッダー
    pdf.setFontSize(20)
    pdf.setTextColor(31, 41, 55)
    pdf.text('ROIC分析レポート', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // 企業情報テーブル
    const companyInfo = [
      ['企業名', data.company.companyName],
      ['証券コード', data.company.tickerSymbol || '-'],
      ['EDINETコード', data.company.edinetCode],
      ['業界', data.company.industry || '-'],
      ['分析年度', data.financialData.fiscalYear.toString()]
    ]

    autoTable(pdf, {
      startY: yPosition,
      head: [['項目', '値']],
      body: companyInfo,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    })

    // autoTableの最終Y位置を取得
    yPosition = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 10 : yPosition + 50

    // 財務データテーブル（百万円単位）
    const financialData = [
      ['売上高', (data.financialData.netSales / 1000000).toFixed(0) + '百万円'],
      ['売上総利益', (data.financialData.grossProfit / 1000000).toFixed(0) + '百万円'],
      ['営業利益', (data.financialData.operatingIncome / 1000000).toFixed(0) + '百万円'],
      ['受取利息', (data.financialData.interestIncome / 1000000).toFixed(0) + '百万円'],
      ['総資産', (data.financialData.totalAssets / 1000000).toFixed(0) + '百万円'],
      ['現金及び現金同等物', (data.financialData.cashAndEquivalents / 1000000).toFixed(0) + '百万円'],
      ['株主資本', (data.financialData.shareholdersEquity / 1000000).toFixed(0) + '百万円'],
      ['有利子負債', (data.financialData.interestBearingDebt / 1000000).toFixed(0) + '百万円'],
      ['買掛金', (data.financialData.accountsPayable / 1000000).toFixed(0) + '百万円'],
      ['未払金', (data.financialData.accruedExpenses / 1000000).toFixed(0) + '百万円'],
      ['実効税率', (data.financialData.taxRate * 100).toFixed(1) + '%']
    ]

    autoTable(pdf, {
      startY: yPosition,
      head: [['財務項目', '金額']],
      body: financialData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    })

    // autoTableの最終Y位置を取得
    yPosition = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 10 : yPosition + 50

    // ROIC計算結果テーブル
    const roicData = [
      [
        '基本方式',
        (data.roicResults.basic.roic * 100).toFixed(2) + '%',
        (data.roicResults.basic.nopat / 1000000).toFixed(0) + '百万円',
        (data.roicResults.basic.investedCapital / 1000000).toFixed(0) + '百万円'
      ],
      [
        '詳細方式',
        (data.roicResults.detailed.roic * 100).toFixed(2) + '%',
        (data.roicResults.detailed.nopat / 1000000).toFixed(0) + '百万円',
        (data.roicResults.detailed.investedCapital / 1000000).toFixed(0) + '百万円'
      ],
      [
        'アセット方式',
        (data.roicResults.asset.roic * 100).toFixed(2) + '%',
        (data.roicResults.asset.nopat / 1000000).toFixed(0) + '百万円',
        (data.roicResults.asset.investedCapital / 1000000).toFixed(0) + '百万円'
      ],
      [
        '修正方式',
        (data.roicResults.modified.roic * 100).toFixed(2) + '%',
        (data.roicResults.modified.nopat / 1000000).toFixed(0) + '百万円',
        (data.roicResults.modified.investedCapital / 1000000).toFixed(0) + '百万円'
      ]
    ]

    autoTable(pdf, {
      startY: yPosition,
      head: [['計算方式', 'ROIC (%)', 'NOPAT (百万円)', '投下資本 (百万円)']],
      body: roicData,
      theme: 'striped',
      headStyles: { fillColor: [147, 51, 234] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      }
    })

    // autoTableの最終Y位置を取得
    yPosition = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 10 : yPosition + 50

    // 複数年度データがある場合
    if (data.multiYearData && data.multiYearData.length > 1) {
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
          return [
            item.fiscalYear.toString(),
            (roic.basic.roic * 100).toFixed(2) + '%',
            (roic.detailed.roic * 100).toFixed(2) + '%',
            (roic.asset.roic * 100).toFixed(2) + '%',
            (roic.modified.roic * 100).toFixed(2) + '%'
          ]
        })

      autoTable(pdf, {
        startY: yPosition,
        head: [['年度', '基本方式ROIC', '詳細方式ROIC', 'アセット方式ROIC', '修正方式ROIC']],
        body: trendData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 9, cellPadding: 3, halign: 'center' }
      })
    }

    // フッター
    const currentDate = new Date().toLocaleDateString('ja-JP')
    pdf.setFontSize(8)
    pdf.setTextColor(156, 163, 175)
    pdf.text(`作成日: ${currentDate}`, 20, pageHeight - 15)
    pdf.text('Claude Code ROIC分析システム', pageWidth - 20, pageHeight - 15, { align: 'right' })

    // ダウンロード（ファイル名も日本語）
    const fileName = `ROIC分析レポート_${data.company.companyName.replace(/[^\w\s]/gi, '')}_${currentDate.replace(/\//g, '-')}.pdf`
    pdf.save(fileName)

  } catch (error) {
    console.error('PDF export error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      data: data
    })
    throw new Error(`PDFエクスポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
  }
}

/**
 * ROIC分析結果をExcelファイルとしてエクスポート（詳細計算データ付き）
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

    // 財務データシート（原数値・百万円・計算に使用した値）
    const financialRawData = [
      ['財務項目', '原数値（円）', '百万円', '計算用値', '備考'],
      ['売上高', data.financialData.netSales, Math.round(data.financialData.netSales / 1000000), data.financialData.netSales, '損益計算書'],
      ['総利益', data.financialData.grossProfit, Math.round(data.financialData.grossProfit / 1000000), data.financialData.grossProfit, '売上高 - 売上原価'],
      ['営業利益', data.financialData.operatingIncome, Math.round(data.financialData.operatingIncome / 1000000), data.financialData.operatingIncome, 'NOPAT計算に使用'],
      ['受取利息', data.financialData.interestIncome, Math.round(data.financialData.interestIncome / 1000000), data.financialData.interestIncome, '詳細方式NOPAT計算に加算'],
      ['販売費及び一般管理費', data.financialData.sellingAdminExpenses, Math.round(data.financialData.sellingAdminExpenses / 1000000), data.financialData.sellingAdminExpenses, '営業利益算出に使用'],
      ['', '', '', '', ''],
      ['総資産', data.financialData.totalAssets, Math.round(data.financialData.totalAssets / 1000000), data.financialData.totalAssets, '貸借対照表'],
      ['現金及び現金同等物', data.financialData.cashAndEquivalents, Math.round(data.financialData.cashAndEquivalents / 1000000), data.financialData.cashAndEquivalents, '基本方式で総資産から控除'],
      ['株主資本', data.financialData.shareholdersEquity, Math.round(data.financialData.shareholdersEquity / 1000000), data.financialData.shareholdersEquity, '詳細方式投下資本'],
      ['有利子負債', data.financialData.interestBearingDebt, Math.round(data.financialData.interestBearingDebt / 1000000), data.financialData.interestBearingDebt, '詳細方式投下資本に加算'],
      ['買掛金', data.financialData.accountsPayable, Math.round(data.financialData.accountsPayable / 1000000), data.financialData.accountsPayable, 'アセット方式で控除'],
      ['未払金', data.financialData.accruedExpenses, Math.round(data.financialData.accruedExpenses / 1000000), data.financialData.accruedExpenses, 'アセット方式で控除'],
      ['リース費用', data.financialData.leaseExpense || 0, Math.round((data.financialData.leaseExpense || 0) / 1000000), data.financialData.leaseExpense || 0, '修正方式NOPAT調整'],
      ['リース債務', data.financialData.leaseDebt || 0, Math.round((data.financialData.leaseDebt || 0) / 1000000), data.financialData.leaseDebt || 0, '修正方式投下資本調整'],
      ['実効税率', data.financialData.taxRate, `${(data.financialData.taxRate * 100).toFixed(1)}%`, data.financialData.taxRate, 'NOPAT = 営業利益 × (1 - 税率)']
    ]
    const financialSheet = XLSX.utils.aoa_to_sheet(financialRawData)
    XLSX.utils.book_append_sheet(workbook, financialSheet, '財務データ詳細')

    // ROIC計算過程シート
    const calculationData = [
      ['計算方式', '計算式', '数値代入', '結果'],
      ['', '', '', ''],
      ['基本方式', '', '', ''],
      ['NOPAT', '営業利益 × (1 - 実効税率)', `${Math.round(data.financialData.operatingIncome / 1000000)} × (1 - ${(data.financialData.taxRate * 100).toFixed(1)}%)`, `${Math.round(data.roicResults.basic.nopat / 1000000)} 百万円`],
      ['投下資本', '総資産 - 現金及び現金同等物', `${Math.round(data.financialData.totalAssets / 1000000)} - ${Math.round(data.financialData.cashAndEquivalents / 1000000)}`, `${Math.round(data.roicResults.basic.investedCapital / 1000000)} 百万円`],
      ['ROIC', 'NOPAT ÷ 投下資本', `${Math.round(data.roicResults.basic.nopat / 1000000)} ÷ ${Math.round(data.roicResults.basic.investedCapital / 1000000)}`, `${(data.roicResults.basic.roic * 100).toFixed(2)}%`],
      ['', '', '', ''],
      ['詳細方式', '', '', ''],
      ['NOPAT', '(営業利益 + 受取利息) × (1 - 実効税率)', `(${Math.round(data.financialData.operatingIncome / 1000000)} + ${Math.round(data.financialData.interestIncome / 1000000)}) × (1 - ${(data.financialData.taxRate * 100).toFixed(1)}%)`, `${Math.round(data.roicResults.detailed.nopat / 1000000)} 百万円`],
      ['投下資本', '株主資本 + 有利子負債', `${Math.round(data.financialData.shareholdersEquity / 1000000)} + ${Math.round(data.financialData.interestBearingDebt / 1000000)}`, `${Math.round(data.roicResults.detailed.investedCapital / 1000000)} 百万円`],
      ['ROIC', 'NOPAT ÷ 投下資本', `${Math.round(data.roicResults.detailed.nopat / 1000000)} ÷ ${Math.round(data.roicResults.detailed.investedCapital / 1000000)}`, `${(data.roicResults.detailed.roic * 100).toFixed(2)}%`],
      ['', '', '', ''],
      ['アセット方式', '', '', ''],
      ['NOPAT', '(営業利益 + 受取利息) × (1 - 実効税率)', `(${Math.round(data.financialData.operatingIncome / 1000000)} + ${Math.round(data.financialData.interestIncome / 1000000)}) × (1 - ${(data.financialData.taxRate * 100).toFixed(1)}%)`, `${Math.round(data.roicResults.asset.nopat / 1000000)} 百万円`],
      ['投下資本', '総資産 - 無利子負債(買掛金+未払金)', `${Math.round(data.financialData.totalAssets / 1000000)} - (${Math.round(data.financialData.accountsPayable / 1000000)} + ${Math.round(data.financialData.accruedExpenses / 1000000)})`, `${Math.round(data.roicResults.asset.investedCapital / 1000000)} 百万円`],
      ['ROIC', 'NOPAT ÷ 投下資本', `${Math.round(data.roicResults.asset.nopat / 1000000)} ÷ ${Math.round(data.roicResults.asset.investedCapital / 1000000)}`, `${(data.roicResults.asset.roic * 100).toFixed(2)}%`],
      ['', '', '', ''],
      ['修正方式（IFRS16対応）', '', '', ''],
      ['修正NOPAT', 'NOPAT + リース費用×(1-税率)', `${Math.round(data.roicResults.detailed.nopat / 1000000)} + ${Math.round((data.financialData.leaseExpense || 0) / 1000000)} × (1 - ${(data.financialData.taxRate * 100).toFixed(1)}%)`, `${Math.round(data.roicResults.modified.nopat / 1000000)} 百万円`],
      ['修正投下資本', '詳細方式投下資本 + リース債務', `${Math.round(data.roicResults.detailed.investedCapital / 1000000)} + ${Math.round((data.financialData.leaseDebt || 0) / 1000000)}`, `${Math.round(data.roicResults.modified.investedCapital / 1000000)} 百万円`],
      ['修正ROIC', '修正NOPAT ÷ 修正投下資本', `${Math.round(data.roicResults.modified.nopat / 1000000)} ÷ ${Math.round(data.roicResults.modified.investedCapital / 1000000)}`, `${(data.roicResults.modified.roic * 100).toFixed(2)}%`]
    ]
    const calculationSheet = XLSX.utils.aoa_to_sheet(calculationData)
    XLSX.utils.book_append_sheet(workbook, calculationSheet, 'ROIC計算過程')

    // ROIC計算結果サマリーシート
    const roicData = [
      ['計算方式', 'ROIC(%)', 'NOPAT（百万円）', '投下資本（百万円）', '評価', '用途'],
      ['基本方式', (data.roicResults.basic.roic * 100).toFixed(2), Math.round(data.roicResults.basic.nopat / 1000000), Math.round(data.roicResults.basic.investedCapital / 1000000), getROICEvaluation(data.roicResults.basic.roic), 'スクリーニング・簡易比較'],
      ['詳細方式', (data.roicResults.detailed.roic * 100).toFixed(2), Math.round(data.roicResults.detailed.nopat / 1000000), Math.round(data.roicResults.detailed.investedCapital / 1000000), getROICEvaluation(data.roicResults.detailed.roic), 'メイン指標・業界比較'],
      ['アセット方式', (data.roicResults.asset.roic * 100).toFixed(2), Math.round(data.roicResults.asset.nopat / 1000000), Math.round(data.roicResults.asset.investedCapital / 1000000), getROICEvaluation(data.roicResults.asset.roic), '資産効率性分析'],
      ['修正方式', (data.roicResults.modified.roic * 100).toFixed(2), Math.round(data.roicResults.modified.nopat / 1000000), Math.round(data.roicResults.modified.investedCapital / 1000000), getROICEvaluation(data.roicResults.modified.roic), 'IFRS16対応・国際比較']
    ]
    const roicSheet = XLSX.utils.aoa_to_sheet(roicData)
    XLSX.utils.book_append_sheet(workbook, roicSheet, 'ROIC計算結果')

    // 複数年度データがある場合はトレンドシートを追加
    if (data.multiYearData && data.multiYearData.length > 0) {
      const trendHeaders = ['年度', '売上高（百万円）', '営業利益（百万円）', '総資産（百万円）', '株主資本（百万円）', '実効税率(%)', 'ROIC基本(%)', 'ROIC詳細(%)', 'ROICアセット(%)', 'ROIC修正(%)']
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
            Math.round(item.totalAssets / 1000000),
            Math.round(item.shareholdersEquity / 1000000),
            (item.taxRate * 100).toFixed(1),
            (roic.basic.roic * 100).toFixed(2),
            (roic.detailed.roic * 100).toFixed(2),
            (roic.asset.roic * 100).toFixed(2),
            (roic.modified.roic * 100).toFixed(2)
          ]
        })

      const trendData = [trendHeaders, ...trendRows]
      const trendSheet = XLSX.utils.aoa_to_sheet(trendData)
      XLSX.utils.book_append_sheet(workbook, trendSheet, '複数年度トレンド')
    }

    // 計算式説明シート
    const formulaData = [
      ['計算方式', '計算式', '説明', '適用場面'],
      ['基本方式', 'ROIC = [営業利益 × (1 - 実効税率)] ÷ [総資産 - 現金及び現金同等物]', '最もシンプルな計算。営業利益ベースの税引後利益を使用', 'スクリーニング、業界間比較'],
      ['詳細方式', 'ROIC = [(営業利益 + 受取利息) × (1 - 実効税率)] ÷ [株主資本 + 有利子負債]', '金融収益も含めた事業利益を評価。投下資本は調達サイドから計算', '投資判断、企業価値評価'],
      ['アセット方式', 'ROIC = [(営業利益 + 受取利息) × (1 - 実効税率)] ÷ [総資産 - 無利子負債]', 'バランスシート全体から運転資本効率を評価', '資産効率性分析、製造業評価'],
      ['修正方式', 'ROIC = [詳細NOPAT + リース費用×(1-税率)] ÷ [詳細投下資本 + リース債務]', 'IFRS16対応。オペレーティングリースを資本化して調整', '国際会計基準企業、小売・航空業界'],
      ['', '', '', ''],
      ['用語', '定義', '計算方法', ''],
      ['NOPAT', 'Net Operating Profit After Tax', '営業利益から税金を控除した利益', ''],
      ['投下資本', 'Invested Capital', '事業に投下された資本の総額', ''],
      ['実効税率', 'Effective Tax Rate', '法人税等 ÷ 税引前当期純利益', 'ROICでは30%上限で設定'],
      ['', '', '', ''],
      ['評価基準', 'ROIC水準', '評価', ''],
      ['優秀', '15%以上', '資本コストを大幅に上回る優秀な水準', ''],
      ['良好', '10-15%', '資本コストを上回る良好な水準', ''],
      ['平均的', '5-10%', '業界平均的な水準', ''],
      ['要改善', '5%未満', '資本コストを下回る可能性が高い', '']
    ]
    const formulaSheet = XLSX.utils.aoa_to_sheet(formulaData)
    XLSX.utils.book_append_sheet(workbook, formulaSheet, '計算式・評価基準')

    // Excelファイルをダウンロード
    const currentDate = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')
    const fileName = `ROIC詳細分析_${data.company.companyName}_${currentDate}.xlsx`
    XLSX.writeFile(workbook, fileName)

  } catch (error) {
    console.error('Excel export error:', error)
    throw new Error('Excelエクスポートに失敗しました')
  }
}

// ROIC評価を取得するヘルパー関数
function getROICEvaluation(roic: number): string {
  if (roic >= 0.15) return '優秀'
  if (roic >= 0.10) return '良好'
  if (roic >= 0.05) return '平均的'
  return '要改善'
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