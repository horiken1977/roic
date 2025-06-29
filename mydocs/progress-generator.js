#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

class ProgressGenerator {
    constructor() {
        this.mdFilePath = path.join(__dirname, 'project-progress.md');
        this.htmlFilePath = path.join(__dirname, 'progress-dashboard.html');
    }

    parseMarkdown(content) {
        const lines = content.split('\n');
        const tasks = [];
        let stats = { total: 0, completed: 0, inProgress: 0, pending: 0 };
        let nextActions = [];
        let environmentDetails = {};
        let currentSection = '';
        
        lines.forEach((line, index) => {
            // セクション検出
            if (line.includes('## 次のアクションアイテム')) {
                currentSection = 'nextActions';
            } else if (line.includes('## 環境構築詳細')) {
                currentSection = 'environment';
            } else if (line.includes('## 開発進捗状況')) {
                currentSection = 'tasks';
            }
            
            // チェックボックス付きタスクを検出
            const taskMatch = line.match(/^- \[([ x])\] \*\*(.*?)\*\*/);
            if (taskMatch && currentSection === 'tasks') {
                const isCompleted = taskMatch[1] === 'x';
                const taskName = taskMatch[2];
                
                // 優先度を推定
                let priority = 'medium';
                const previousLines = lines.slice(0, index);
                for (let i = previousLines.length - 1; i >= 0; i--) {
                    if (previousLines[i].includes('高優先度')) {
                        priority = 'high';
                        break;
                    } else if (previousLines[i].includes('中優先度')) {
                        priority = 'medium';
                        break;
                    } else if (previousLines[i].includes('低優先度')) {
                        priority = 'low';
                        break;
                    }
                }
                
                // タスクに関連するドキュメントへのリンクを検出
                let documentLink = null;
                if (isCompleted) {
                    if (taskName.includes('要件定義とアプリケーション仕様の策定')) {
                        documentLink = ['requirements-definition.html', 'roic-calculation-spec.html'];
                    } else if (taskName.includes('開発環境のセットアップとCI/CD構築')) {
                        documentLink = 'development-setup.html';
                    }
                }
                
                tasks.push({
                    name: taskName,
                    completed: isCompleted,
                    priority: priority,
                    description: this.extractDescription(lines, line, index),
                    documentLink: documentLink
                });
                
                stats.total++;
                if (isCompleted) {
                    stats.completed++;
                } else {
                    stats.pending++;
                }
            }
            
            // 次のアクションアイテムを抽出
            if (currentSection === 'nextActions') {
                if (line.match(/^\d+\. \*\*(.*?)\*\*/)) {
                    const actionMatch = line.match(/^\d+\. \*\*(.*?)\*\*/);
                    nextActions.push({
                        title: actionMatch[1],
                        details: this.extractActionDetails(lines, index)
                    });
                }
            }
            
            // 環境構築詳細を抽出
            if (currentSection === 'environment' && line.includes('### ')) {
                const sectionName = line.replace('### ', '').trim();
                if (!environmentDetails[sectionName]) {
                    environmentDetails[sectionName] = this.extractEnvironmentSection(lines, index);
                }
            }
        });
        
        stats.completionRate = Math.round((stats.completed / stats.total) * 100) || 0;
        
        return { tasks, stats, nextActions, environmentDetails };
    }

    extractDescription(lines, taskLine, taskIndex) {
        let description = [];
        
        // タスク行の次の行から説明を抽出
        for (let i = taskIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('- [')) {
                // 次のタスクに到達したら終了
                break;
            } else if (line.startsWith('#')) {
                // 次のセクションに到達したら終了
                break;
            } else if (line.startsWith('- ') && !line.startsWith('- [')) {
                // 説明項目を追加
                description.push(line);
            }
        }
        
