/**
 * 100社ずつの段階的EDINET API統合テストスクリプト
 * 1000社を100社×10回に分けて実行
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 設定
const BATCH_SIZE = 100;
const TOTAL_BATCHES = 10;
const CONCURRENT_REQUESTS = 2; // さらに控えめに
const API_BASE_URL = 'https://roic-horikens-projects.vercel.app/api';
const FISCAL_YEAR = 2023;
const DELAY_BETWEEN_REQUESTS = 1000; // 1秒間隔

// 実際の上場企業EDINETコード（確実に存在するもの優先）
const KNOWN_REAL_COMPANIES = [
  'E02144', // トヨタ自動車
  'E04425', // ソフトバンクグループ
  'E02166', // ソニーグループ
  'E03814', // セブン&アイ・ホールディングス
  'E04430', // ファーストリテイリング
  'E03577', // 三菱UFJフィナンシャル・グループ
  'E03571', // 三井住友フィナンシャルグループ
  'E01593', // NTT
  'E01585', // KDDI
  'E04206', // ソフトバンク
  'E02142', // ホンダ
  'E02362', // 日産自動車
  'E01798', // パナソニック
  'E01739', // 三菱電機
  'E02513', // 三井物産
  'E02511', // 伊藤忠商事
  'E02768', // 双日
  'E02491', // 住友商事
  'E02497', // 丸紅
  'E02269', // 明治ホールディングス
  'E00383', // 日本製鉄
  'E01264', // JFEホールディングス
  'E00048', // アサヒグループホールディングス
  'E00040', // キリンホールディングス
  'E00378', // 花王
  'E00381', // 資生堂
  'E04502', // 武田薬品工業
  'E04503', // アステラス製薬
  'E04506', // 大塚ホールディングス
  'E04507', // 塩野義製薬
];

// 100社のバッチを生成
function generateBatch(batchNumber) {
  const companies = [];
  
  // 最初のバッチには確実な企業を含める
  if (batchNumber === 1) {
    companies.push(...KNOWN_REAL_COMPANIES);
  }
  
  // 残りを順次EDINETコードで埋める
  const startCode = (batchNumber - 1) * BATCH_SIZE + 1;
  for (let i = startCode; companies.length < BATCH_SIZE; i++) {
    const code = `E${i.toString().padStart(5, '0')}`;
    if (!companies.includes(code)) {
      companies.push(code);
    }
  }
  
  return companies.slice(0, BATCH_SIZE);
}

// 結果格納用
let allResults = {
  successful: [],
  failed: [],
  summary: {
    totalTested: 0,
    successCount: 0,
    failureCount: 0,
    realDataCount: 0,
    startTime: new Date(),
    endTime: null
  },
  batchResults: []
};

/**
 * 実際のEDINET APIから財務データを取得
 */
async function fetchFinancialData(edinetCode) {
  return new Promise((resolve) => {
    const url = `${API_BASE_URL}/edinet/financial-safe?edinetCode=${edinetCode}&fiscalYear=${FISCAL_YEAR}`;
    const startTime = Date.now();
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ROIC-Batch-Test/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          if (res.statusCode !== 200) {
            resolve({
              success: false,
              edinetCode,
              error: `HTTP_${res.statusCode}`,
              responseTime
            });
            return;
          }
          
          const result = JSON.parse(data);
          resolve({
            success: result.success,
            edinetCode,
            data: result.data,
            source: result.source,
            responseTime
          });
        } catch (parseError) {
          resolve({
            success: false,
            edinetCode,
            error: 'JSON_PARSE_ERROR',
            responseTime
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        edinetCode,
        error: 'REQUEST_ERROR',
        responseTime: Date.now() - startTime
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        edinetCode,
        error: 'TIMEOUT',
        responseTime: 30000
      });
    });
  });
}

/**
 * データソース分析
 */
function analyzeDataSource(result) {
  if (!result.success || !result.data) return 'error';
  
  const source = result.source || '';
  const data = result.data;
  
  if (source.includes('direct_data') || data.dataSource?.includes('direct_data')) {
    return 'real';
  } else if (source.includes('estimated') || data.dataSource?.includes('estimated')) {
    return 'estimated';
  }
  
  return 'unknown';
}

