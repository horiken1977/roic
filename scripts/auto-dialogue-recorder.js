#!/usr/bin/env node

/**
 * 自動対話記録システム
 * Auto Dialogue Recorder System
 * 
 * 2時間に1回、開発状況をCLAUDE.mdに自動記録
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutoDialogueRecorder {
  constructor() {
    this.projectRoot = process.cwd();
    this.claudeFilePath = path.join(this.projectRoot, 'CLAUDE.md');
    this.lastRecordFile = path.join(this.projectRoot, '.last-dialogue-record');
    this.interval = 2 * 60 * 60 * 1000; // 2時間（ミリ秒）
    
    this.startRecording();
  }

  /**
   * 記録システム開始
   */
  startRecording() {
    console.log('🎙️ Auto Dialogue Recorder started');
    console.log(`📅 Recording every ${this.interval / 1000 / 60} minutes`);
    
    // 初回記録（開始時）
    this.recordCheckpoint('session-start');
    
    // 定期記録設定
    setInterval(() => {
      this.recordCheckpoint('periodic');
    }, this.interval);
    
    // プロセス終了時の記録
    process.on('SIGINT', () => {
      this.recordCheckpoint('session-end');
      console.log('👋 Auto Dialogue Recorder stopped');
      process.exit(0);
    });
  }

  /**
   * チェックポイント記録
   */
  recordCheckpoint(type) {
    try {
      const timestamp = new Date().toISOString();
      const japaneseTime = new Date().toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      console.log(`📝 Recording checkpoint: ${type} at ${japaneseTime}`);
      
      // 現在の状況を収集
      const currentStatus = this.collectCurrentStatus();
      
      // 記録内容を生成
      const recordContent = this.generateRecordContent(type, japaneseTime, currentStatus);
      
      // CLAUDE.mdに追記
      this.appendToClaude(recordContent);
      
      // 最終記録時刻を保存
      fs.writeFileSync(this.lastRecordFile, timestamp);
      
      console.log('✅ Checkpoint recorded successfully');
      
    } catch (error) {
      console.error('❌ Failed to record checkpoint:', error.message);
    }
  }

  /**
   * 現在の状況を収集
   */
  collectCurrentStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      workingDirectory: process.cwd(),
      gitStatus: null,
      recentFiles: [],
      testResults: null,
      runningProcesses: [],
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      }
    };

    try {
      // Git状況
      status.gitStatus = execSync('git status --porcelain 2>/dev/null || echo "No git repo"', {
        encoding: 'utf8',
        cwd: this.projectRoot
      }).trim();

      // 最近変更されたファイル
      const recentFiles = execSync('find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.md" | head -20 2>/dev/null || echo ""', {
        encoding: 'utf8',
        cwd: this.projectRoot
      }).trim();
      
      if (recentFiles) {
        status.recentFiles = recentFiles.split('\n').filter(f => f.trim());
      }

      // テスト結果（存在する場合）
      const testResultsPath = path.join(this.projectRoot, 'test-results.json');
      if (fs.existsSync(testResultsPath)) {
        status.testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
      }

      // 実行中のプロセス（Node.js関連）
      try {
        const processes = execSync('ps aux | grep node | grep -v grep | head -5 2>/dev/null || echo ""', {
          encoding: 'utf8'
        }).trim();
        
        if (processes) {
          status.runningProcesses = processes.split('\n').filter(p => p.trim());
        }
      } catch (e) {
        // プロセス情報取得失敗時は無視
      }

    } catch (error) {
      console.warn('⚠️ Some status collection failed:', error.message);
    }

    return status;
  }

  /**
   * 記録内容生成
   */
  generateRecordContent(type, japaneseTime, status) {
    const typeEmoji = {
      'session-start': '🚀',
      'periodic': '⏰',
      'session-end': '🏁'
    };

    const typeName = {
      'session-start': 'セッション開始',
      'periodic': '定期記録',
      'session-end': 'セッション終了'
    };

    let content = `\n## ${typeEmoji[type]} ${typeName[type]} - ${japaneseTime}\n\n`;

    // 基本情報
    content += `### 📊 現在の状況\n`;
    content += `- **作業ディレクトリ**: ${status.workingDirectory}\n`;
    content += `- **稼働時間**: ${Math.floor(status.systemInfo.uptime / 60)}分\n`;
    content += `- **Node.js**: ${status.systemInfo.nodeVersion}\n`;
    content += `- **プラットフォーム**: ${status.systemInfo.platform}\n\n`;

    // Git状況
    if (status.gitStatus) {
      content += `### 🔄 Git状況\n`;
      if (status.gitStatus === 'No git repo') {
        content += `- リポジトリなし\n\n`;
      } else if (status.gitStatus.trim() === '') {
        content += `- 変更なし（クリーンな状態）\n\n`;
      } else {
        content += `\`\`\`\n${status.gitStatus}\n\`\`\`\n\n`;
      }
    }

    // 最近のファイル
    if (status.recentFiles.length > 0) {
      content += `### 📁 最近のファイル（上位10件）\n`;
      status.recentFiles.slice(0, 10).forEach(file => {
        content += `- ${file}\n`;
      });
      content += `\n`;
    }

    // テスト結果
    if (status.testResults) {
      content += `### 🧪 テスト状況\n`;
      if (status.testResults.unit) {
        content += `- **ユニットテスト**: ${status.testResults.unit.passed}/${status.testResults.unit.total} 成功\n`;
        content += `- **カバレッジ**: ${status.testResults.unit.coverage}%\n`;
      }
      if (status.testResults.e2e) {
        content += `- **E2Eテスト**: ${status.testResults.e2e.passed}/${status.testResults.e2e.total} 成功\n`;
      }
      content += `\n`;
    }

    // 実行中プロセス
    if (status.runningProcesses.length > 0) {
      content += `### 🔧 実行中のプロセス\n`;
      status.runningProcesses.forEach(proc => {
        const simplified = proc.replace(/\s+/g, ' ').substring(0, 100);
        content += `- ${simplified}\n`;
      });
      content += `\n`;
    }

    // セッション固有の情報
    if (type === 'session-start') {
      content += `### 🎯 セッション開始時の目標\n`;
      content += `- 自動記録システムの稼働確認\n`;
      content += `- 開発作業の継続\n\n`;
    } else if (type === 'session-end') {
      content += `### 📝 セッション終了時のメモ\n`;
      content += `- 作業完了または中断\n`;
      content += `- 次回セッションでの引き継ぎ事項を確認\n\n`;
    }

    content += `---\n`;

    return content;
  }

  /**
   * CLAUDE.mdに追記
   */
  appendToClaude(content) {
    if (!fs.existsSync(this.claudeFilePath)) {
      console.warn('⚠️ CLAUDE.md not found, creating new file');
      fs.writeFileSync(this.claudeFilePath, '# Claude Code 対話記録\n\n');
    }

    fs.appendFileSync(this.claudeFilePath, content);
  }

  /**
   * 最終記録時刻を取得
   */
  getLastRecordTime() {
    if (fs.existsSync(this.lastRecordFile)) {
      const timestamp = fs.readFileSync(this.lastRecordFile, 'utf8');
      return new Date(timestamp);
    }
    return null;
  }

  /**
   * 手動記録トリガー
   */
  manualRecord(note = '') {
    console.log('📝 Manual recording triggered');
    
    const currentStatus = this.collectCurrentStatus();
    const japaneseTime = new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    let content = `\n## 📝 手動記録 - ${japaneseTime}\n\n`;
    
    if (note) {
      content += `### 💭 メモ\n${note}\n\n`;
    }
    
    content += this.generateRecordContent('periodic', japaneseTime, currentStatus);
    
    this.appendToClaude(content);
    
    console.log('✅ Manual record completed');
  }
}

// CLI実行
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--manual') {
    const recorder = new AutoDialogueRecorder();
    recorder.manualRecord(args[1] || '');
    process.exit(0);
  } else {
    // 通常の定期記録モード
    new AutoDialogueRecorder();
  }
}

module.exports = AutoDialogueRecorder;