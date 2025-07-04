/**
 * トヨタ自動車のEDINET APIから直近3年分のデータを取得
 * 実際のAPIレスポンスをそのまま保存
 */

const https = require('https');
const fs = require('fs');

// EDINET API設定
const EDINET_API_KEY = process.env.EDINET_API_KEY || '';
const TOYOTA_EDINET_CODE = 'E02144';

/**
 * EDINET APIから書類一覧を取得
 */
async function fetchDocumentList(date) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${EDINET_API_KEY}`;
    
    console.log(`📅 ${date}の書類一覧を取得中...`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.error(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
            resolve([]);
            return;
          }
          
          const result = JSON.parse(data);
          const documents = result.results || [];
          
          // トヨタ自動車の書類のみフィルタ
          const toyotaDocs = documents.filter(doc => 
            doc.edinetCode === TOYOTA_EDINET_CODE &&
            (doc.docTypeCode === '120' || doc.docTypeCode === '130') // 有価証券報告書・四半期報告書
          );
          
          console.log(`✅ ${date}: ${toyotaDocs.length}件のトヨタ書類を発見`);
          resolve(toyotaDocs);
        } catch (error) {
          console.error(`❌ JSONパースエラー: ${error.message}`);
          resolve([]);
        }
      });
    }).on('error', (error) => {
      console.error(`❌ リクエストエラー: ${error.message}`);
      resolve([]);
    });
  });
}

/**
 * EDINET APIから書類詳細を取得
 */
async function fetchDocumentDetail(docID) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docID}?type=1&Subscription-Key=${EDINET_API_KEY}`;
    
    console.log(`📄 書類ID ${docID} の詳細を取得中...`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.error(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
            resolve(null);
            return;
          }
          
          // ZIPファイルの場合は別途処理が必要
          console.log(`✅ 書類データ取得完了（${data.length}バイト）`);
          resolve({
            docID: docID,
            contentType: res.headers['content-type'],
            dataSize: data.length,
            rawData: data.substring(0, 1000) // 最初の1000文字のみ保存
          });
        } catch (error) {
          console.error(`❌ エラー: ${error.message}`);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error(`❌ リクエストエラー: ${error.message}`);
      resolve(null);
    });
  });
}

/**
 * 日付リストを生成（過去3年分）
 */
function generateDateList() {
  const dates = [];
  const today = new Date();
  
  // 過去3年分の日付を生成（月初と月末）
  for (let year = 0; year < 3; year++) {
    for (let month = 0; month < 12; month++) {
      const targetDate = new Date(today.getFullYear() - year, today.getMonth() - month, 1);
      
      // 月初
      dates.push(targetDate.toISOString().split('T')[0]);
      
      // 月末
      const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      dates.push(lastDay.toISOString().split('T')[0]);
    }
  }
  
  return dates.slice(0, 36); // 最大36日分（3年分の主要日）
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 トヨタ自動車EDINET データ取得開始');
  console.log('==========================================');
  console.log(`📊 対象企業: トヨタ自動車株式会社（${TOYOTA_EDINET_CODE}）`);
  console.log(`🔑 APIキー: ${EDINET_API_KEY ? '設定済み' : '未設定'}`);
  console.log('==========================================\n');
  
  if (!EDINET_API_KEY) {
    console.error('❌ EDINET_API_KEY環境変数が設定されていません');
    console.log('💡 環境変数を設定してください: export EDINET_API_KEY="your-api-key"');
    return;
  }
  
  const allDocuments = [];
  const dates = generateDateList();
  
  // 各日付で書類を検索
  for (const date of dates) {
    const documents = await fetchDocumentList(date);
    allDocuments.push(...documents);
    
    // API レート制限対策
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 取得結果: 合計${allDocuments.length}件の書類`);
  
  // 年度別に整理
  const documentsByYear = {};
  allDocuments.forEach(doc => {
    const year = doc.periodEnd ? doc.periodEnd.substring(0, 4) : 'unknown';
    if (!documentsByYear[year]) {
      documentsByYear[year] = [];
    }
    documentsByYear[year].push(doc);
  });
  
  // 結果を保存
  const result = {
    searchDate: new Date().toISOString(),
    company: 'トヨタ自動車株式会社',
    edinetCode: TOYOTA_EDINET_CODE,
    totalDocuments: allDocuments.length,
    documentsByYear: documentsByYear,
    allDocuments: allDocuments,
    apiResponses: {
      sampleDocuments: allDocuments.slice(0, 5) // 最初の5件のみ詳細保存
    }
  };
  
  // JSONファイルとして保存
  const fileName = `toyota-edinet-data-${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(fileName, JSON.stringify(result, null, 2), 'utf8');
  
  console.log(`\n✅ データ保存完了: ${fileName}`);
  
  // CSVファイルも作成
  const csvData = [
    ['年度', '書類ID', '書類種別', '提出日', '決算期末', 'XBRLフラグ', 'PDFフラグ']
  ];
  
  allDocuments.forEach(doc => {
    csvData.push([
      doc.periodEnd || '',
      doc.docID || '',
      doc.docTypeCode || '',
      doc.submitDateTime || '',
      doc.periodEnd || '',
      doc.xbrlFlag || '',
      doc.pdfFlag || ''
    ]);
  });
  
  const csvContent = csvData.map(row => row.join(',')).join('\n');
  const csvFileName = `toyota-edinet-documents-${new Date().toISOString().slice(0, 10)}.csv`;
  fs.writeFileSync(csvFileName, csvContent, 'utf8');
  
  console.log(`✅ CSV保存完了: ${csvFileName}`);
  
  // 年度別サマリー表示
  console.log('\n📅 年度別書類数:');
  Object.entries(documentsByYear).sort().reverse().forEach(([year, docs]) => {
    console.log(`   ${year}年: ${docs.length}件`);
  });
  
  // 最新の有価証券報告書を特定
  const yuhos = allDocuments.filter(doc => doc.docTypeCode === '120');
  console.log(`\n📑 有価証券報告書: ${yuhos.length}件`);
  yuhos.slice(0, 5).forEach(yuho => {
    console.log(`   - ${yuho.periodEnd} (${yuho.submitDateTime}) - ID: ${yuho.docID}`);
  });
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { main };