/**
 * ROIC計算
 */
function calculateROIC(data) {
  if (!data || typeof data.operatingIncome !== 'number' || typeof data.totalAssets !== 'number') {
    return null;
  }
  
  const operatingIncome = data.operatingIncome;
  const taxRate = data.taxRate || 0.30;
  const nopat = operatingIncome * (1 - taxRate);
  const totalAssets = data.totalAssets;
  const cash = data.cashAndEquivalents || 0;
  const investedCapital = totalAssets - cash;
  
  if (investedCapital <= 0) return null;
  
  return (nopat / investedCapital) * 100;
}

/**
 * 単一バッチ処理
 */
async function processBatch(batchNumber, companies) {
  console.log(`\\n=== バッチ ${batchNumber} 開始 (${companies.length}社) ===`);
  
  const batchResults = {
    batchNumber,
    successful: [],
    failed: [],
    summary: {
      totalTested: 0,
      successCount: 0,
      failureCount: 0,
      realDataCount: 0,
      startTime: new Date()
    }
  };
  
  // 順次処理（レート制限対応）
  for (let i = 0; i < companies.length; i++) {
    const edinetCode = companies[i];
    const result = await fetchFinancialData(edinetCode);
    
    batchResults.summary.totalTested++;
    allResults.summary.totalTested++;
    
    if (result.success) {
      const dataSource = analyzeDataSource(result);
      const roic = calculateROIC(result.data);
      
      const record = {
        edinetCode,
        companyName: result.data.companyName || `企業 ${edinetCode}`,
        dataSource,
        roic,
        netSales: result.data.netSales,
        responseTime: result.responseTime
      };
      
      batchResults.successful.push(record);
      allResults.successful.push(record);
      batchResults.summary.successCount++;
      allResults.summary.successCount++;
      
      if (dataSource === 'real') {
        batchResults.summary.realDataCount++;
        allResults.summary.realDataCount++;
      }
      
      // 成功時の進捗表示
      if (batchResults.summary.successCount % 10 === 0) {
        console.log(`✅ バッチ${batchNumber}: ${batchResults.summary.successCount}社成功 (実データ: ${batchResults.summary.realDataCount}社)`);
      }
      
    } else {
      const record = {
        edinetCode,
        error: result.error,
        responseTime: result.responseTime
      };
      
      batchResults.failed.push(record);
      allResults.failed.push(record);
      batchResults.summary.failureCount++;
      allResults.summary.failureCount++;
    }
    
    // リクエスト間隔を空ける
    if (i < companies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  batchResults.summary.endTime = new Date();
  const duration = batchResults.summary.endTime - batchResults.summary.startTime;
  const successRate = ((batchResults.summary.successCount / batchResults.summary.totalTested) * 100).toFixed(1);
  
  console.log(`バッチ ${batchNumber} 完了: ${Math.round(duration / 1000)}秒`);
  console.log(`成功: ${batchResults.summary.successCount}/${batchResults.summary.totalTested} (${successRate}%)`);
  console.log(`実データ: ${batchResults.summary.realDataCount}社`);
  
  allResults.batchResults.push(batchResults);
  
  return batchResults;
}

/**
 * レポート生成
 */
function generateReport() {
  allResults.summary.endTime = new Date();
  const duration = allResults.summary.endTime - allResults.summary.startTime;
  const successRate = ((allResults.summary.successCount / allResults.summary.totalTested) * 100).toFixed(1);
  const realDataRate = ((allResults.summary.realDataCount / allResults.summary.totalTested) * 100).toFixed(1);
  
  const report = {
    testInfo: {
      testType: 'Batch EDINET API Integration Test - 100 Companies per Batch',
      totalCompanies: allResults.summary.totalTested,
      totalBatches: allResults.batchResults.length,
      fiscalYear: FISCAL_YEAR,
      testDuration: `${Math.round(duration / 1000)}秒`,
      batchSize: BATCH_SIZE
    },
    results: {
      successCount: allResults.summary.successCount,
      failureCount: allResults.summary.failureCount,
      successRate: `${successRate}%`,
      realDataCount: allResults.summary.realDataCount,
      realDataRate: `${realDataRate}%`
    },
    batchSummary: allResults.batchResults.map(batch => ({
      batchNumber: batch.batchNumber,
      successCount: batch.summary.successCount,
      failureCount: batch.summary.failureCount,
      realDataCount: batch.summary.realDataCount,
      successRate: `${((batch.summary.successCount / batch.summary.totalTested) * 100).toFixed(1)}%`
    })),
    topPerformers: allResults.successful
      .filter(c => c.roic !== null)
      .sort((a, b) => b.roic - a.roic)
      .slice(0, 20),
    realDataCompanies: allResults.successful
      .filter(c => c.dataSource === 'real')
      .sort((a, b) => (b.netSales || 0) - (a.netSales || 0)),
    failures: allResults.failed
  };
  
  return report;
}

/**
 * レポート保存
 */
function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `batch-test-report-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\\n📄 詳細レポートを保存: ${reportPath}`);
  
  return reportPath;
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 段階的EDINET API統合テスト開始');
  console.log(`バッチサイズ: ${BATCH_SIZE}社`);
  console.log(`総バッチ数: ${TOTAL_BATCHES}回`);
  console.log(`リクエスト間隔: ${DELAY_BETWEEN_REQUESTS}ms`);
  console.log(`API エンドポイント: ${API_BASE_URL}/edinet/financial-safe`);
  
  // バッチごとに実行
  for (let batchNumber = 1; batchNumber <= TOTAL_BATCHES; batchNumber++) {
    const companies = generateBatch(batchNumber);
    await processBatch(batchNumber, companies);
    
    // バッチ間の休憩（最後のバッチ以外）
    if (batchNumber < TOTAL_BATCHES) {
      console.log(`⏳ 次のバッチまで5秒待機...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // 最終レポート
  console.log('\\n📊 最終レポート生成中...');
  const report = generateReport();
  const reportPath = saveReport(report);
  
  console.log('\\n=== 段階的EDINET API統合テスト結果 ===');
  console.log(`総テスト企業数: ${report.testInfo.totalCompanies}`);
  console.log(`成功: ${report.results.successCount} (${report.results.successRate})`);
  console.log(`失敗: ${report.results.failureCount}`);
  console.log(`実データ取得: ${report.results.realDataCount}社 (${report.results.realDataRate})`);
  console.log(`テスト時間: ${report.testInfo.testDuration}`);
  
  console.log('\\n=== バッチ別結果 ===');
  report.batchSummary.forEach(batch => {
    console.log(`バッチ ${batch.batchNumber}: 成功${batch.successCount} (${batch.successRate}), 実データ${batch.realDataCount}社`);
  });
  
  if (report.realDataCompanies.length > 0) {
    console.log('\\n=== 実データ取得企業 ===');
    report.realDataCompanies.forEach((company, index) => {
      const sales = company.netSales ? `${(company.netSales / 1000000000000).toFixed(1)}兆円` : 'N/A';
      const roic = company.roic !== null ? `${company.roic.toFixed(2)}%` : 'N/A';
      console.log(`${index + 1}. ${company.companyName}: 売上${sales}, ROIC ${roic}`);
    });
  }
  
  console.log('\\n✅ 段階的EDINET API統合テスト完了');
  console.log(`📄 詳細レポート: ${reportPath}`);
  
  // 評価
  const successRate = parseFloat(report.results.successRate);
  const realDataRate = parseFloat(report.results.realDataRate);
  
  if (successRate >= 70 && realDataRate >= 5) {
    console.log(`🎉 優秀な結果！`);
  } else if (successRate >= 50) {
    console.log(`👍 良好な結果`);
  } else {
    console.log(`⚠️  要改善`);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 段階的テストエラー:', error);
    process.exit(1);
  });
}

module.exports = { main };