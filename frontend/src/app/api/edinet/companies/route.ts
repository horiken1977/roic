import { NextRequest, NextResponse } from 'next/server'

/**
 * EDINET API企業検索プロキシ
 * 
 * 実際のEDINET APIから企業情報を取得して返します。
 * CORSの問題を回避するためのプロキシサーバーとして機能します。
 */

interface EDINETDocument {
  docID: string
  edinetCode: string
  secCode: string | null
  JCN: string | null
  filerName: string
  fundCode: string | null
  ordinanceCode: string
  formCode: string
  docTypeCode: string
  periodStart: string | null
  periodEnd: string | null
  submitDateTime: string
  docDescription: string
  issuerEdinetCode: string | null
  subjectEdinetCode: string | null
  subsidiaryEdinetCode: string | null
  currentReportReason: string | null
  parentDocID: string | null
  opeDateTime: string | null
  withdrawalStatus: string
  docInfoEditStatus: string
  disclosureStatus: string
  xbrlFlag: string
  pdfFlag: string
  attachDocFlag: string
  englishDocFlag: string
  csvFlag: string
}

interface EDINETDocumentsResponse {
  metadata: {
    title: string
    parameter: {
      date: string
      type: string
    }
    resultset: {
      count: number
    }
    processDateTime: string
    status: string
    message: string
  }
  results?: EDINETDocument[]
}

interface CompanyInfo {
  edinetCode: string
  companyName: string
  tickerSymbol?: string
  industry?: string
  latestDocuments?: EDINETDocument[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const apiKey = process.env.EDINET_API_KEY

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'クエリパラメータが必要です' },
        { status: 400 }
      )
    }

    if (!apiKey) {
      console.warn('EDINET_API_KEY が設定されていません。サンプルデータを返します。')
      return getSampleData(query)
    }

    // 過去30日間の書類を検索して企業を特定
    const companies = await searchCompaniesFromDocuments(query, apiKey)

    return NextResponse.json({
      success: true,
      data: companies,
      message: `${companies.length}件の企業が見つかりました`
    })

  } catch (error) {
    console.error('EDINET API検索エラー:', error)
    
    // エラーの場合はサンプルデータを返す
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    return getSampleData(query)
  }
}

async function searchCompaniesFromDocuments(query: string, apiKey: string): Promise<CompanyInfo[]> {
  const companies = new Map<string, CompanyInfo>()
  
  // 過去7日間の書類を検索
  const dates = getRecentDates(7)
  
  for (const date of dates) {
    try {
      const documentsUrl = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json`
      const response = await fetch(`${documentsUrl}?date=${date}&type=2&Subscription-Key=${apiKey}`, {
        headers: {
          'User-Agent': 'ROIC-Analysis-System/1.0'
        }
      })

      if (!response.ok) {
        console.warn(`日付 ${date} の書類取得に失敗:`, response.status)
        continue
      }

      const data: EDINETDocumentsResponse = await response.json()
      
      if (!data.results) {
        continue
      }

      // 有価証券報告書のみをフィルタリング（docTypeCode: 120）
      const securitiesReports = data.results.filter(doc => 
        doc.docTypeCode === '120' && 
        doc.xbrlFlag === '1' // XBRLデータがある
      )

      // クエリに一致する企業を検索
      for (const doc of securitiesReports) {
        const matchesQuery = 
          doc.filerName.toLowerCase().includes(query.toLowerCase()) ||
          (doc.secCode && doc.secCode.includes(query)) ||
          doc.edinetCode.includes(query)

        if (matchesQuery) {
          const edinetCode = doc.edinetCode
          
          if (!companies.has(edinetCode)) {
            companies.set(edinetCode, {
              edinetCode,
              companyName: doc.filerName,
              tickerSymbol: doc.secCode || undefined,
              industry: undefined, // 後で業界情報を取得する場合
              latestDocuments: []
            })
          }

          const company = companies.get(edinetCode)!
          company.latestDocuments!.push(doc)
        }
      }
    } catch (error) {
      console.error(`日付 ${date} の処理中にエラー:`, error)
      continue
    }
  }

  // 最新の書類順でソート
  return Array.from(companies.values()).map(company => ({
    ...company,
    latestDocuments: company.latestDocuments!
      .sort((a, b) => new Date(b.submitDateTime).getTime() - new Date(a.submitDateTime).getTime())
      .slice(0, 5) // 最新5件まで
  }))
}

function getRecentDates(days: number): string[] {
  const dates: string[] = []
  const today = new Date()
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // 平日のみ（土日は書類提出なし）
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      dates.push(date.toISOString().split('T')[0])
    }
  }
  
  return dates
}

// フォールバック用サンプルデータ
function getSampleData(query: string) {
  const sampleCompanies = [
    {
      edinetCode: 'E02144',
      companyName: 'トヨタ自動車株式会社',
      tickerSymbol: '7203',
      industry: '輸送用機器'
    },
    {
      edinetCode: 'E02513',
      companyName: 'ソニーグループ株式会社',
      tickerSymbol: '6758',
      industry: '電気機器'
    },
    {
      edinetCode: 'E03568',
      companyName: '三菱UFJフィナンシャル・グループ',
      tickerSymbol: '8306',
      industry: '銀行業'
    },
    {
      edinetCode: 'E03562',
      companyName: '株式会社ファーストリテイリング',
      tickerSymbol: '9983',
      industry: '小売業'
    },
    {
      edinetCode: 'E02282',
      companyName: '株式会社キーエンス',
      tickerSymbol: '6861',
      industry: '電気機器'
    }
  ]

  const filtered = sampleCompanies.filter(company => 
    company.companyName.toLowerCase().includes(query.toLowerCase()) ||
    company.tickerSymbol?.includes(query) ||
    company.edinetCode.includes(query)
  )

  return NextResponse.json({
    success: true,
    data: filtered,
    message: `${filtered.length}件の企業が見つかりました（サンプルデータ）`
  })
}