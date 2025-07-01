#!/usr/bin/env node

/**
 * 自動コミット・プッシュスクリプト
 * ファイル変更を検知して自動的にgit commit & pushを実行
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

// 設定
const CONFIG = {
  // 監視対象ディレクトリ
  WATCH_PATHS: [
    'frontend/src',
    'docs',
    'config',
    'scripts',
    '.github/workflows',
    'aws'
  ],
  
  // 除外パターン
  IGNORE_PATTERNS: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.next/**',
    '**/out/**',
    '**/.DS_Store',
    '**/*.log',
    '**/coverage/**',
    '**/dist/**'
  ],
  
  // コミット設定
  COMMIT: {
    DEBOUNCE_TIME: 30000, // 30秒のデバウンス
    MAX_FILES_PER_COMMIT: 50,
    AUTO_PUSH: true
  }
};

// 状態管理
let pendingChanges = new Set();
let commitTimer = null;
let isCommitting = false;

/**
 * Git操作の実行
 * @param {string} command - gitコマンド
 * @returns {string} 実行結果
 */
function executeGit(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    console.error(`❌ Git command failed: ${command}`);
    console.error(error.message);
    return null;
  }
}

/**
 * 現在のGitステータスをチェック
 * @returns {boolean} 変更があるかどうか
 */
function hasChanges() {
  const status = executeGit('git status --porcelain');
  return status && status.trim().length > 0;
}

/**
 * 変更されたファイルのリストを取得
 * @returns {Array<string>} ファイルパスの配列
 */
function getChangedFiles() {
  const status = executeGit('git status --porcelain');
  if (!status) return [];
  
  return status
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.substring(3).trim());
}

/**
 * コミットメッセージを生成
 * @param {Array<string>} files - 変更されたファイル
 * @returns {string} コミットメッセージ
 */
function generateCommitMessage(files) {
  const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  
  // ファイルタイプ別に分類
  const categories = {
    frontend: files.filter(f => f.startsWith('frontend/')),
    docs: files.filter(f => f.includes('docs') || f.endsWith('.md')),
    config: files.filter(f => f.includes('config') || f.endsWith('.json')),
    scripts: files.filter(f => f.includes('scripts') || f.endsWith('.js')),
    workflows: files.filter(f => f.includes('.github/workflows')),
    aws: files.filter(f => f.includes('aws/')),
    other: files.filter(f => !f.startsWith('frontend/') && !f.includes('docs') && 
                            !f.includes('config') && !f.includes('scripts') && 
                            !f.includes('.github') && !f.includes('aws/'))
  };
  
  // 主な変更カテゴリを特定
  const mainCategory = Object.entries(categories)
    .filter(([_, files]) => files.length > 0)
    .sort((a, b) => b[1].length - a[1].length)[0];
  
  const categoryEmojis = {
    frontend: '🎨',
    docs: '📚',
    config: '⚙️',
    scripts: '🔧',
    workflows: '🔄',
    aws: '☁️',
    other: '📦'
  };
  
  const emoji = mainCategory ? categoryEmojis[mainCategory[0]] : '🔄';
  const action = mainCategory ? mainCategory[0] : 'update';
  
  // 変更内容の要約
  const summary = Object.entries(categories)
    .filter(([_, files]) => files.length > 0)
    .map(([category, files]) => `${category}: ${files.length}件`)
    .join(', ');
  
  return `${emoji} 自動更新: ${action} (${summary})

📅 更新日時: ${timestamp}
📝 変更ファイル数: ${files.length}
🔄 自動コミット・プッシュ

変更内容:
${files.slice(0, 10).map(f => `- ${f}`).join('\n')}${files.length > 10 ? `\n... 他${files.length - 10}件` : ''}

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`;
}

/**
 * 自動コミットの実行
 */
