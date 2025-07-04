/**
 * 依存関係テスト用エンドポイント
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const results = {};

    // https モジュールテスト
    try {
      const https = require('https');
      results.https = { success: true, message: 'https module loaded' };
    } catch (error) {
      results.https = { success: false, error: error.message };
    }

    // unzipper モジュールテスト
    try {
      const unzipper = require('unzipper');
      results.unzipper = { success: true, message: 'unzipper module loaded' };
    } catch (error) {
      results.unzipper = { success: false, error: error.message };
    }

    // xml2js モジュールテスト
    try {
      const { parseStringPromise } = require('xml2js');
      results.xml2js = { success: true, message: 'xml2js module loaded' };
    } catch (error) {
      results.xml2js = { success: false, error: error.message };
    }

    // stream モジュールテスト
    try {
      const stream = require('stream');
      results.stream = { success: true, message: 'stream module loaded' };
    } catch (error) {
      results.stream = { success: false, error: error.message };
    }

    return res.status(200).json({
      success: true,
      dependencies: results,
      nodeVersion: process.version,
      platform: process.platform
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};