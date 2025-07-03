/**
 * Vercel Serverless Function - Vercelログ取得API
 * Vercel APIを使ってサーバーサイドログを取得
 */

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { deploymentId, since, until, limit = 100 } = req.query;
    
    // Vercel APIトークンを環境変数から取得
    const vercelToken = process.env.VERCEL_TOKEN;
    
    if (!vercelToken) {
      return res.status(400).json({
        success: false,
        error: 'VERCEL_TOKEN_NOT_CONFIGURED',
        message: 'Vercel APIトークンが設定されていません'
      });
    }

    // プロジェクト情報を取得
    const projectId = process.env.VERCEL_PROJECT_ID || 'prj_3prHjDKPtVVPqPJyexCGot0IY5DW';
    const teamId = process.env.VERCEL_TEAM_ID;
    
    let logsUrl;
    let deploymentsUrl;
    
    if (teamId) {
      // チーム環境の場合
      deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=20`;
      logsUrl = deploymentId 
        ? `https://api.vercel.com/v2/deployments/${deploymentId}/events?teamId=${teamId}&limit=${limit}`
        : null;
    } else {
      // 個人環境の場合
      deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=20`;
      logsUrl = deploymentId 
        ? `https://api.vercel.com/v2/deployments/${deploymentId}/events?limit=${limit}`
        : null;
    }

    const headers = {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json'
    };

    // deploymentIdが指定されていない場合、最新のデプロイメントを取得
    let targetDeploymentId = deploymentId;
    
    if (!targetDeploymentId) {
      console.log('最新のデプロイメント情報を取得中...');
      const deploymentsResponse = await fetch(deploymentsUrl, { headers });
      
      if (!deploymentsResponse.ok) {
        const errorText = await deploymentsResponse.text();
        console.error('デプロイメント一覧取得エラー:', deploymentsResponse.status, errorText);
        return res.status(500).json({
          success: false,
          error: 'DEPLOYMENTS_FETCH_ERROR',
          message: `デプロイメント一覧の取得に失敗しました: ${deploymentsResponse.status}`,
          details: errorText
        });
      }
      
      const deploymentsData = await deploymentsResponse.json();
      console.log('取得したデプロイメント数:', deploymentsData.deployments?.length || 0);
      
      if (!deploymentsData.deployments || deploymentsData.deployments.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NO_DEPLOYMENTS_FOUND',
          message: 'デプロイメントが見つかりませんでした'
        });
      }

      // 最新のREADYステータスのデプロイメントを選択
      const readyDeployment = deploymentsData.deployments.find(d => d.state === 'READY');
      targetDeploymentId = readyDeployment ? readyDeployment.uid : deploymentsData.deployments[0].uid;
      
      console.log('選択されたデプロイメントID:', targetDeploymentId);
    }

    // ログURLを構築
    if (teamId) {
      logsUrl = `https://api.vercel.com/v2/deployments/${targetDeploymentId}/events?teamId=${teamId}&limit=${limit}`;
    } else {
      logsUrl = `https://api.vercel.com/v2/deployments/${targetDeploymentId}/events?limit=${limit}`;
    }

    // since/untilパラメータを追加
    if (since) {
      logsUrl += `&since=${since}`;
    }
    if (until) {
      logsUrl += `&until=${until}`;
    }

    console.log('ログ取得URL:', logsUrl.replace(vercelToken, '***'));

    // Vercel APIからログを取得
    const logsResponse = await fetch(logsUrl, { headers });
    
    if (!logsResponse.ok) {
      const errorText = await logsResponse.text();
      console.error('ログ取得エラー:', logsResponse.status, errorText);
      return res.status(500).json({
        success: false,
        error: 'LOGS_FETCH_ERROR',
        message: `ログの取得に失敗しました: ${logsResponse.status}`,
        details: errorText
      });
    }

    const logsData = await logsResponse.json();
    console.log('取得したログ件数:', logsData.events?.length || 0);

    // ログデータを整形
    const formattedLogs = (logsData.events || []).map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      payload: event.payload,
      level: event.payload?.level || 'info',
      message: event.payload?.text || event.payload?.message || JSON.stringify(event.payload),
      source: 'vercel_api',
      deploymentId: targetDeploymentId
    }));

    // レスポンス
    return res.status(200).json({
      success: true,
      data: {
        deploymentId: targetDeploymentId,
        logs: formattedLogs,
        totalCount: formattedLogs.length,
        query: {
          since,
          until,
          limit: parseInt(limit)
        }
      },
      source: 'vercel_api',
      message: `${formattedLogs.length}件のVercelログを取得しました`
    });

  } catch (error) {
    console.error('Vercelログ取得エラー:', error);
    
    return res.status(500).json({
      success: false,
      error: 'VERCEL_LOGS_ERROR',
      message: `Vercelログ取得中にエラーが発生しました: ${error.message}`,
      details: error.stack
    });
  }
}