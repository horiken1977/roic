/**
 * 三菱電機のXBRLデータ構造を詳細分析するAPIエンドポイント
 */

const https = require('https');

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.EDINET_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'EDINET_API_KEY not configured'
      });
    }

    // 三菱電機の書類ID（ログから取得）
    const docId = 'S100W0EM';
    
    console.log(`=== 三菱電機 詳細分析開始 (docId: ${docId}) ===`);
    
    // type=1でXBRLデータを取得
    const xbrlData = await fetchEdinetXbrl(docId, apiKey, 1);
    
    const analysis = {
      success: true,
      docId: docId,
      timestamp: new Date().toISOString(),
      analysis: {
        dataSize: xbrlData.length,
        isZip: xbrlData[0] === 0x50 && xbrlData[1] === 0x4B,
        first100Bytes: xbrlData.slice(0, 100).toString('hex'),
        first100ASCII: xbrlData.slice(0, 100).toString('ascii').replace(/[^\x20-\x7E]/g, '.'),
        contentType: 'binary',
        zipAnalysis: null,
        directXmlAnalysis: null
      }
    };

    // ZIPファイルの場合の詳細分析
    if (analysis.analysis.isZip) {
      analysis.analysis.zipAnalysis = analyzeZipStructure(xbrlData);
    } else {
      // 直接XMLとして分析
      const textContent = xbrlData.toString('utf8', 0, Math.min(xbrlData.length, 10000));
      analysis.analysis.directXmlAnalysis = {
        hasXmlDeclaration: textContent.includes('<?xml'),
        hasXbrlTags: textContent.includes('<xbrl') || textContent.includes('<XBRL'),
        hasFinancialTags: [
          'NetSales', 'OperatingIncome', 'TotalAssets', 
          '営業収益', '営業利益', '資産合計'
        ].some(tag => textContent.includes(tag)),
        first1000Chars: textContent.substring(0, 1000)
      };
    }

    // type=5でも試してみる
    try {
      const csvData = await fetchEdinetXbrl(docId, apiKey, 5);
      analysis.csvTypeAnalysis = {
        dataSize: csvData.length,
        isZip: csvData[0] === 0x50 && csvData[1] === 0x4B,
        first100Bytes: csvData.slice(0, 100).toString('hex'),
        first100ASCII: csvData.slice(0, 100).toString('ascii').replace(/[^\x20-\x7E]/g, '.')
      };

      if (analysis.csvTypeAnalysis.isZip) {
        analysis.csvTypeAnalysis.zipAnalysis = analyzeZipStructure(csvData);
      }
    } catch (error) {
      analysis.csvTypeAnalysis = { error: error.message };
    }

    console.log('分析結果:', JSON.stringify(analysis, null, 2));
    
    return res.status(200).json(analysis);

  } catch (error) {
    console.error('分析エラー:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

function fetchEdinetXbrl(docId, apiKey, type) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docId}?type=${type}&Subscription-Key=${apiKey}`;
    
    console.log(`Fetching: ${url.replace(apiKey, '***')}`);
    
    const req = https.get(url, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`データサイズ: ${buffer.length} bytes`);
        resolve(buffer);
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function analyzeZipStructure(zipBuffer) {
  try {
    const analysis = {
      fileEntries: [],
      totalFiles: 0,
      hasCSV: false,
      hasXML: false,
      errors: []
    };

    // ZIP構造の簡易解析
    let offset = 0;
    while (offset < zipBuffer.length - 30) {
      // ローカルファイルヘッダーを探す (PK\x03\x04)
      if (zipBuffer[offset] === 0x50 && zipBuffer[offset + 1] === 0x4B && 
          zipBuffer[offset + 2] === 0x03 && zipBuffer[offset + 3] === 0x04) {
        
        try {
          // ファイル名の長さを読む
          const fileNameLength = zipBuffer[offset + 26] + (zipBuffer[offset + 27] << 8);
          const extraFieldLength = zipBuffer[offset + 28] + (zipBuffer[offset + 29] << 8);
          const compressedSize = zipBuffer[offset + 18] + (zipBuffer[offset + 19] << 8) + 
                               (zipBuffer[offset + 20] << 16) + (zipBuffer[offset + 21] << 24);
          
          // ファイル名を読む
          const fileNameStart = offset + 30;
          const fileName = zipBuffer.subarray(fileNameStart, fileNameStart + fileNameLength).toString('utf8');
          
          analysis.fileEntries.push({
            fileName: fileName,
            compressedSize: compressedSize,
            isCSV: fileName.toLowerCase().includes('.csv'),
            isXML: fileName.toLowerCase().includes('.xml') || fileName.toLowerCase().includes('.xbrl')
          });
          
          if (fileName.toLowerCase().includes('.csv')) analysis.hasCSV = true;
          if (fileName.toLowerCase().includes('.xml') || fileName.toLowerCase().includes('.xbrl')) analysis.hasXML = true;
          
          analysis.totalFiles++;
          
          // 次のファイルエントリへ
          offset = fileNameStart + fileNameLength + extraFieldLength + compressedSize;
        } catch (error) {
          analysis.errors.push(`File entry parsing error at offset ${offset}: ${error.message}`);
          offset++;
        }
      } else {
        offset++;
      }
      
      // 最大10ファイルまで解析
      if (analysis.totalFiles >= 10) break;
    }

    return analysis;
  } catch (error) {
    return { error: error.message };
  }
}