async function performAutoCommit() {
  if (isCommitting || !hasChanges()) {
    return;
  }
  
  isCommitting = true;
  console.log('\n🤖 自動コミット処理を開始します...');
  
  try {
    // 変更ファイルを取得
    const changedFiles = getChangedFiles();
    if (changedFiles.length === 0) {
      console.log('ℹ️ 変更されたファイルがありません');
      return;
    }
    
    console.log(`📝 ${changedFiles.length}個のファイルに変更を検出`);
    
    // ファイルをステージング
    executeGit('git add .');
    console.log('✅ ファイルをステージングしました');
    
    // コミットメッセージを生成
    const commitMessage = generateCommitMessage(changedFiles);
    
    // コミット実行
    const commitCommand = `git commit -m "${commitMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    const commitResult = executeGit(commitCommand);
    
    if (commitResult) {
      console.log('✅ コミットが成功しました');
      
      // 自動プッシュ
      if (CONFIG.COMMIT.AUTO_PUSH) {
        console.log('🚀 リモートリポジトリにプッシュしています...');
        const pushResult = executeGit('git push origin main');
        
        if (pushResult) {
          console.log('✅ プッシュが成功しました');
          
          // 成功をproject-config.jsonに記録
          updateAutomationMetrics();
        } else {
          console.log('⚠️ プッシュに失敗しました（後で手動でプッシュしてください）');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 自動コミット中にエラーが発生しました:', error);
  } finally {
    isCommitting = false;
    pendingChanges.clear();
  }
}

/**
 * 自動化メトリクスを更新
 */
function updateAutomationMetrics() {
  try {
    const configPath = path.join(__dirname, '../config/project-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // メトリクスを初期化または更新
    if (!config.automation.metrics) {
      config.automation.metrics = {
        auto_commits: 0,
        auto_pushes: 0,
        last_auto_commit: null
      };
    }
    
    config.automation.metrics.auto_commits++;
    config.automation.metrics.auto_pushes++;
    config.automation.metrics.last_auto_commit = new Date().toISOString();
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('📊 自動化メトリクスを更新しました');
  } catch (error) {
    console.error('メトリクス更新エラー:', error);
  }
}

/**
 * ファイル変更のハンドラー
 * @param {string} filePath - 変更されたファイルパス
 */
function handleFileChange(filePath) {
  // .gitやnode_modulesの変更は無視
  if (filePath.includes('.git/') || filePath.includes('node_modules/')) {
    return;
  }
  
  console.log(`📝 ファイル変更を検出: ${filePath}`);
  pendingChanges.add(filePath);
  
  // デバウンス処理
  if (commitTimer) {
    clearTimeout(commitTimer);
  }
  
  commitTimer = setTimeout(() => {
    if (pendingChanges.size > 0) {
      performAutoCommit();
    }
  }, CONFIG.COMMIT.DEBOUNCE_TIME);
}

/**
 * メイン処理
 */
function main() {
  console.log('🤖 自動コミット・プッシュシステムを起動しています...');
  console.log(`📁 監視対象: ${CONFIG.WATCH_PATHS.join(', ')}`);
  console.log(`⏱️ デバウンス時間: ${CONFIG.COMMIT.DEBOUNCE_TIME / 1000}秒`);
  console.log(`🚀 自動プッシュ: ${CONFIG.COMMIT.AUTO_PUSH ? '有効' : '無効'}`);
  console.log('');
  
  // ファイル監視の設定
  const watcher = chokidar.watch(CONFIG.WATCH_PATHS, {
    ignored: CONFIG.IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  // イベントハンドラー
  watcher
    .on('add', handleFileChange)
    .on('change', handleFileChange)
    .on('unlink', handleFileChange)
    .on('error', error => console.error('❌ 監視エラー:', error))
    .on('ready', () => {
      console.log('✅ ファイル監視を開始しました');
      console.log('💡 ヒント: Ctrl+C で終了できます\n');
    });
  
  // 初回起動時にpendingな変更があればコミット
  setTimeout(() => {
    if (hasChanges()) {
      console.log('🔍 起動時に未コミットの変更を検出しました');
      performAutoCommit();
    }
  }, 5000);
  
  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log('\n👋 自動コミット・プッシュシステムを終了します');
    watcher.close();
    process.exit(0);
  });
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { performAutoCommit, generateCommitMessage };