        return description;
    }

    extractActionDetails(lines, startIndex) {
        let details = [];
        
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.match(/^\d+\. \*\*/) || line.startsWith('###') || line.startsWith('##')) {
                break;
            } else if (line.startsWith('-') || line.includes('```')) {
                details.push(line);
            }
        }
        
        return details;
    }

    extractEnvironmentSection(lines, startIndex) {
        let content = [];
        
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('###') || line.startsWith('##')) {
                break;
            } else if (line.trim()) {
                content.push(line);
            }
        }
        
        return content;
    }

    generateHTML(data) {
        const { tasks, stats, nextActions, environmentDetails } = data;
        
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROIC分析アプリケーション - 開発進捗ダッシュボード</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .subtitle {
            color: #666;
            font-size: 18px;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        @media (max-width: 1024px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 3px 20px rgba(0,0,0,0.08);
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 3px 20px rgba(0,0,0,0.08);
            margin-bottom: 30px;
        }
        
        .section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .section h3 {
            color: #495057;
            margin: 20px 0 15px;
        }
        
        .progress-bar-container {
            margin: 30px 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 25px;
            background-color: #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            border-radius: 12px;
            transition: width 0.8s ease;
            position: relative;
        }
        
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        
        .task-list {
            margin-top: 30px;
        }
        
        .task-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 10px;
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
        }
        
        .task-item:hover {
            background-color: #f8f9fa;
            transform: translateX(5px);
        }
        
        .task-item.completed {
            border-left-color: #28a745;
            background-color: #f8fff9;
        }
        
        .task-item.pending {
            border-left-color: #6c757d;
        }
        
        .task-checkbox {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            margin-right: 15px;
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        .task-checkbox.completed {
            background-color: #28a745;
        }
        
        .task-checkbox.pending {
            background-color: #6c757d;
        }
        
        .task-content {
            flex: 1;
        }
        
        .task-title {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .task-description {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }
        
        .task-description li {
            margin-left: 20px;
            margin-top: 5px;
        }
        
        .doc-link {
            text-decoration: none;
            font-size: 18px;
            transition: transform 0.2s ease;
            display: inline-block;
        }
        
        .doc-link:hover {
            transform: scale(1.2);
        }
        
        .priority-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
            flex-shrink: 0;
        }
        
        .priority-badge.high {
            background-color: #dc3545;
            color: white;
        }
        
        .priority-badge.medium {
            background-color: #fd7e14;
            color: white;
        }
        
        .priority-badge.low {
            background-color: #198754;
            color: white;
        }
        
        .action-item {
            background: #f8f9fa;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            border-left: 4px solid #007bff;
        }
        
        .action-item h4 {
            color: #007bff;
            margin-bottom: 10px;
            font-size: 18px;
        }
        
        .action-details {
            font-size: 14px;
            color: #495057;
            margin-left: 20px;
        }
        
        .action-details pre {
            background: #e9ecef;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 10px 0;
        }
        
        .env-section {
            margin-bottom: 25px;
        }
        
        .env-section h4 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .env-content {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
        }
        
        .env-content pre {
            background: #e9ecef;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 10px 0;
        }
        
        .last-updated {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        
        .quick-links {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        
        .quick-link {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s ease;
        }
        
        .quick-link:hover {
            background: #0056b3;
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .task-item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .priority-badge {
                margin-left: 0;
                margin-top: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>ROIC分析アプリケーション</h1>
            <p class="subtitle">開発進捗ダッシュボード</p>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">総タスク数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.completed}</div>
                <div class="stat-label">完了タスク</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.pending}</div>
                <div class="stat-label">未完了タスク</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.completionRate}%</div>
                <div class="stat-label">完了率</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📋 次のアクションアイテム</h2>
            ${nextActions.map(action => `
                <div class="action-item">
                    <h4>${action.title}</h4>
                    <div class="action-details">
                        ${action.details.map(detail => {
                            if (detail.includes('```')) {
                                return `<pre>${detail.replace(/```.*/, '').replace('```', '')}</pre>`;
                            }
                            return `<div>${detail}</div>`;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
            
            <div class="quick-links">
                <a href="development-setup.html" class="quick-link">開発環境セットアップガイド</a>
                <a href="https://github.com/horiken1977/roic" class="quick-link" target="_blank">GitHubリポジトリ</a>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <div class="section">
                <h2>🚀 開発進捗状況</h2>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${stats.completionRate}%">
                            <span class="progress-text">${stats.completionRate}%</span>
                        </div>
                    </div>
                </div>
                
                <h3>タスク一覧</h3>
                <div class="task-list">
                    ${tasks.map(task => `
                        <div class="task-item ${task.completed ? 'completed' : 'pending'}">
                            <div class="task-checkbox ${task.completed ? 'completed' : 'pending'}">
                                ${task.completed ? '✓' : '○'}
                            </div>
                            <div class="task-content">
                                <div class="task-title">
                                    ${task.name}
                                    ${task.documentLink ? 
                                        (Array.isArray(task.documentLink) ? 
                                            task.documentLink.map(link => {
                                                const title = link.includes('requirements') ? '要件定義書' : 
                                                            link.includes('roic-calculation') ? 'ROIC計算仕様書' : 
                                                            '開発環境ガイド';
                                                return `<a href="${link}" class="doc-link" title="${title}を表示">📄</a>`;
                                            }).join(' ')
                                            : `<a href="${task.documentLink}" class="doc-link" title="ドキュメントを表示">📄</a>`)
                                        : ''}
                                </div>
                                <div class="task-description">
                                    ${task.description.length > 0 ? 
                                        '<ul>' + task.description.map(desc => `<li>${desc}</li>`).join('') + '</ul>' 
                                        : ''}
                                </div>
                            </div>
                            <span class="priority-badge ${task.priority}">${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="section">
                <h2>🛠️ 環境構築詳細</h2>
                ${Object.entries(environmentDetails).map(([section, content]) => `
                    <div class="env-section">
                        <h4>${section}</h4>
                        <div class="env-content">
                            ${content.map(line => {
                                if (line.includes('```')) {
                                    return `<pre>${line.replace(/```.*/, '').replace('```', '')}</pre>`;
                                } else if (line.startsWith('####')) {
                                    return `<h5>${line.replace('####', '')}</h5>`;
                                } else if (line.startsWith('-')) {
                                    return `<li>${line.replace('-', '')}</li>`;
                                }
                                return `<p>${line}</p>`;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="last-updated">
            最終更新: ${new Date().toLocaleString('ja-JP')}
        </div>
    </div>
    
    <script>
        // ページ読み込み時のアニメーション
        document.addEventListener('DOMContentLoaded', function() {
            const progressFill = document.querySelector('.progress-fill');
            const statNumbers = document.querySelectorAll('.stat-number');
            
            // 数値のカウントアップアニメーション
            statNumbers.forEach(el => {
                const target = parseInt(el.textContent);
                let current = 0;
                const increment = target / 30;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = Math.floor(current) + (el.textContent.includes('%') ? '%' : '');
                }, 50);
            });
            
            // プログレスバーのアニメーション
            setTimeout(() => {
                progressFill.style.width = '${stats.completionRate}%';
            }, 500);
        });
        
        // 自動リロード（5秒間隔）
        setInterval(() => {
            window.location.reload();
        }, 5000);
    </script>
</body>
</html>`;
    }

    generateDashboard() {
        try {
            // マークダウンファイルを読み込み
            const markdownContent = fs.readFileSync(this.mdFilePath, 'utf-8');
            
            // マークダウンを解析
            const data = this.parseMarkdown(markdownContent);
            
            // HTMLを生成
            const html = this.generateHTML(data);
            
            // HTMLファイルに書き込み
            fs.writeFileSync(this.htmlFilePath, html);
            
            console.log(`Progress dashboard updated: ${this.htmlFilePath}`);
        } catch (error) {
            console.error('Error generating dashboard:', error);
        }
    }

    watchFile() {
        console.log(`Watching for changes in: ${this.mdFilePath}`);
        
        // 初回生成
        this.generateDashboard();
        
        // ファイル監視
        fs.watchFile(this.mdFilePath, (curr, prev) => {
            console.log('Markdown file changed, regenerating dashboard...');
            this.generateDashboard();
        });
    }
}

// メイン実行
if (require.main === module) {
    const generator = new ProgressGenerator();
    
    // コマンドライン引数をチェック
    const args = process.argv.slice(2);
    
    if (args.includes('--watch')) {
        generator.watchFile();
        console.log('Press Ctrl+C to stop watching...');
    } else {
        generator.generateDashboard();
    }
}

module.exports = ProgressGenerator;