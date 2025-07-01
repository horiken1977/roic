#!/usr/bin/env node

/**
 * テスト文書HTML生成・更新システム
 * Test Documentation HTML Generator and Auto-Updater
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

class TestDocsGenerator {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'frontend/public/test-docs')
    this.templateDir = path.join(process.cwd(), 'scripts/templates')
    this.testResults = {
      unit: { passed: 0, failed: 0, total: 0, coverage: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      performance: { passed: 0, failed: 0, total: 0 },
      security: { passed: 0, failed: 0, total: 0 }
    }
    this.lastUpdate = new Date()
    
    this.ensureDirectories()
  }

  /**
   * 必要なディレクトリを作成
   */
  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true })
    }
  }

  /**
   * テスト計画書のHTML生成
   */
  async generateTestPlanHTML() {
    console.log('📋 Generating Test Plan HTML...')
    
    const testPlanData = await this.loadTestPlanData()
    const template = this.getTestPlanTemplate()
    
    const html = this.renderTemplate(template, {
      ...testPlanData,
      lastUpdate: this.lastUpdate.toLocaleString('ja-JP'),
      testResults: this.testResults,
      progressPercentage: this.calculateOverallProgress()
    })

    const outputPath = path.join(this.outputDir, 'test-plan.html')
    fs.writeFileSync(outputPath, html)
    
    console.log(`✅ Test Plan HTML generated: ${outputPath}`)
    return outputPath
  }

  /**
   * テスト仕様書のHTML生成
   */
  async generateTestSpecHTML() {
    console.log('📋 Generating Test Specification HTML...')
    
    const testSpecData = await this.loadTestSpecData()
    const template = this.getTestSpecTemplate()
    
    const html = this.renderTemplate(template, {
      ...testSpecData,
      lastUpdate: this.lastUpdate.toLocaleString('ja-JP'),
      testResults: this.testResults,
      detailedProgress: this.calculateDetailedProgress()
    })

    const outputPath = path.join(this.outputDir, 'test-spec.html')
    fs.writeFileSync(outputPath, html)
    
    console.log(`✅ Test Specification HTML generated: ${outputPath}`)
    return outputPath
  }

  /**
   * テスト計画データの読み込み
   */
  async loadTestPlanData() {
    const testPlanPath = path.join(process.cwd(), 'docs/test-plan.md')
    
    if (!fs.existsSync(testPlanPath)) {
      throw new Error(`Test plan file not found: ${testPlanPath}`)
    }

    const content = fs.readFileSync(testPlanPath, 'utf8')
    
    return {
      title: 'ROIC分析アプリケーション テスト計画書',
      content: this.convertMarkdownToHTML(content),
      phases: [
        {
          name: 'Unit Testing',
          description: '個別モジュールのテスト',
          status: this.getPhaseStatus('unit'),
          progress: this.calculateProgress('unit')
        },
        {
          name: 'Integration Testing', 
          description: 'システム統合テスト',
          status: this.getPhaseStatus('integration'),
          progress: this.calculateProgress('integration')
        },
        {
          name: 'E2E Testing',
          description: 'エンドツーエンドテスト',
          status: this.getPhaseStatus('e2e'),
          progress: this.calculateProgress('e2e')
        },
        {
          name: 'Performance Testing',
          description: 'パフォーマンステスト',
          status: this.getPhaseStatus('performance'),
          progress: this.calculateProgress('performance')
        },
        {
          name: 'Security Testing',
          description: 'セキュリティテスト',
          status: this.getPhaseStatus('security'),
          progress: this.calculateProgress('security')
        }
      ]
    }
  }

  /**
   * テスト仕様データの読み込み
   */
  async loadTestSpecData() {
    const testSpecPath = path.join(process.cwd(), 'docs/test-specification.md')
    
    if (!fs.existsSync(testSpecPath)) {
      throw new Error(`Test specification file not found: ${testSpecPath}`)
    }

    const content = fs.readFileSync(testSpecPath, 'utf8')
    
    return {
      title: 'ROIC分析アプリケーション テスト仕様書',
      content: this.convertMarkdownToHTML(content),
      testSuites: await this.getTestSuiteDetails()
    }
  }

  /**
   * テストスイート詳細の取得
   */
  async getTestSuiteDetails() {
    const suites = []
    
    // Unit Tests
    try {
      const unitTestFiles = await this.findTestFiles('frontend/**/*.test.{ts,tsx,js,jsx}')
      suites.push({
        name: 'Unit Tests',
        type: 'unit',
        files: unitTestFiles.length,
        tests: this.testResults.unit.total,
        passed: this.testResults.unit.passed,
        failed: this.testResults.unit.failed,
        coverage: this.testResults.unit.coverage
      })
    } catch (error) {
      console.warn('Unit test details not available:', error.message)
    }

    // E2E Tests
    try {
      const e2eTestFiles = await this.findTestFiles('frontend/e2e/**/*.spec.{ts,js}')
      suites.push({
        name: 'E2E Tests',
        type: 'e2e',
        files: e2eTestFiles.length,
        tests: this.testResults.e2e.total,
        passed: this.testResults.e2e.passed,
        failed: this.testResults.e2e.failed
      })
    } catch (error) {
      console.warn('E2E test details not available:', error.message)
    }

    return suites
  }

  /**
   * テストファイルの検索
   */
  async findTestFiles(pattern) {
    try {
      const { stdout } = await execAsync(`find . -path "./${pattern}" -type f`)
      return stdout.trim().split('\n').filter(file => file.trim())
    } catch (error) {
      return []
    }
  }

  /**
   * テスト計画HTMLテンプレート
   */
  getTestPlanTemplate() {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        ${this.getCommonCSS()}
        .phase-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid var(--accent-color);
        }
        .phase-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .phase-name {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
        }
        .phase-status {
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-completed { background: #c6f6d5; color: #22543d; }
        .status-in-progress { background: #fef5e7; color: #c05621; }
        .status-pending { background: #e2e8f0; color: #4a5568; }
        .status-failed { background: #fed7d7; color: #c53030; }
        .progress-container {
            background: #e2e8f0;
            border-radius: 4px;
            height: 8px;
            margin-top: 8px;
            overflow: hidden;
        }
        .progress-bar {
            background: linear-gradient(90deg, #4299e1, #3182ce);
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .overall-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: var(--primary-color);
        }
        .stat-label {
            color: #718096;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>{{title}}</h1>
            <div class="last-update">最終更新: {{lastUpdate}}</div>
        </header>

        <div class="overall-stats">
            <div class="stat-card">
                <div class="stat-number">{{progressPercentage}}%</div>
                <div class="stat-label">全体進捗</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{testResults.unit.total}}</div>
                <div class="stat-label">総テスト数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{testResults.unit.coverage}}%</div>
                <div class="stat-label">コードカバレッジ</div>
            </div>
        </div>

        <div class="section">
            <h2>テストフェーズ進捗</h2>
            {{#each phases}}
            <div class="phase-card">
                <div class="phase-header">
                    <div class="phase-name">{{name}}</div>
                    <div class="phase-status status-{{status}}">{{status}}</div>
                </div>
                <div class="phase-description">{{description}}</div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: {{progress}}%"></div>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #718096;">
                    進捗: {{progress}}%
                </div>
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>テスト計画詳細</h2>
            <div class="content">
                {{{content}}}
            </div>
        </div>

        <footer class="footer">
            <p>このドキュメントは自動生成されています。最新の情報は定期的に更新されます。</p>
        </footer>
    </div>

    <script>
        // 自動更新機能
        setInterval(() => {
            location.reload();
        }, 30000); // 30秒ごと

        // プログレスバーアニメーション
        document.addEventListener('DOMContentLoaded', () => {
            const progressBars = document.querySelectorAll('.progress-bar');
            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
        });
    </script>
</body>
</html>
    `
  }

  /**
   * テスト仕様HTMLテンプレート
   */
  getTestSpecTemplate() {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        ${this.getCommonCSS()}
        .test-suite {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .suite-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .suite-name {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
        }
        .suite-stats {
            display: flex;
            gap: 16px;
            font-size: 14px;
        }
        .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .stat-passed { color: #22543d; }
        .stat-failed { color: #c53030; }
        .stat-total { color: #4a5568; }
        .coverage-badge {
            background: linear-gradient(90deg, #48bb78, #38a169);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        .test-item {
            background: #f7fafc;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid #e2e8f0;
        }
        .test-item.passed {
            border-left-color: #48bb78;
            background: #f0fff4;
        }
        .test-item.failed {
            border-left-color: #f56565;
            background: #fffafa;
        }
        .real-time-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4299e1;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .pulse {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="real-time-indicator pulse">
        🔄 リアルタイム更新中
    </div>

    <div class="container">
        <header class="header">
            <h1>{{title}}</h1>
            <div class="last-update">最終更新: {{lastUpdate}}</div>
        </header>

        <div class="section">
            <h2>テストスイート実行状況</h2>
            {{#each testSuites}}
            <div class="test-suite">
                <div class="suite-header">
                    <div class="suite-name">{{name}} ({{files}} files)</div>
                    <div class="suite-stats">
                        <div class="stat-item stat-passed">
                            ✅ {{passed}}
                        </div>
                        <div class="stat-item stat-failed">
                            ❌ {{failed}}
                        </div>
                        <div class="stat-item stat-total">
                            📊 {{tests}} total
                        </div>
                        {{#if coverage}}
                        <div class="coverage-badge">{{coverage}}% カバレッジ</div>
                        {{/if}}
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar" style="width: {{#if tests}}{{#divide passed tests}}{{/divide}}{{else}}0{{/if}}%"></div>
                </div>
                
                <div style="margin-top: 8px; font-size: 12px; color: #718096;">
                    成功率: {{#if tests}}{{#percentage passed tests}}{{/percentage}}{{else}}0{{/if}}%
                </div>
            </div>
            {{/each}}
        </div>

        <div class="section">
            <h2>詳細進捗状況</h2>
            <div class="test-grid">
                {{#each detailedProgress}}
                <div class="test-item {{status}}">
                    <strong>{{category}}</strong>
                    <div>{{description}}</div>
                    <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                        {{completed}}/{{total}} 完了 ({{percentage}}%)
                    </div>
                </div>
                {{/each}}
            </div>
        </div>

        <div class="section">
            <h2>テスト仕様詳細</h2>
            <div class="content">
                {{{content}}}
            </div>
        </div>

        <footer class="footer">
            <p>このドキュメントは自動生成・更新されています。テスト実行と連動してリアルタイムで更新されます。</p>
        </footer>
    </div>

    <script>
        // リアルタイム更新
        setInterval(() => {
            fetch(window.location.href)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const newDoc = parser.parseFromString(html, 'text/html');
                    
                    // 統計情報のみ更新
                    const newStats = newDoc.querySelectorAll('.suite-stats, .progress-bar');
                    const currentStats = document.querySelectorAll('.suite-stats, .progress-bar');
                    
                    newStats.forEach((newStat, index) => {
                        if (currentStats[index]) {
                            currentStats[index].innerHTML = newStat.innerHTML;
                        }
                    });
                })
                .catch(err => console.log('Update failed:', err));
        }, 10000); // 10秒ごと

        // バックグラウンドテスト結果の監視
        if ('WebSocket' in window) {
            const ws = new WebSocket('ws://localhost:3001/test-updates');
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'test-results') {
                    location.reload();
                }
            };
        }
    </script>
</body>
</html>
    `
  }

  /**
   * 共通CSS
   */
  getCommonCSS() {
    return `
        :root {
            --primary-color: #3182ce;
            --accent-color: #4299e1;
            --success-color: #48bb78;
            --warning-color: #ed8936;
            --error-color: #f56565;
            --bg-color: #f7fafc;
            --text-color: #2d3748;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            background: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px 0;
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .header h1 {
            font-size: 32px;
            margin-bottom: 8px;
            font-weight: 700;
        }
        
        .last-update {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .section {
            margin: 32px 0;
        }
        
        .section h2 {
            font-size: 24px;
            margin-bottom: 16px;
            color: var(--primary-color);
            border-bottom: 2px solid var(--accent-color);
            padding-bottom: 8px;
        }
        
        .content {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            line-height: 1.7;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            color: #718096;
            font-size: 14px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            .header h1 {
                font-size: 24px;
            }
            .suite-header {
                flex-direction: column;
                align-items: flex-start;
            }
            .suite-stats {
                margin-top: 8px;
            }
        }
    `
  }

  /**
   * テンプレートレンダリング
   */
  renderTemplate(template, data) {
    let html = template

    // シンプルなテンプレート置換
    html = html.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path)
      return value !== undefined ? value : match
    })

    // トリプルブレース（HTMLエスケープなし）
    html = html.replace(/\{\{\{(\w+(?:\.\w+)*)\}\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path)
      return value !== undefined ? value : match
    })

    // 繰り返し処理
    html = html.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, itemTemplate) => {
      const array = this.getNestedValue(data, arrayPath)
      if (!Array.isArray(array)) return ''
      
      return array.map(item => {
        return this.renderTemplate(itemTemplate, item)
      }).join('')
    })

    return html
  }

  /**
   * ネストされた値の取得
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  /**
   * Markdownの簡易HTML変換
   */
  convertMarkdownToHTML(markdown) {
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.)/gm, '<p>$1')
      .replace(/(.*)$/gm, '$1</p>')
  }

  /**
   * フェーズステータスの取得
   */
  getPhaseStatus(phase) {
    const result = this.testResults[phase]
    if (!result || result.total === 0) return 'pending'
    if (result.failed > 0) return 'failed'
    if (result.passed === result.total) return 'completed'
    return 'in-progress'
  }

  /**
   * 進捗の計算
   */
  calculateProgress(phase) {
    const result = this.testResults[phase]
    if (!result || result.total === 0) return 0
    return Math.round((result.passed / result.total) * 100)
  }

  /**
   * 全体進捗の計算
   */
  calculateOverallProgress() {
    const phases = ['unit', 'e2e', 'integration', 'performance', 'security']
    const totalProgress = phases.reduce((sum, phase) => {
      return sum + this.calculateProgress(phase)
    }, 0)
    return Math.round(totalProgress / phases.length)
  }

  /**
   * 詳細進捗の計算
   */
  calculateDetailedProgress() {
    return [
      {
        category: 'コンポーネントテスト',
        description: 'React コンポーネントのユニットテスト',
        completed: this.testResults.unit.passed,
        total: this.testResults.unit.total,
        percentage: this.calculateProgress('unit'),
        status: this.testResults.unit.failed > 0 ? 'failed' : 'passed'
      },
      {
        category: 'E2Eシナリオテスト',
        description: 'ユーザージャーニーの検証',
        completed: this.testResults.e2e.passed,
        total: this.testResults.e2e.total,
        percentage: this.calculateProgress('e2e'),
        status: this.testResults.e2e.failed > 0 ? 'failed' : 'passed'
      },
      {
        category: 'パフォーマンステスト',
        description: '応答時間とスループットの検証',
        completed: this.testResults.performance.passed,
        total: this.testResults.performance.total,
        percentage: this.calculateProgress('performance'),
        status: this.testResults.performance.failed > 0 ? 'failed' : 'passed'
      },
      {
        category: 'セキュリティテスト',
        description: '脆弱性とセキュリティホールの検証',
        completed: this.testResults.security.passed,
        total: this.testResults.security.total,
        percentage: this.calculateProgress('security'),
        status: this.testResults.security.failed > 0 ? 'failed' : 'passed'
      }
    ]
  }

  /**
   * テスト結果の更新
   */
  async updateTestResults() {
    console.log('📊 Updating test results...')
    
    try {
      // Jest テスト結果の読み込み
      await this.updateUnitTestResults()
      
      // Playwright テスト結果の読み込み
      await this.updateE2ETestResults()
      
      // パフォーマンステスト結果の読み込み
      await this.updatePerformanceTestResults()
      
      // セキュリティテスト結果の読み込み
      await this.updateSecurityTestResults()
      
      this.lastUpdate = new Date()
      
    } catch (error) {
      console.warn('Failed to update test results:', error.message)
    }
  }

  /**
   * ユニットテスト結果の更新
   */
  async updateUnitTestResults() {
    try {
      const { stdout } = await execAsync('cd frontend && npm test -- --coverage --watchAll=false --passWithNoTests 2>/dev/null || echo "No tests"')
      
      // Jest 出力から結果を抽出
      const passedMatch = stdout.match(/(\d+) passing/)
      const failedMatch = stdout.match(/(\d+) failing/)
      const coverageMatch = stdout.match(/All files\s*\|\s*([\d.]+)/)
      
      this.testResults.unit = {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        total: (passedMatch ? parseInt(passedMatch[1]) : 0) + (failedMatch ? parseInt(failedMatch[1]) : 0),
        coverage: coverageMatch ? parseFloat(coverageMatch[1]) : 0
      }
      
    } catch (error) {
      console.warn('Unit test results not available')
    }
  }

  /**
   * E2Eテスト結果の更新
   */
  async updateE2ETestResults() {
    try {
      const { stdout } = await execAsync('cd frontend && npx playwright test --reporter=json 2>/dev/null || echo "No E2E tests"')
      
      // Playwright 出力から結果を抽出（簡易版）
      const lines = stdout.split('\n')
      let passed = 0, failed = 0
      
      lines.forEach(line => {
        if (line.includes('✓') || line.includes('passed')) passed++
        if (line.includes('✗') || line.includes('failed')) failed++
      })
      
      this.testResults.e2e = {
        passed,
        failed,
        total: passed + failed
      }
      
    } catch (error) {
      console.warn('E2E test results not available')
    }
  }

  /**
   * パフォーマンステスト結果の更新
   */
  async updatePerformanceTestResults() {
    // モックデータ（実際の実装では lighthouse CLI などを使用）
    this.testResults.performance = {
      passed: 8,
      failed: 2,
      total: 10
    }
  }

  /**
   * セキュリティテスト結果の更新
   */
  async updateSecurityTestResults() {
    // モックデータ（実際の実装では npm audit や OWASP ZAP などを使用）
    this.testResults.security = {
      passed: 15,
      failed: 1,
      total: 16
    }
  }

  /**
   * 自動更新の開始
   */
  startAutoUpdate() {
    console.log('🔄 Starting auto-update system...')
    
    // 初回生成
    this.generateAllDocs()
    
    // 定期更新（5分ごと）
    setInterval(async () => {
      await this.updateTestResults()
      await this.generateAllDocs()
    }, 5 * 60 * 1000)
    
    // ファイル監視による即座の更新
    this.watchTestFiles()
  }

  /**
   * テストファイル監視
   */
  watchTestFiles() {
    const chokidar = require('chokidar')
    
    const watcher = chokidar.watch([
      'frontend/**/*.test.{ts,tsx,js,jsx}',
      'frontend/e2e/**/*.spec.{ts,js}',
      'docs/*.md'
    ], { ignoreInitial: true })
    
    watcher.on('change', async (filePath) => {
      console.log(`📝 Test file changed: ${filePath}`)
      await this.updateTestResults()
      await this.generateAllDocs()
    })
  }

  /**
   * 全ドキュメント生成
   */
  async generateAllDocs() {
    try {
      await this.generateTestPlanHTML()
      await this.generateTestSpecHTML()
      console.log('✅ All test documentation updated')
    } catch (error) {
      console.error('❌ Failed to generate documentation:', error.message)
    }
  }
}

// CLI実行
if (require.main === module) {
  const generator = new TestDocsGenerator()
  
  if (process.argv.includes('--watch')) {
    generator.startAutoUpdate()
    console.log('👀 Auto-update mode started. Press Ctrl+C to stop.')
  } else {
    generator.generateAllDocs()
  }
}

module.exports = TestDocsGenerator