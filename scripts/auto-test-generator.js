#!/usr/bin/env node

/**
 * 自動テスト生成システム
 * 新しいコンポーネント・API・機能に対してテストケースを自動生成
 */

const fs = require('fs')
const path = require('path')
const chokidar = require('chokidar')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

class AutoTestGenerator {
  constructor() {
    this.watchPaths = [
      'frontend/src/app/**/*.tsx',
      'frontend/src/components/**/*.tsx',
      'backend/routes/**/*.js',
      'backend/services/**/*.js'
    ]
    this.testTemplates = new Map()
    this.initializeTemplates()
  }

  /**
   * テストテンプレートの初期化
   */
  initializeTemplates() {
    // React コンポーネント用テンプレート
    this.testTemplates.set('react-component', `
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {{componentName}} from '../{{componentPath}}'

describe('{{componentName}} Component', () => {
  test('should render without crashing', () => {
    render(<{{componentName}} />)
    expect(screen.getByTestId('{{testId}}')).toBeInTheDocument()
  })

  {{#if hasProps}}
  test('should handle props correctly', () => {
    const mockProps = {{mockProps}}
    render(<{{componentName}} {...mockProps} />)
    
    {{#each propTests}}
    expect(screen.getByText(mockProps.{{propName}})).toBeInTheDocument()
    {{/each}}
  })
  {{/if}}

  {{#if hasEvents}}
  test('should handle user interactions', async () => {
    const user = userEvent.setup()
    const mockHandler = jest.fn()
    
    render(<{{componentName}} {{#each eventHandlers}}{{name}}={mockHandler}{{/each}} />)
    
    {{#each interactions}}
    await user.{{action}}(screen.getBy{{selector}}('{{target}}'))
    expect(mockHandler).toHaveBeenCalled{{#if callCount}}Times({{callCount}}){{/if}}
    {{/each}}
  })
  {{/if}}

  {{#if hasAsyncOperations}}
  test('should handle async operations', async () => {
    // Mock API calls
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({{mockApiResponse}})
    })

    render(<{{componentName}} />)
    
    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText(/{{expectedText}}/i)).toBeInTheDocument()
    })
  })
  {{/if}}
})
`)

    // API エンドポイント用テンプレート
    this.testTemplates.set('api-endpoint', `
import request from 'supertest'
import app from '../../server'
import { setupTestDB, cleanupTestDB, seedTestData } from '../helpers/database'

describe('{{endpointPath}} API', () => {
  beforeAll(async () => {
    await setupTestDB()
  })

  afterAll(async () => {
    await cleanupTestDB()
  })

  beforeEach(async () => {
    await seedTestData()
  })

  test('{{method}} {{endpointPath}} should return {{expectedStatus}}', async () => {
    {{#if requiresAuth}}
    const authToken = await getValidAuthToken()
    {{/if}}
    
    const response = await request(app)
      .{{method.toLowerCase()}}('{{endpointPath}}')
      {{#if hasRequestBody}}
      .send({{requestBody}})
      {{/if}}
      {{#if requiresAuth}}
      .set('Authorization', \`Bearer \${authToken}\`)
      {{/if}}
      .expect({{expectedStatus}})

    {{#if hasResponseValidation}}
    expect(response.body).toMatchObject({{expectedResponse}})
    {{/if}}

    {{#if hasDbValidation}}
    // Verify database changes
    const dbResult = await {{dbQuery}}
    expect(dbResult).toMatchObject({{expectedDbState}})
    {{/if}}
  })

  {{#if hasValidationTests}}
  test('should validate request parameters', async () => {
    const invalidData = {{invalidRequestData}}
    
    const response = await request(app)
      .{{method.toLowerCase()}}('{{endpointPath}}')
      .send(invalidData)
      .expect(400)

    expect(response.body.error).toContain('Validation error')
  })
  {{/if}}

  {{#if hasErrorTests}}
  test('should handle errors gracefully', async () => {
    // Mock database error
    jest.spyOn(require('../../models/{{modelName}}'), '{{methodName}}')
      .mockRejectedValueOnce(new Error('Database connection failed'))

    const response = await request(app)
      .{{method.toLowerCase()}}('{{endpointPath}}')
      .expect(500)

    expect(response.body.error).toContain('Internal server error')
  })
  {{/if}}
})
`)

    // サービス関数用テンプレート
    this.testTemplates.set('service-function', `
import { {{serviceName}} } from '../{{servicePath}}'
{{#if hasExternalDependencies}}
{{#each dependencies}}
import { {{name}} } from '{{path}}'
{{/each}}
{{/if}}

describe('{{serviceName}} Service', () => {
  {{#if hasExternalDependencies}}
  beforeEach(() => {
    jest.clearAllMocks()
  })
  {{/if}}

  test('{{functionName}} should return expected result', async () => {
    {{#if hasMocks}}
    // Setup mocks
    {{#each mocks}}
    jest.spyOn({{module}}, '{{method}}').mockResolvedValueOnce({{returnValue}})
    {{/each}}
    {{/if}}

    const input = {{inputData}}
    const result = await {{serviceName}}.{{functionName}}(input)

    expect(result).toEqual({{expectedOutput}})
    {{#if hasCallVerification}}
    {{#each callVerifications}}
    expect({{module}}.{{method}}).toHaveBeenCalledWith({{expectedArgs}})
    {{/each}}
    {{/if}}
  })

  {{#if hasErrorHandling}}
  test('{{functionName}} should handle errors gracefully', async () => {
    const invalidInput = {{invalidInputData}}
    
    await expect({{serviceName}}.{{functionName}}(invalidInput))
      .rejects
      .toThrow('{{expectedError}}')
  })
  {{/if}}

  {{#if hasEdgeCases}}
  {{#each edgeCases}}
  test('{{functionName}} should handle {{description}}', async () => {
    const input = {{inputData}}
    const result = await {{serviceName}}.{{functionName}}(input)
    
    expect(result).toEqual({{expectedResult}})
  })
  {{/each}}
  {{/if}}
})
`)
  }

