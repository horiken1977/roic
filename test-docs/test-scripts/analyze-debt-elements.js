#!/usr/bin/env node

/**
 * 有利子負債XBRL要素解析スクリプト
 * トヨタ自動車の有価証券報告書から有利子負債関連要素を全抽出
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');
const { parseStringPromise } = require('xml2js');

// .env.localファイルから環境変数を読み込み
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

console.log('🔍 有利子負債XBRL要素詳細解析開始...');

async function downloadXBRL(apiKey, docId) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docId}?type=5&Subscriptionkey=${apiKey}`;
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    }).on('error', reject);
  });
}

async function extractXBRLData(zipBuffer) {
  return new Promise((resolve, reject) => {
    const directory = unzipper.Open.buffer(zipBuffer);
    
    directory.then(async (zip) => {
      let xbrlContent = null;
      
      for (const file of zip.files) {
        if (file.path.includes('XBRL/PublicDoc/') && file.path.endsWith('.xbrl')) {
          console.log(`📄 XBRLファイル発見: ${file.path}`);
          const content = await file.buffer();
          xbrlContent = content.toString('utf-8');
          break;
        }
      }
      
      if (!xbrlContent) {
        reject(new Error('XBRLファイルが見つかりません'));
        return;
      }
      
      const parsed = await parseStringPromise(xbrlContent);
      resolve(parsed);
    }).catch(reject);
  });
}

function analyzeDebtElements(xbrlData) {
  console.log('\n🎯 有利子負債関連要素の詳細解析...');
  
  const contexts = xbrlData.xbrl['xbrli:context'] || [];
  const facts = Object.keys(xbrlData.xbrl).filter(key => !key.startsWith('xbrli:') && !key.startsWith('xsi:') && !key.startsWith('link:'));
  
  console.log(`📊 コンテキスト数: ${contexts.length}`);
  console.log(`📊 ファクト要素数: ${facts.length}`);
  
  // 現在年度のInstantコンテキストを特定
  let currentYearContext = null;
  contexts.forEach(context => {
    const contextData = Array.isArray(context) ? context[0] : context;
    const period = contextData['xbrli:period'][0];
    
    if (period['xbrli:instant']) {
      const instant = period['xbrli:instant'][0];
      if (instant === '2023-03-31') {
        currentYearContext = contextData.$.id;
        console.log(`✅ 現在年度コンテキスト特定: ${currentYearContext}`);
      }
    }
  });
  
  if (!currentYearContext) {
    console.log('❌ 現在年度のコンテキストが見つかりません');
    return null;
  }
  
  // 有利子負債関連のキーワード
  const debtKeywords = [
    // 日本語
    '借入', '社債', '負債', 'ローン',
    // 英語（一般的）
    'Debt', 'Loan', 'Borrow', 'Bond', 'Payable', 'Liability',
    // 英語（詳細）
    'ShortTerm', 'LongTerm', 'Current', 'NonCurrent',
    'Commercial', 'Paper', 'Note', 'Finance', 'Lease',
    // 具体的要素名
    'LoansPayable', 'BorrowingsPayable', 'BondsPayable',
    'ShortTermDebt', 'LongTermDebt', 'CurrentDebt', 'NoncurrentDebt'
  ];
  
  const debtElements = [];
  
  facts.forEach(factKey => {
    const factData = xbrlData.xbrl[factKey];
    if (!factData || !Array.isArray(factData)) return;
    
    factData.forEach(fact => {
      if (!fact.$ || fact.$.contextRef !== currentYearContext) return;
      
      // 有利子負債関連キーワードチェック
      const isDebtRelated = debtKeywords.some(keyword => 
        factKey.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isDebtRelated && fact._ && !isNaN(parseFloat(fact._))) {
        const value = parseFloat(fact._);
        if (value > 0) {
          debtElements.push({
            elementName: factKey,
            value: value,
            context: fact.$.contextRef,
            unit: fact.$.unitRef || 'JPY',
            decimals: fact.$.decimals
          });
        }
      }
    });
  });
  
  // 金額順にソート
  debtElements.sort((a, b) => b.value - a.value);
  
  return debtElements;
}

async function analyzeDebtStructure() {
  try {
    const apiKey = process.env.EDINET_API_KEY;
    if (!apiKey || apiKey === '実際のAPIキーをここに入力してください') {
      throw new Error('EDINET APIキーが設定されていません');
    }
    
    console.log('\n📡 トヨタ自動車の有価証券報告書を取得中...');
    
    // まず書類を検索
    const searchUrl = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=2023-06-30&type=2&Subscriptionkey=${apiKey}`;
    
    const searchData = await new Promise((resolve, reject) => {
      https.get(searchUrl, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
    
    // トヨタの書類を探す
    const toyotaDoc = searchData.results.find(doc => 
      doc.edinetCode === 'E02144' && 
      doc.periodEnd === '2023-03-31'
    );
    
    if (!toyotaDoc) {
      throw new Error('トヨタ自動車の2023年3月期有価証券報告書が見つかりません');
    }
    
    console.log(`📄 対象書類: ${toyotaDoc.docID} (${toyotaDoc.filerName})`);
    
    // XBRLデータをダウンロード
    console.log('\n📥 XBRLデータをダウンロード中...');
    const zipBuffer = await downloadXBRL(apiKey, toyotaDoc.docID);
    
    // XBRLデータを解析
    console.log('\n🔍 XBRLデータを解析中...');
    const xbrlData = await extractXBRLData(zipBuffer);
    
    // 有利子負債要素を解析
    const debtElements = analyzeDebtElements(xbrlData);
    
    if (!debtElements || debtElements.length === 0) {
      console.log('❌ 有利子負債関連要素が見つかりませんでした');
      return null;
    }
    
    console.log(`\n📊 有利子負債関連要素 (${debtElements.length}件発見):`);
    console.log('━'.repeat(100));
    
    let totalDebt = 0;
    const significantDebts = [];
    
    debtElements.forEach((element, index) => {
      const amountBillion = element.value / 1000000000000;
      console.log(`${(index + 1).toString().padStart(2)}. ${element.elementName}`);
      console.log(`    金額: ${element.value.toLocaleString()}円 (${amountBillion.toFixed(2)}兆円)`);
      console.log(`    単位: ${element.unit}`);
      console.log('');
      
      // 1兆円以上を有意な負債として集計
      if (element.value >= 1000000000000) {
        significantDebts.push(element);
        totalDebt += element.value;
      }
    });
    
    console.log('\n🎯 主要有利子負債（1兆円以上）の集計:');
    console.log('━'.repeat(100));
    
    significantDebts.forEach((debt, index) => {
      const amountBillion = debt.value / 1000000000000;
      console.log(`${(index + 1).toString().padStart(2)}. ${debt.elementName}: ${amountBillion.toFixed(2)}兆円`);
    });
    
    console.log('\n📈 集計結果:');
    console.log('━'.repeat(80));
    console.log(`合計金額: ${totalDebt.toLocaleString()}円`);
    console.log(`合計金額: ${(totalDebt / 1000000000000).toFixed(2)}兆円`);
    console.log(`期待値: 38.79兆円`);
    console.log(`誤差: ${Math.abs((totalDebt - 38792879000000) / 38792879000000 * 100).toFixed(1)}%`);
    
    // 結果を保存
    const analysis = {
      timestamp: new Date().toISOString(),
      company: 'E02144 (トヨタ自動車)',
      fiscalYear: '2023',
      analysis: {
        totalElementsFound: debtElements.length,
        significantDebtsCount: significantDebts.length,
        totalDebtCalculated: totalDebt,
        expectedDebt: 38792879000000,
        accuracy: Math.abs((totalDebt - 38792879000000) / 38792879000000 * 100),
        allDebtElements: debtElements,
        significantDebts: significantDebts
      }
    };
    
    fs.writeFileSync('有利子負債要素解析結果_2025-07-07.json', JSON.stringify(analysis, null, 2));
    console.log('\n📁 解析結果を保存: 有利子負債要素解析結果_2025-07-07.json');
    
    return analysis;
    
  } catch (error) {
    console.error('❌ 解析中にエラーが発生:', error.message);
    return null;
  }
}

// 実行
if (require.main === module) {
  analyzeDebtStructure().then(result => {
    if (result) {
      console.log('\n🎉 有利子負債要素解析完了！');
      console.log('📋 次のステップ: 発見された要素をAPIの抽出ロジックに追加');
    } else {
      console.log('\n⚠️ 解析に問題が発生しました');
    }
  });
}

module.exports = { analyzeDebtStructure };