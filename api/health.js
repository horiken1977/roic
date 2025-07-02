/**
 * Vercel Functions ヘルスチェックエンドポイント
 */

export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // プリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // ヘルスチェック情報を返す
  return res.status(200).json({
    success: true,
    message: 'Vercel Functions is working',
    timestamp: new Date().toISOString(),
    env: {
      hasEdinetApiKey: !!process.env.EDINET_API_KEY,
      nodeVersion: process.version
    }
  });
}