  /**
   * ファイル監視を開始
   */
  startWatching() {
    console.log('🔍 Starting auto test generation system...')
    
    const watcher = chokidar.watch(this.watchPaths, {
      ignored: /node_modules/,
      persistent: true
    })

    watcher
      .on('add', (filepath) => this.handleFileAdded(filepath))
      .on('change', (filepath) => this.handleFileChanged(filepath))
      .on('unlink', (filepath) => this.handleFileDeleted(filepath))

    console.log(`👀 Watching paths: ${this.watchPaths.join(', ')}`)
  }

  /**
   * 新しいファイルが追加された時の処理
   */
  async handleFileAdded(filepath) {
    console.log(`📁 New file detected: ${filepath}`)
    
    try {
      const fileContent = fs.readFileSync(filepath, 'utf8')
      const analysis = await this.analyzeFile(filepath, fileContent)
      
      if (this.shouldGenerateTest(analysis)) {
        await this.generateTests(filepath, analysis)
      }
    } catch (error) {
      console.error(`❌ Error processing file ${filepath}:`, error.message)
    }
  }

  /**
   * ファイルが変更された時の処理
   */
  async handleFileChanged(filepath) {
    console.log(`📝 File changed: ${filepath}`)
    
    try {
      const fileContent = fs.readFileSync(filepath, 'utf8')
      const analysis = await this.analyzeFile(filepath, fileContent)
      
      if (this.shouldUpdateTest(analysis)) {
        await this.updateTests(filepath, analysis)
      }
    } catch (error) {
      console.error(`❌ Error updating tests for ${filepath}:`, error.message)
    }
  }

