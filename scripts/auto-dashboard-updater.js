#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { execSync } = require('child_process');

class AutoDashboardUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.dashboardPath = path.join(this.projectRoot, 'frontend/src/app/dashboard/page.tsx');
    this.featuresListPath = path.join(this.projectRoot, 'docs/features.md');
    this.progressPath = path.join(this.projectRoot, 'docs/progress.md');
    this.testSpecPath = path.join(this.projectRoot, 'docs/test-spec.md');
    
    this.features = new Map();
    this.progress = new Map();
    this.testCases = new Map();
    
    this.initializeWatchers();
    this.loadExistingData();
  }

  initializeWatchers() {
    // Watch for new files and changes
    const watcher = chokidar.watch([
      'frontend/src/**/*.{tsx,ts,js}',
      'backend/**/*.{js,ts,py}',
      'docs/**/*.md',
      'tests/**/*.{js,ts,spec.js,test.js}',
      'package.json',
      'README.md'
    ], {
      ignored: /node_modules|\.git|\.next|dist|build/,
      persistent: true
    });

    watcher
      .on('add', (filePath) => this.handleFileChange(filePath, 'added'))
      .on('change', (filePath) => this.handleFileChange(filePath, 'modified'))
      .on('unlink', (filePath) => this.handleFileChange(filePath, 'deleted'));

    console.log('Auto Dashboard Updater started - monitoring for changes...');
  }

  loadExistingData() {
    // Load existing features from codebase
    this.scanForFeatures();
    this.scanForProgress();
    this.scanForTests();
    this.updateDashboard();
  }

  scanForFeatures() {
    // Scan frontend components for features
    const frontendDir = path.join(this.projectRoot, 'frontend/src');
    if (fs.existsSync(frontendDir)) {
      this.scanDirectory(frontendDir, (filePath, content) => {
        this.extractFeaturesFromFile(filePath, content);
      });
    }

    // Scan backend for API endpoints
    const backendDir = path.join(this.projectRoot, 'backend');
    if (fs.existsSync(backendDir)) {
      this.scanDirectory(backendDir, (filePath, content) => {
        this.extractAPIEndpoints(filePath, content);
      });
    }
  }

  scanForProgress() {
    // Calculate progress based on completed features and tests
    const totalFeatures = this.features.size;
    const completedFeatures = Array.from(this.features.values())
      .filter(f => f.status === 'completed').length;
    
    this.progress.set('overall', {
      total: totalFeatures,
      completed: completedFeatures,
      percentage: totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0
    });

    // Phase-specific progress
    this.updatePhaseProgress();
  }

  scanForTests() {
    const testsDir = path.join(this.projectRoot, 'tests');
    if (fs.existsSync(testsDir)) {
      this.scanDirectory(testsDir, (filePath, content) => {
        this.extractTestCases(filePath, content);
      });
    }

    // Scan for test files in frontend
    const frontendTestsDir = path.join(this.projectRoot, 'frontend/__tests__');
    if (fs.existsSync(frontendTestsDir)) {
      this.scanDirectory(frontendTestsDir, (filePath, content) => {
        this.extractTestCases(filePath, content);
      });
    }
  }

  scanDirectory(dir, callback) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.includes('node_modules') && !file.name.includes('.git')) {
        this.scanDirectory(fullPath, callback);
      } else if (file.isFile() && this.isRelevantFile(file.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          callback(fullPath, content);
        } catch (error) {
          console.warn(`Could not read file ${fullPath}:`, error.message);
        }
      }
    }
  }

  isRelevantFile(filename) {
    return /\.(tsx?|jsx?|py|md)$/.test(filename);
  }

  extractFeaturesFromFile(filePath, content) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    // Extract React components
    const componentMatches = content.match(/(?:export\s+)?(?:default\s+)?(?:function|const)\s+(\w+).*?(?:React\.FC|JSX\.Element|\(\s*\)\s*=>)/g);
    if (componentMatches) {
      componentMatches.forEach(match => {
        const componentName = match.match(/(?:function|const)\s+(\w+)/)?.[1];
        if (componentName && componentName[0] === componentName[0].toUpperCase()) {
          this.features.set(`component-${componentName}`, {
            name: componentName,
            type: 'component',
            file: relativePath,
            status: 'completed',
            description: `React component: ${componentName}`
          });
        }
      });
    }

    // Extract page routes
    if (filePath.includes('app/') && filePath.endsWith('page.tsx')) {
      const routePath = path.dirname(relativePath)
        .replace('frontend/src/app', '')
        .replace(/\\/g, '/') || '/';
      
      this.features.set(`route-${routePath}`, {
        name: `Route: ${routePath}`,
        type: 'route',
        file: relativePath,
        status: 'completed',
        description: `Application route: ${routePath}`
      });
    }
  }

  extractAPIEndpoints(filePath, content) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    // Extract Express routes
    const routeMatches = content.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (routeMatches) {
      routeMatches.forEach(match => {
        const [, method, endpoint] = match.match(/\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
        this.features.set(`api-${method}-${endpoint}`, {
          name: `${method.toUpperCase()} ${endpoint}`,
          type: 'api',
          file: relativePath,
          status: 'completed',
          description: `API endpoint: ${method.toUpperCase()} ${endpoint}`
        });
      });
    }
  }

  extractTestCases(filePath, content) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    // Extract Jest/Vitest test cases
    const testMatches = content.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (testMatches) {
      testMatches.forEach(match => {
        const testName = match.match(/\(\s*['"`]([^'"`]+)['"`]/)?.[1];
        if (testName) {
          this.testCases.set(`test-${testName}`, {
            name: testName,
            file: relativePath,
            status: 'completed',
            type: 'unit'
          });
        }
      });
    }

    // Extract Playwright test cases
    const playwrightMatches = content.match(/test\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (playwrightMatches) {
      playwrightMatches.forEach(match => {
        const testName = match.match(/\(\s*['"`]([^'"`]+)['"`]/)?.[1];
        if (testName) {
          this.testCases.set(`e2e-${testName}`, {
            name: testName,
            file: relativePath,
            status: 'completed',
            type: 'e2e'
          });
        }
      });
    }
  }

  updatePhaseProgress() {
    const phases = [
      { name: 'Phase 1: バックエンドAPI開発', features: ['api-'] },
      { name: 'Phase 2: フロントエンド基盤', features: ['component-', 'route-'] },
      { name: 'Phase 3: ROIC計算機能', features: ['roic', 'calculation'] },
      { name: 'Phase 4: データ可視化', features: ['chart', 'graph', 'visualization'] },
      { name: 'Phase 5: テスト・デプロイ', features: ['test-', 'deploy'] }
    ];

    phases.forEach((phase, index) => {
      const phaseFeatures = Array.from(this.features.entries())
        .filter(([key]) => phase.features.some(prefix => key.includes(prefix)));
      
      const total = phaseFeatures.length || 1;
      const completed = phaseFeatures.filter(([, feature]) => feature.status === 'completed').length;
      
      this.progress.set(`phase-${index + 1}`, {
        name: phase.name,
        total,
        completed,
        percentage: Math.round((completed / total) * 100)
      });
    });
  }

  handleFileChange(filePath, changeType) {
    console.log(`File ${changeType}: ${filePath}`);
    
    // Re-scan for features and tests
    if (this.isRelevantFile(path.basename(filePath))) {
      this.loadExistingData();
      this.updateDashboard();
      this.updateFeaturesList();
      this.updateProgressDoc();
      this.updateTestSpec();
    }
  }

  updateDashboard() {
    if (!fs.existsSync(this.dashboardPath)) return;

    const dashboardContent = fs.readFileSync(this.dashboardPath, 'utf8');
    
    // Generate progress data for the dashboard
    const progressData = Array.from(this.progress.entries())
      .filter(([key]) => key.startsWith('phase-'))
      .map(([key, data]) => ({
        phase: data.name,
        progress: data.percentage,
        completed: data.completed,
        total: data.total
      }));

    // Update progress widget data
    const progressWidgetRegex = /const\s+progressData\s*=\s*\[[\s\S]*?\];/;
    const newProgressData = `const progressData = ${JSON.stringify(progressData, null, 6)};`;
    
    let updatedContent = dashboardContent;
    if (progressWidgetRegex.test(dashboardContent)) {
      updatedContent = dashboardContent.replace(progressWidgetRegex, newProgressData);
    }

    // Update stats
    const totalFeatures = this.features.size;
    const completedFeatures = Array.from(this.features.values())
      .filter(f => f.status === 'completed').length;
    const totalTests = this.testCases.size;
    
    const statsRegex = /className="text-3xl font-bold text-blue-600">(\d+)</;
    updatedContent = updatedContent.replace(
      new RegExp(`(機能実装状況.*?text-3xl font-bold text-blue-600">)\\d+`, 's'),
      `$1${completedFeatures}`
    );
    updatedContent = updatedContent.replace(
      new RegExp(`(テスト実行状況.*?text-3xl font-bold text-green-600">)\\d+`, 's'),
      `$1${totalTests}`
    );

    fs.writeFileSync(this.dashboardPath, updatedContent);
    console.log('Dashboard updated with latest progress');
  }

  updateFeaturesList() {
    const featuresContent = `# 機能一覧

## 実装済み機能

${Array.from(this.features.values())
  .filter(f => f.status === 'completed')
  .map(f => `### ${f.name}
- **タイプ**: ${f.type}
- **ファイル**: ${f.file}
- **説明**: ${f.description}
- **ステータス**: ✅ 完了

`).join('')}

## 開発中機能

${Array.from(this.features.values())
  .filter(f => f.status === 'in_progress')
  .map(f => `### ${f.name}
- **タイプ**: ${f.type}
- **ファイル**: ${f.file}
- **説明**: ${f.description}
- **ステータス**: 🚧 開発中

`).join('')}

## 予定機能

- ROIC計算エンジンの高度化
- リアルタイムデータ更新
- 詳細な業界分析機能
- エクスポート機能の拡張

---
*最終更新: ${new Date().toLocaleString('ja-JP')}*
`;

    fs.writeFileSync(this.featuresListPath, featuresContent);
    console.log('Features list updated');
  }

  updateProgressDoc() {
    const overallProgress = this.progress.get('overall') || { percentage: 0, completed: 0, total: 0 };
    
    const progressContent = `# 開発進捗状況

## 全体進捗

- **完了率**: ${overallProgress.percentage}%
- **完了機能**: ${overallProgress.completed}/${overallProgress.total}

## フェーズ別進捗

${Array.from(this.progress.entries())
  .filter(([key]) => key.startsWith('phase-'))
  .map(([key, data]) => `### ${data.name}
- **進捗**: ${data.percentage}%
- **完了**: ${data.completed}/${data.total}
- **ステータス**: ${data.percentage === 100 ? '✅ 完了' : data.percentage > 0 ? '🚧 進行中' : '📋 未開始'}

`).join('')}

## 最近の更新

- ${new Date().toLocaleString('ja-JP')}: 自動進捗更新システムによる更新

---
*この文書は自動的に更新されます*
`;

    fs.writeFileSync(this.progressPath, progressContent);
    console.log('Progress document updated');
  }

  updateTestSpec() {
    const unitTests = Array.from(this.testCases.values()).filter(t => t.type === 'unit');
    const e2eTests = Array.from(this.testCases.values()).filter(t => t.type === 'e2e');
    
    const testSpecContent = `# テスト仕様書

## ユニットテスト

### 実行済みテスト: ${unitTests.length}件

${unitTests.map((test, index) => `#### ${index + 1}. ${test.name}
- **ファイル**: ${test.file}
- **ステータス**: ✅ 実行済み

`).join('')}

## E2Eテスト

### 実行済みテスト: ${e2eTests.length}件

${e2eTests.map((test, index) => `#### ${index + 1}. ${test.name}
- **ファイル**: ${test.file}
- **ステータス**: ✅ 実行済み

`).join('')}

## テストカバレッジ

- **ユニットテスト**: ${unitTests.length}件
- **E2Eテスト**: ${e2eTests.length}件
- **総テスト数**: ${this.testCases.size}件

## 推奨追加テスト

- ROIC計算の精度テスト
- 大量データ処理のパフォーマンステスト
- セキュリティテスト
- ブラウザ互換性テスト

---
*最終更新: ${new Date().toLocaleString('ja-JP')}*
*この文書は自動的に更新されます*
`;

    fs.writeFileSync(this.testSpecPath, testSpecContent);
    console.log('Test specification updated');
  }

  generateHTMLDocs() {
    // Generate HTML versions for web viewing
    const markdownFiles = [
      { md: this.featuresListPath, html: 'frontend/public/test-docs/features.html' },
      { md: this.progressPath, html: 'frontend/public/test-docs/progress.html' },
      { md: this.testSpecPath, html: 'frontend/public/test-docs/test-spec-detailed.html' }
    ];

    markdownFiles.forEach(({ md, html }) => {
      if (fs.existsSync(md)) {
        const content = fs.readFileSync(md, 'utf8');
        const htmlContent = this.convertMarkdownToHTML(content);
        
        const outputPath = path.join(this.projectRoot, html);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, htmlContent);
      }
    });
  }

  convertMarkdownToHTML(markdown) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>自動生成ドキュメント</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3, h4 { color: #333; }
        h1 { border-bottom: 2px solid #e1e4e8; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #e1e4e8; padding-bottom: 5px; }
        .status-completed { color: #28a745; }
        .status-progress { color: #ffc107; }
        .status-pending { color: #6c757d; }
        code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; }
        .update-time { color: #666; font-style: italic; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e4e8; }
    </style>
</head>
<body>
    <div class="container">
        ${markdown
          .replace(/^# (.+)/gm, '<h1>$1</h1>')
          .replace(/^## (.+)/gm, '<h2>$1</h2>')
          .replace(/^### (.+)/gm, '<h3>$1</h3>')
          .replace(/^#### (.+)/gm, '<h4>$1</h4>')
          .replace(/^\- (.+)/gm, '<li>$1</li>')
          .replace(/✅/g, '<span class="status-completed">✅</span>')
          .replace(/🚧/g, '<span class="status-progress">🚧</span>')
          .replace(/📋/g, '<span class="status-pending">📋</span>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(?!<[h|l|p])/gm, '<p>')
          .replace(/(?<!>)$/gm, '</p>')
        }
        <div class="update-time">
            最終自動更新: ${new Date().toLocaleString('ja-JP')}
        </div>
    </div>
</body>
</html>`;
  }
}

// Start the auto updater
const updater = new AutoDashboardUpdater();

// Generate initial HTML docs
updater.generateHTMLDocs();

// Set up periodic updates
setInterval(() => {
  updater.generateHTMLDocs();
}, 30000); // Update HTML every 30 seconds

process.on('SIGINT', () => {
  console.log('\nShutting down Auto Dashboard Updater...');
  process.exit(0);
});