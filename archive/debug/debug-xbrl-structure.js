/**
 * XBRL構造デバッグスクリプト
 * トヨタ自動車のXBRLファイル構造を詳細分析
 */

const https = require('https');
const unzipper = require('unzipper');
const { parseStringPromise } = require('xml2js');

async function debugXBRLStructure() {
  const apiKey = process.env.EDINET_API_KEY;
  
  if (!apiKey) {
    console.error('❌ EDINET_API_KEY が設定されていません');
    return;
  }

  try {
    console.log('🔍 トヨタ自動車のXBRL構造デバッグ開始...');
    
    // 1. 書類検索
    const docID = await findToyotaDocument(apiKey);
    if (!docID) {
      console.error('❌ 書類が見つかりません');
      return;
    }
    
    console.log(`📄 書類ID: ${docID}`);
    
    // 2. XBRLファイル取得
    const xbrlContent = await fetchXBRL(docID, apiKey);
    console.log(`📏 XBRLファイルサイズ: ${xbrlContent.length} 文字`);
    
    // 3. XML構造解析
    const result = await parseStringPromise(xbrlContent, {
      tagNameProcessors: [(name) => name.split(':').pop()],
      ignoreAttrs: false,
      mergeAttrs: true
    });
    
    console.log('\n🏗️ XBRL構造分析:');
    console.log('ルート要素:', Object.keys(result));
    
    const xbrl = result.xbrl || result;
    console.log('XBRL子要素:', Object.keys(xbrl));
    
    // 4. コンテキスト分析
    const contexts = findElements(xbrl, 'context');
    console.log(`\n📅 コンテキスト数: ${contexts.length}`);
    
    contexts.slice(0, 5).forEach((ctx, i) => {
      console.log(`Context ${i + 1}:`, {
        id: ctx.id,
        period: ctx.period?.[0],
        entity: ctx.entity?.[0]?.identifier?.[0]?._
      });
    });
    
    // 5. 財務データ要素の検索
    console.log('\n💰 財務データ要素検索:');
    
    const salesElements = findFinancialElements(xbrl, [
      'NetSales', 'Sales', 'Revenue', 'OperatingRevenue'
    ]);
    console.log('売上高関連要素:', salesElements.slice(0, 3));
    
    const profitElements = findFinancialElements(xbrl, [
      'OperatingIncome', 'OperatingProfit', 'Profit'
    ]);
    console.log('営業利益関連要素:', profitElements.slice(0, 3));
    
    const assetElements = findFinancialElements(xbrl, [
      'Assets', 'TotalAssets'
    ]);
    console.log('総資産関連要素:', assetElements.slice(0, 3));
    
    // 6. 名前空間分析
    console.log('\n🏷️ 名前空間分析:');
    const namespaces = extractNamespaces(xbrlContent);
    console.log('検出された名前空間:', Object.keys(namespaces).slice(0, 10));
    
    // 7. 実際の値を持つ要素の検索
    console.log('\n🔢 数値要素サンプル:');
    const numericElements = findNumericElements(xbrl);
    numericElements.slice(0, 10).forEach(elem => {
      console.log(`${elem.key}: ${elem.value} (context: ${elem.contextRef})`);
    });
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error.message);
  }
}

// 書類検索
async function findToyotaDocument(apiKey) {
  const searchDates = [
    '2025-06-18', '2025-06-19', '2025-06-20'
  ];
  
  for (const date of searchDates) {
    try {
      const documents = await fetchDocumentList(date, apiKey);
      const toyotaDoc = documents.find(doc => 
        doc.edinetCode === 'E02144' && doc.docTypeCode === '120'
      );
      
      if (toyotaDoc) {
        console.log(`✅ 書類発見: ${toyotaDoc.docDescription} (${date})`);
        return toyotaDoc.docID;
      }
    } catch (error) {
      console.warn(`⚠️ ${date}: ${error.message}`);
    }
  }
  
  return null;
}

// 書類一覧取得
function fetchDocumentList(date, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.results || []);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// XBRL取得
function fetchXBRL(docID, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docID}?type=1&Subscription-Key=${apiKey}`;
    
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const xbrlContent = await extractXBRLFromZip(buffer);
          resolve(xbrlContent);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// ZIP解凍
async function extractXBRLFromZip(buffer) {
  return new Promise((resolve, reject) => {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    let xbrlContent = null;
    
    bufferStream
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const fileName = entry.path;
        
        if (fileName.includes('PublicDoc') && fileName.endsWith('.xbrl')) {
          const chunks = [];
          entry.on('data', chunk => chunks.push(chunk));
          entry.on('end', () => {
            xbrlContent = Buffer.concat(chunks).toString('utf-8');
          });
        } else {
          entry.autodrain();
        }
      })
      .on('finish', () => {
        if (xbrlContent) {
          resolve(xbrlContent);
        } else {
          reject(new Error('XBRLファイルが見つかりません'));
        }
      })
      .on('error', reject);
  });
}

// 要素検索
function findElements(obj, elementName, results = []) {
  if (typeof obj !== 'object' || obj === null) return results;
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === elementName || key.endsWith(`:${elementName}`)) {
      if (Array.isArray(value)) {
        results.push(...value);
      } else {
        results.push(value);
      }
    }
    
    if (Array.isArray(value)) {
      value.forEach(item => findElements(item, elementName, results));
    } else if (typeof value === 'object') {
      findElements(value, elementName, results);
    }
  }
  
  return results;
}

// 財務要素検索
function findFinancialElements(xbrl, searchTerms) {
  const elements = [];
  
  function search(obj, path = '') {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      // キー名に検索語が含まれているかチェック
      const matchesSearch = searchTerms.some(term => 
        key.toLowerCase().includes(term.toLowerCase())
      );
      
      if (matchesSearch && Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object' && item.contextRef) {
            elements.push({
              key: key,
              value: item._ || item.$text || item,
              contextRef: item.contextRef,
              path: path
            });
          }
        });
      }
      
      if (Array.isArray(value)) {
        value.forEach(item => search(item, `${path}.${key}`));
      } else if (typeof value === 'object') {
        search(value, path ? `${path}.${key}` : key);
      }
    }
  }
  
  search(xbrl);
  return elements;
}

// 名前空間抽出
function extractNamespaces(xmlContent) {
  const namespaces = {};
  const regex = /xmlns:([^=]+)="([^"]+)"/g;
  let match;
  
  while ((match = regex.exec(xmlContent)) !== null) {
    namespaces[match[1]] = match[2];
  }
  
  return namespaces;
}

// 数値要素検索
function findNumericElements(xbrl) {
  const elements = [];
  
  function search(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object' && item.contextRef) {
            const val = item._ || item.$text || item;
            if (val && !isNaN(val) && val !== '0') {
              elements.push({
                key: key,
                value: val,
                contextRef: item.contextRef
              });
            }
          } else {
            search(item);
          }
        });
      } else if (typeof value === 'object') {
        search(value);
      }
    }
  }
  
  search(xbrl);
  return elements.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

// 実行
if (require.main === module) {
  debugXBRLStructure();
}

module.exports = { debugXBRLStructure };