  /**
   * ファイルが削除された時の処理
   */
  async handleFileDeleted(filepath) {
    console.log(`🗑️ File deleted: ${filepath}`)
    
    const testFilePath = this.getTestFilePath(filepath)
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
      console.log(`🗑️ Corresponding test file deleted: ${testFilePath}`)
    }
  }

  /**
   * ファイルの内容を解析
   */
  async analyzeFile(filepath, content) {
    const analysis = {
      filepath,
      type: this.determineFileType(filepath),
      components: [],
      functions: [],
      apis: [],
      dependencies: [],
      hasTests: false,
      complexity: 'low'
    }

    try {
      // React コンポーネントの解析
      if (analysis.type === 'react-component') {
        analysis.components = this.extractReactComponents(content)
      }
      
      // API エンドポイントの解析
      if (analysis.type === 'api-route') {
        analysis.apis = this.extractApiEndpoints(content)
      }
      
      // サービス関数の解析
      if (analysis.type === 'service') {
        analysis.functions = this.extractServiceFunctions(content)
      }

      // 依存関係の解析
      analysis.dependencies = this.extractDependencies(content)
      
      // 複雑さの計算
      analysis.complexity = this.calculateComplexity(content)
      
      // 既存テストの確認
      analysis.hasTests = this.hasExistingTests(filepath)

    } catch (error) {
      console.error(`❌ Error analyzing file ${filepath}:`, error.message)
    }

    return analysis
  }

  /**
   * ファイルタイプの判定
   */
  determineFileType(filepath) {
    if (filepath.includes('frontend/src/app') && filepath.endsWith('.tsx')) {
      return 'react-component'
    }
    if (filepath.includes('backend/routes') && filepath.endsWith('.js')) {
      return 'api-route'
    }
    if (filepath.includes('backend/services') && filepath.endsWith('.js')) {
      return 'service'
    }
    return 'unknown'
  }

  /**
   * React コンポーネントの抽出
   */
  extractReactComponents(content) {
    const components = []
    
    // export default function パターン
    const defaultFunctionMatch = content.match(/export\s+default\s+function\s+(\w+)/g)
    if (defaultFunctionMatch) {
      defaultFunctionMatch.forEach(match => {
        const name = match.match(/function\s+(\w+)/)[1]
        components.push({
          name,
          isDefault: true,
          props: this.extractProps(content, name),
          hooks: this.extractHooks(content),
          events: this.extractEventHandlers(content)
        })
      })
    }

    // const Component = () => パターン
    const arrowFunctionMatch = content.match(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g)
    if (arrowFunctionMatch) {
      arrowFunctionMatch.forEach(match => {
        const name = match.match(/const\s+(\w+)/)[1]
        if (this.isReactComponent(content, name)) {
          components.push({
            name,
            isDefault: content.includes(`export default ${name}`),
            props: this.extractProps(content, name),
            hooks: this.extractHooks(content),
            events: this.extractEventHandlers(content)
          })
        }
      })
    }

    return components
  }

  /**
   * API エンドポイントの抽出
   */
  extractApiEndpoints(content) {
    const endpoints = []
    
    // router.get/post/put/delete パターン
    const routeMatches = content.match(/router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g)
    if (routeMatches) {
      routeMatches.forEach(match => {
        const [, method, path] = match.match(/router\.(\w+)\s*\(\s*['"`]([^'"`]+)['"`]/)
        endpoints.push({
          method: method.toUpperCase(),
          path,
          hasAuth: this.hasAuthentication(content, path),
          hasValidation: this.hasValidation(content, path),
          params: this.extractRouteParams(path),
          middleware: this.extractMiddleware(content, path)
        })
      })
    }

    return endpoints
  }

  /**
   * サービス関数の抽出
   */
  extractServiceFunctions(content) {
    const functions = []
    
    // class methods
    const classMethodMatches = content.match(/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/gm)
    if (classMethodMatches) {
      classMethodMatches.forEach(match => {
        const name = match.match(/(\w+)\s*\(/)[1]
        if (name !== 'constructor') {
          functions.push({
            name,
            isAsync: match.includes('async'),
            params: this.extractFunctionParams(match),
            returnType: this.inferReturnType(content, name)
          })
        }
      })
    }

    // function declarations
    const functionMatches = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g)
    if (functionMatches) {
      functionMatches.forEach(match => {
        const name = match.match(/function\s+(\w+)/)[1]
        functions.push({
          name,
          isAsync: match.includes('async'),
          isExported: match.includes('export'),
          params: this.extractFunctionParams(match),
          returnType: this.inferReturnType(content, name)
        })
      })
    }

    return functions
  }

  /**
   * テスト生成が必要かどうかの判定
   */
  shouldGenerateTest(analysis) {
    // 既にテストが存在する場合はスキップ
    if (analysis.hasTests) {
      return false
    }

    // テスト対象の要素が存在する場合は生成
    return analysis.components.length > 0 || 
           analysis.apis.length > 0 || 
           analysis.functions.length > 0
  }

  /**
   * テストファイルの生成
   */
  async generateTests(filepath, analysis) {
    console.log(`🧪 Generating tests for ${filepath}`)
    
    try {
      let testContent = ''
      
      // React コンポーネントのテスト生成
      if (analysis.type === 'react-component' && analysis.components.length > 0) {
        testContent = await this.generateReactComponentTests(analysis)
      }
      
      // API エンドポイントのテスト生成
      if (analysis.type === 'api-route' && analysis.apis.length > 0) {
        testContent = await this.generateApiEndpointTests(analysis)
      }
      
      // サービス関数のテスト生成
      if (analysis.type === 'service' && analysis.functions.length > 0) {
        testContent = await this.generateServiceFunctionTests(analysis)
      }

      if (testContent) {
        const testFilePath = this.getTestFilePath(filepath)
        this.ensureDirectoryExists(path.dirname(testFilePath))
        fs.writeFileSync(testFilePath, testContent)
        console.log(`✅ Test file generated: ${testFilePath}`)
        
        // テスト実行
        await this.runGeneratedTests(testFilePath)
      }
    } catch (error) {
      console.error(`❌ Error generating tests:`, error.message)
    }
  }

  /**
   * React コンポーネントテストの生成
   */
  async generateReactComponentTests(analysis) {
    const component = analysis.components[0] // メインコンポーネント
    
    const templateData = {
      componentName: component.name,
      componentPath: this.getRelativeComponentPath(analysis.filepath),
      testId: component.name.toLowerCase(),
      hasProps: component.props.length > 0,
      mockProps: this.generateMockProps(component.props),
      propTests: component.props.map(prop => ({ propName: prop.name })),
      hasEvents: component.events.length > 0,
      eventHandlers: component.events,
      interactions: this.generateInteractions(component.events),
      hasAsyncOperations: component.hooks.includes('useEffect') || component.hooks.includes('useSWR'),
      mockApiResponse: '{ data: "test" }',
      expectedText: 'Loading...|Success|Error'
    }

    return this.compileTemplate('react-component', templateData)
  }

  /**
   * API エンドポイントテストの生成
   */
  async generateApiEndpointTests(analysis) {
    const endpoint = analysis.apis[0] // メインエンドポイント
    
    const templateData = {
      endpointPath: endpoint.path,
      method: endpoint.method,
      expectedStatus: endpoint.method === 'POST' ? 201 : 200,
      requiresAuth: endpoint.hasAuth,
      hasRequestBody: ['POST', 'PUT', 'PATCH'].includes(endpoint.method),
      requestBody: this.generateRequestBody(endpoint),
      hasResponseValidation: true,
      expectedResponse: this.generateExpectedResponse(endpoint),
      hasDbValidation: ['POST', 'PUT', 'DELETE'].includes(endpoint.method),
      dbQuery: this.generateDbQuery(endpoint),
      expectedDbState: '{}',
      hasValidationTests: endpoint.hasValidation,
      invalidRequestData: this.generateInvalidRequestData(endpoint),
      hasErrorTests: true,
      modelName: this.extractModelName(endpoint.path),
      methodName: this.getModelMethod(endpoint.method)
    }

    return this.compileTemplate('api-endpoint', templateData)
  }

  /**
   * サービス関数テストの生成
   */
  async generateServiceFunctionTests(analysis) {
    const func = analysis.functions[0] // メイン関数
    
    const templateData = {
      serviceName: this.extractServiceName(analysis.filepath),
      servicePath: this.getRelativeServicePath(analysis.filepath),
      functionName: func.name,
      hasExternalDependencies: analysis.dependencies.length > 0,
      dependencies: analysis.dependencies,
      hasMocks: analysis.dependencies.length > 0,
      mocks: this.generateMocks(analysis.dependencies),
      inputData: this.generateInputData(func),
      expectedOutput: this.generateExpectedOutput(func),
      hasCallVerification: analysis.dependencies.length > 0,
      callVerifications: this.generateCallVerifications(analysis.dependencies),
      hasErrorHandling: true,
      invalidInputData: this.generateInvalidInputData(func),
      expectedError: 'Invalid input',
      hasEdgeCases: true,
      edgeCases: this.generateEdgeCases(func)
    }

    return this.compileTemplate('service-function', templateData)
  }

  /**
   * 生成されたテストの実行
   */
  async runGeneratedTests(testFilePath) {
    try {
      console.log(`🏃 Running generated tests: ${testFilePath}`)
      
      const testCommand = testFilePath.includes('frontend') 
        ? 'cd frontend && npm test -- --testPathPattern=' + path.basename(testFilePath)
        : 'cd backend && npm test -- --testPathPattern=' + path.basename(testFilePath)
      
      const { stdout, stderr } = await execAsync(testCommand)
      
      if (stderr && !stderr.includes('PASS')) {
        console.log(`⚠️ Test warnings: ${stderr}`)
      }
      
      if (stdout.includes('FAIL')) {
        console.log(`❌ Some tests failed:\n${stdout}`)
        await this.handleTestFailures(testFilePath, stdout)
      } else {
        console.log(`✅ All generated tests passed`)
      }
    } catch (error) {
      console.error(`❌ Error running tests: ${error.message}`)
      await this.handleTestFailures(testFilePath, error.message)
    }
  }

  /**
   * テスト失敗時の自動修正
   */
  async handleTestFailures(testFilePath, errorOutput) {
    console.log(`🔧 Attempting to auto-fix test failures...`)
    
    try {
      // よくあるエラーパターンの修正
      let testContent = fs.readFileSync(testFilePath, 'utf8')
      let modified = false

      // Missing imports の修正
      if (errorOutput.includes('is not defined') || errorOutput.includes('Cannot resolve module')) {
        const missingImports = this.extractMissingImports(errorOutput)
        for (const importStatement of missingImports) {
          if (!testContent.includes(importStatement)) {
            testContent = importStatement + '\n' + testContent
            modified = true
          }
        }
      }

      // Async/await の修正
      if (errorOutput.includes('async')) {
        testContent = testContent.replace(/test\('([^']+)', \(\) => {/g, "test('$1', async () => {")
        testContent = testContent.replace(/(\w+\([^)]*\))\s*$/gm, 'await $1')
        modified = true
      }

      // Mock の修正
      if (errorOutput.includes('mock') || errorOutput.includes('jest.fn()')) {
        const mockSetup = this.generateMockSetup(errorOutput)
        if (mockSetup && !testContent.includes(mockSetup)) {
          testContent = testContent.replace(
            /describe\('([^']+)', \(\) => {/,
            `describe('$1', () => {\n  ${mockSetup}\n`
          )
          modified = true
        }
      }

      if (modified) {
        fs.writeFileSync(testFilePath, testContent)
        console.log(`🔧 Test file auto-fixed: ${testFilePath}`)
        
        // 修正後のテスト再実行
        await this.runGeneratedTests(testFilePath)
      }
    } catch (error) {
      console.error(`❌ Error auto-fixing tests: ${error.message}`)
    }
  }

  /**
   * テンプレートのコンパイル
   */
  compileTemplate(templateName, data) {
    let template = this.testTemplates.get(templateName)
    
    // Simple template compilation (Handlebars-like)
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      template = template.replace(regex, value)
    }

    // Handle conditionals
    template = this.handleConditionals(template, data)
    template = this.handleLoops(template, data)

    return template
  }

  /**
   * 条件分岐の処理
   */
  handleConditionals(template, data) {
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g
    
    return template.replace(conditionalRegex, (match, condition, content) => {
      return data[condition] ? content : ''
    })
  }

  /**
   * ループの処理
   */
  handleLoops(template, data) {
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g
    
    return template.replace(loopRegex, (match, arrayName, content) => {
      const array = data[arrayName] || []
      return array.map(item => {
        let itemContent = content
        for (const [key, value] of Object.entries(item)) {
          itemContent = itemContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
        }
        return itemContent
      }).join('\n')
    })
  }

  /**
   * テストファイルパスの取得
   */
  getTestFilePath(filepath) {
    if (filepath.includes('frontend/src')) {
      return filepath.replace('/src/', '/src/__tests__/').replace(/\.(tsx|ts)$/, '.test.$1')
    }
    if (filepath.includes('backend/')) {
      return filepath.replace(/\.js$/, '.test.js').replace(/^backend\//, 'backend/__tests__/')
    }
    return filepath + '.test.js'
  }

  /**
   * ディレクトリの作成
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  // ユーティリティメソッド群
  extractProps(content, componentName) { /* 実装省略 */ return [] }
  extractHooks(content) { /* 実装省略 */ return [] }
  extractEventHandlers(content) { /* 実装省略 */ return [] }
  isReactComponent(content, name) { /* 実装省略 */ return true }
  hasAuthentication(content, path) { /* 実装省略 */ return false }
  hasValidation(content, path) { /* 実装省略 */ return false }
  extractRouteParams(path) { /* 実装省略 */ return [] }
  extractMiddleware(content, path) { /* 実装省略 */ return [] }
  extractFunctionParams(match) { /* 実装省略 */ return [] }
  inferReturnType(content, name) { /* 実装省略 */ return 'any' }
  extractDependencies(content) { /* 実装省略 */ return [] }
  calculateComplexity(content) { /* 実装省略 */ return 'low' }
  hasExistingTests(filepath) { /* 実装省略 */ return false }
  // ... その他のユーティリティメソッド
}

// CLI実行
if (require.main === module) {
  const generator = new AutoTestGenerator()
  generator.startWatching()
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping auto test generation system...')
    process.exit(0)
  })
}

module.exports = AutoTestGenerator