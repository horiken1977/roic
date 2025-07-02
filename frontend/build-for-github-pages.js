#!/usr/bin/env node

/**
 * GitHub Pages用の特別なビルドスクリプト
 * API routesを使わない静的サイトとしてビルド
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 GitHub Pages用ビルドを開始...');

// 1. next.config.tsを一時的に静的エクスポート用に変更
const nextConfigPath = path.join(__dirname, 'next.config.ts');
const nextConfigBackup = fs.readFileSync(nextConfigPath, 'utf8');

const staticConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: '/roic',
  assetPrefix: '/roic/',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
`;

try {
  console.log('📝 next.config.tsを静的エクスポート用に変更...');
  fs.writeFileSync(nextConfigPath, staticConfig);

  console.log('🔨 静的サイトをビルド中...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('✅ GitHub Pages用ビルド完了！');
  
} catch (error) {
  console.error('❌ ビルドエラー:', error.message);
  process.exit(1);
} finally {
  // 設定ファイルを元に戻す
  console.log('🔄 next.config.tsを元に戻しています...');
  fs.writeFileSync(nextConfigPath, nextConfigBackup);
}