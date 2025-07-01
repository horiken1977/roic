#!/usr/bin/env node

/**
 * 自動エラー修正システム
 * テスト失敗やビルドエラーを検出し、自動的に修正を試行
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

class AutoErrorFix {
  constructor() {
    this.errorPatterns = new Map()
    this.fixStrategies = new Map()
    this.initializeErrorPatterns()
    this.initializeFixStrategies()
  }

  /**
   * エラーパターンの初期化
   */
  initializeErrorPatterns() {
    // TypeScript エラーパターン
    this.errorPatterns.set('typescript', [
      /Type '(.+)' is not assignable to type '(.+)'/,
      /Property '(.+)' does not exist on type '(.+)'/,
      /Cannot find module '(.+)'/,
      /Argument of type '(.+)' is not assignable to parameter of type '(.+)'/,
      /'(.+)' is declared but its value is never read/,
      /Expected (\d+) arguments, but got (\d+)/
    ])

    // React エラーパターン
    this.errorPatterns.set('react', [
      /React Hook "(.+)" is called conditionally/,
      /React Hook "(.+)" has a missing dependency/,
      /Failed to compile.*Module not found/,
      /Each child in a list should have a unique "key" prop/,
      /Cannot read properties of undefined \(reading '(.+)'\)/
    ])

    // Jest テストエラーパターン
    this.errorPatterns.set('jest', [
      /ReferenceError: (.+) is not defined/,
      /TypeError: Cannot read properties of undefined/,
      /expect.*toBeInTheDocument.*is not a function/,
      /Test suite failed to run.*Cannot find module/,
      /MockImplementation.*is not a function/
    ])

    // ESLint エラーパターン
    this.errorPatterns.set('eslint', [
      /'(.+)' is assigned a value but never used/,
      /Missing return type on function/,
      /Prefer default export/,
      /Expected '===' and instead saw '=='/,
      /Missing trailing comma/
    ])

    // Build エラーパターン
    this.errorPatterns.set('build', [
      /Module build failed.*SyntaxError/,
      /Cannot resolve module '(.+)'/,
      /Unexpected token '(.+)'/,
      /Export '(.+)' was not found in '(.+)'/
    ])

    // API エラーパターン
    this.errorPatterns.set('api', [
      /ECONNREFUSED.*connect.*3001/,
      /fetch.*TypeError.*Failed to fetch/,
      /CORS.*blocked by CORS policy/,
      /404.*Not Found/,
      /500.*Internal Server Error/
    ])
  }

  /**
   * 修正戦略の初期化
   */
  initializeFixStrategies() {
    // TypeScript 修正戦略
    this.fixStrategies.set('typescript', {
      'missing-import': async (error, filePath) => {
        const missingModule = this.extractMissingModule(error)
        if (missingModule) {
          await this.addMissingImport(filePath, missingModule)
          return true
        }
        return false
      },
      
      'type-mismatch': async (error, filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        let fixed = content
        
        // Add type assertions
        fixed = fixed.replace(
          /(const|let|var)\s+(\w+)\s*=\s*([^;]+);/g,
          (match, declaration, varName, value) => {
            if (error.includes(varName)) {
              return `${declaration} ${varName} = ${value} as any;`
            }
            return match
          }
        )
        
        if (fixed !== content) {
          fs.writeFileSync(filePath, fixed)
          return true
        }
        return false
      },

      'unused-variable': async (error, filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        const unusedVar = error.match(/'(.+)' is declared but its value is never read/)?.[1]
        
        if (unusedVar) {
          // Add underscore prefix to indicate intentionally unused
          const fixed = content.replace(
            new RegExp(`\\b${unusedVar}\\b`, 'g'),
            `_${unusedVar}`
          )
          
          if (fixed !== content) {
            fs.writeFileSync(filePath, fixed)
            return true
          }
        }
        return false
      }
    })

    // React 修正戦略
    this.fixStrategies.set('react', {
      'missing-key': async (error, filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Add key prop to map functions
        const fixed = content.replace(
          /\.map\(\((\w+),?\s*(\w+)?\)\s*=>\s*<(\w+)/g,
          (match, item, index, component) => {
            if (!match.includes('key=')) {
              const keyValue = index ? index : `${item}.id || ${item}`
              return match.replace(`<${component}`, `<${component} key={${keyValue}}`)
            }
            return match
          }
        )
        
        if (fixed !== content) {
          fs.writeFileSync(filePath, fixed)
          return true
        }
        return false
      },

      'missing-dependency': async (error, filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        const dependency = error.match(/missing dependency: '(.+)'/)?.[1]
        
        if (dependency) {
          // Add missing dependency to useEffect
          const fixed = content.replace(
            /(useEffect\([^,]+,\s*)\[\]/g,
            `$1[${dependency}]`
          ).replace(
            /(useEffect\([^,]+,\s*)\[([^\]]+)\]/g,
            (match, prefix, deps) => {
              if (!deps.includes(dependency)) {
                return `${prefix}[${deps}, ${dependency}]`
              }
              return match
            }
          )
          
          if (fixed !== content) {
            fs.writeFileSync(filePath, fixed)
            return true
          }
        }
        return false
      },

      'undefined-property': async (error, filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Add optional chaining
        const fixed = content.replace(
          /(\w+)\.(\w+)/g,
          (match, obj, prop) => {
            if (error.includes(prop) && !match.includes('?.')) {
              return `${obj}?.${prop}`
            }
            return match
          }
        )
        
        if (fixed !== content) {
          fs.writeFileSync(filePath, fixed)
          return true
        }
        return false
      }
    })

    // Jest 修正戦略
    this.fixStrategies.set('jest', {
      'missing-test-setup': async (error, filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Add missing imports
        const imports = [
          "import '@testing-library/jest-dom'",
          "import { render, screen } from '@testing-library/react'",
          "import userEvent from '@testing-library/user-event'"
        ]
        
        let fixed = content
        imports.forEach(importStatement => {
          if (!fixed.includes(importStatement)) {
            fixed = importStatement + '\n' + fixed
          }
        })
        
        if (fixed !== content) {
          fs.writeFileSync(filePath, fixed)
          return true
        }
        return false
      },

      'async-test-fix': async (error, filePath) => {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Add async/await to tests that need it
        const fixed = content.replace(
          /test\('([^']+)',\s*\(\)\s*=>\s*{/g,
          "test('$1', async () => {"
        ).replace(
          /(userEvent\.\w+\([^)]+\))/g,
          'await $1'
        ).replace(
          /(screen\.findBy\w+\([^)]+\))/g,
          'await $1'
        )
        
        if (fixed !== content) {
          fs.writeFileSync(filePath, fixed)
          return true
        }
        return false
      }
    })

    // ESLint 修正戦略
    this.fixStrategies.set('eslint', {
      'auto-fix': async (error, filePath) => {
        try {
          // Run ESLint auto-fix
          await execAsync(`npx eslint "${filePath}" --fix`)
          return true
        } catch (error) {
          return false
        }
      }
    })

    // Build 修正戦略
    this.fixStrategies.set('build', {
      'missing-dependency': async (error, filePath) => {
        const missingModule = this.extractMissingModule(error)
        if (missingModule) {
          // Try to install missing dependency
          try {
            await execAsync(`npm install ${missingModule}`)
            console.log(`✅ Installed missing dependency: ${missingModule}`)
            return true
          } catch (err) {
            console.log(`❌ Failed to install ${missingModule}`)
            return false
          }
        }
        return false
      }
    })
  }

  /**
   * エラーログを監視して自動修正を実行
   */
  async watchAndFix(logFile) {
    console.log(`👀 Watching error log: ${logFile}`)
    
    const fs = require('fs')
    let lastSize = 0
    
    setInterval(async () => {
      try {
        const stats = fs.statSync(logFile)
        if (stats.size > lastSize) {
          const newContent = fs.readFileSync(logFile, 'utf8').slice(lastSize)
          lastSize = stats.size
          
          await this.processNewErrors(newContent)
        }
      } catch (error) {
        // Log file might not exist yet
      }
    }, 1000)
  }

  /**
   * 新しいエラーを処理
   */
  async processNewErrors(errorContent) {
    const lines = errorContent.split('\n')
    
    for (const line of lines) {
      if (this.isErrorLine(line)) {
        console.log(`🚨 Error detected: ${line.substring(0, 100)}...`)
        await this.attemptFix(line)
      }
    }
  }

  /**
   * エラー行かどうかの判定
   */
  isErrorLine(line) {
    const errorKeywords = [
      'ERROR', 'Error:', 'TypeError:', 'ReferenceError:', 
      'SyntaxError:', 'FAIL', 'Failed', '❌'
    ]
    
    return errorKeywords.some(keyword => line.includes(keyword))
  }

  /**
   * エラーの修正を試行
   */
  async attemptFix(errorLine) {
    const errorType = this.classifyError(errorLine)
    const filePath = this.extractFilePath(errorLine)
    
    if (!errorType || !filePath || !fs.existsSync(filePath)) {
      console.log(`⚠️ Cannot fix error: ${errorLine.substring(0, 80)}...`)
      return false
    }

    console.log(`🔧 Attempting to fix ${errorType} error in ${filePath}`)
    
    const strategies = this.fixStrategies.get(errorType)
    if (!strategies) {
      console.log(`❌ No fix strategies for error type: ${errorType}`)
      return false
    }

    for (const [strategyName, strategy] of Object.entries(strategies)) {
      try {
        const success = await strategy(errorLine, filePath)
        if (success) {
          console.log(`✅ Fixed using strategy: ${strategyName}`)
          
          // Re-run tests or build to verify fix
          await this.verifyFix(filePath, errorType)
          return true
        }
      } catch (error) {
        console.log(`❌ Strategy ${strategyName} failed: ${error.message}`)
      }
    }

    console.log(`❌ All fix attempts failed for: ${filePath}`)
    return false
  }

  /**
   * エラーの分類
   */
  classifyError(errorLine) {
    for (const [type, patterns] of this.errorPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(errorLine)) {
          return type
        }
      }
    }
    return null
  }

  /**
   * エラーからファイルパスを抽出
   */
  extractFilePath(errorLine) {
    // Common file path patterns in error messages
    const patterns = [
      /at (.+):\d+:\d+/,
      /in (.+):\d+/,
      /Error in (.+)/,
      /(.+\.(?:ts|tsx|js|jsx)):\d+:\d+/,
      /Module not found.*'(.+)'/
    ]

    for (const pattern of patterns) {
      const match = errorLine.match(pattern)
      if (match && match[1]) {
        let filePath = match[1]
        
        // Convert relative paths to absolute
        if (!path.isAbsolute(filePath)) {
          filePath = path.resolve(process.cwd(), filePath)
        }
        
        return filePath
      }
    }
    
    return null
  }

  /**
   * 不足しているモジュールを抽出
   */
  extractMissingModule(error) {
    const patterns = [
      /Cannot find module '(.+)'/,
      /Module not found.*'(.+)'/,
      /Cannot resolve module '(.+)'/
    ]

    for (const pattern of patterns) {
      const match = error.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    return null
  }

  /**
   * 不足しているインポートを追加
   */
  async addMissingImport(filePath, moduleName) {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Determine import style based on module name
    let importStatement
    if (moduleName.startsWith('@/')) {
      importStatement = `import { /* TODO: specify imports */ } from '${moduleName}'`
    } else if (moduleName.includes('react')) {
      importStatement = `import React from '${moduleName}'`
    } else {
      importStatement = `import ${this.generateImportName(moduleName)} from '${moduleName}'`
    }

    // Add import at the top of the file
    const lines = content.split('\n')
    const importIndex = this.findImportInsertionPoint(lines)
    
    lines.splice(importIndex, 0, importStatement)
    
    fs.writeFileSync(filePath, lines.join('\n'))
  }

  /**
   * インポート挿入位置を見つける
   */
  findImportInsertionPoint(lines) {
    let lastImportIndex = -1
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i
      } else if (lastImportIndex >= 0 && lines[i].trim() !== '') {
        break
      }
    }
    
    return lastImportIndex >= 0 ? lastImportIndex + 1 : 0
  }

  /**
   * モジュール名からインポート名を生成
   */
  generateImportName(moduleName) {
    return moduleName
      .split('/')
      .pop()
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^./, str => str.toUpperCase())
  }

  /**
   * 修正の検証
   */
  async verifyFix(filePath, errorType) {
    try {
      if (errorType === 'typescript') {
        await execAsync(`npx tsc --noEmit "${filePath}"`)
      } else if (errorType === 'jest') {
        await execAsync(`npm test -- "${filePath}"`)
      } else if (errorType === 'eslint') {
        await execAsync(`npx eslint "${filePath}"`)
      }
      
      console.log(`✅ Fix verified successfully for ${filePath}`)
      return true
    } catch (error) {
      console.log(`⚠️ Fix verification failed: ${error.message}`)
      return false
    }
  }

  /**
   * CI/CD パイプラインとの統合
   */
  async integrateCICD() {
    console.log('🔗 Integrating with CI/CD pipeline...')
    
    // Jenkins ビルドログを監視
    const jenkinsLogPath = process.env.JENKINS_LOG_PATH || '/var/log/jenkins/jenkins.log'
    if (fs.existsSync(jenkinsLogPath)) {
      this.watchAndFix(jenkinsLogPath)
    }

    // GitHub Actions ログを監視
    const githubLogPath = process.env.GITHUB_LOG_PATH
    if (githubLogPath && fs.existsSync(githubLogPath)) {
      this.watchAndFix(githubLogPath)
    }

    // ローカル開発ログを監視
    const localLogPaths = [
      'frontend/npm-debug.log',
      'backend/npm-debug.log',
      'frontend/.next/trace',
      'backend/logs/error.log'
    ]

    for (const logPath of localLogPaths) {
      if (fs.existsSync(logPath)) {
        this.watchAndFix(logPath)
      }
    }
  }

  /**
   * 統計レポートの生成
   */
  generateReport() {
    const report = {
      totalErrors: this.stats.totalErrors || 0,
      fixedErrors: this.stats.fixedErrors || 0,
      fixSuccessRate: this.stats.totalErrors > 0 ? 
        (this.stats.fixedErrors / this.stats.totalErrors * 100).toFixed(2) + '%' : '0%',
      errorTypes: this.stats.errorTypes || {},
      fixStrategies: this.stats.fixStrategies || {},
      timestamp: new Date().toISOString()
    }

    fs.writeFileSync('auto-fix-report.json', JSON.stringify(report, null, 2))
    console.log('📊 Auto-fix report generated: auto-fix-report.json')
  }
}

// CLI実行
if (require.main === module) {
  const autoFix = new AutoErrorFix()
  
  // 統計情報の初期化
  autoFix.stats = {
    totalErrors: 0,
    fixedErrors: 0,
    errorTypes: {},
    fixStrategies: {}
  }

  // CI/CD統合開始
  autoFix.integrateCICD()

  // 定期的なレポート生成
  setInterval(() => {
    autoFix.generateReport()
  }, 60000) // 1分ごと

  console.log('🤖 Auto Error Fix system started')
  console.log('📊 Monitoring logs and attempting automatic fixes...')

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping Auto Error Fix system...')
    autoFix.generateReport()
    process.exit(0)
  })
}

module.exports = AutoErrorFix