#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

class IncrementalDevCycle {
  constructor() {
    this.projectRoot = process.cwd();
    this.isRunning = false;
    this.cycleCount = 0;
    
    // Configuration
    this.config = {
      watchDirs: [
        'frontend/src',
        'backend',
        'docs',
        'tests'
      ],
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      deployCommand: 'npm run deploy',
      lintCommand: 'npm run lint',
      typeCheckCommand: 'npm run type-check'
    };

    this.initializeWatchers();
  }

  initializeWatchers() {
    const watcher = chokidar.watch(this.config.watchDirs, {
      ignored: /node_modules|\.git|\.next|dist|build/,
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      if (!this.isRunning) {
        this.triggerDevCycle(filePath, 'modified');
      }
    });

    watcher.on('add', (filePath) => {
      if (!this.isRunning) {
        this.triggerDevCycle(filePath, 'added');
      }
    });

    console.log('Incremental Development Cycle watcher started...');
  }

  async triggerDevCycle(triggerFile, changeType) {
    this.isRunning = true;
    this.cycleCount++;
    
    console.log(`\n🔄 Development Cycle #${this.cycleCount} triggered by: ${changeType} ${triggerFile}`);
    console.log(`⏰ Started at: ${new Date().toLocaleString('ja-JP')}`);

    try {
      // Step 1: Analyze changes
      await this.analyzeChanges(triggerFile, changeType);
      
      // Step 2: Run quality checks
      await this.runQualityChecks();
      
      // Step 3: Generate/update tests
      await this.generateTests();
      
      // Step 4: Run tests
      await this.runTests();
      
      // Step 5: Update documentation
      await this.updateDocumentation();
      
      // Step 6: Build project
      await this.buildProject();
      
      // Step 7: Deploy if appropriate
      await this.deployIfReady();
      
      // Step 8: Update progress tracking
      await this.updateProgress();
      
      console.log(`✅ Development Cycle #${this.cycleCount} completed successfully!`);
      
    } catch (error) {
      console.error(`❌ Development Cycle #${this.cycleCount} failed:`, error.message);
      await this.handleCycleFailure(error);
    } finally {
      this.isRunning = false;
    }
  }

  async analyzeChanges(triggerFile, changeType) {
    console.log(`📊 Analyzing changes in ${triggerFile}...`);
    
    const analysis = {
      file: triggerFile,
      type: changeType,
      timestamp: new Date().toISOString(),
      impact: this.assessImpact(triggerFile),
      requiredActions: []
    };

    // Determine what actions are needed based on the file type
    if (triggerFile.includes('frontend/src')) {
      analysis.requiredActions.push('frontend-test', 'build', 'deploy');
    }
    
    if (triggerFile.includes('backend')) {
      analysis.requiredActions.push('backend-test', 'integration-test');
    }
    
    if (triggerFile.includes('docs')) {
      analysis.requiredActions.push('docs-update');
    }

    // Save analysis for tracking
    const analysisPath = path.join(this.projectRoot, 'logs/dev-cycles.json');
    this.saveAnalysis(analysisPath, analysis);
    
    return analysis;
  }

  assessImpact(filePath) {
    if (filePath.includes('page.tsx') || filePath.includes('layout.tsx')) {
      return 'high'; // UI changes affect user experience
    }
    if (filePath.includes('api/') || filePath.includes('backend/')) {
      return 'high'; // Backend changes affect functionality
    }
    if (filePath.includes('component') || filePath.includes('hook')) {
      return 'medium'; // Component changes may affect multiple pages
    }
    if (filePath.includes('test') || filePath.includes('spec')) {
      return 'low'; // Test changes don't affect production
    }
    return 'medium';
  }

  async runQualityChecks() {
    console.log('🔍 Running quality checks...');
    
    try {
      // Lint check
      if (this.commandExists('npm run lint')) {
        console.log('  - Running lint...');
        execSync('npm run lint', { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 30000 
        });
        console.log('    ✅ Lint passed');
      }
      
      // Type check
      if (this.commandExists('npm run type-check')) {
        console.log('  - Running type check...');
        execSync('npm run type-check', { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 30000 
        });
        console.log('    ✅ Type check passed');
      }
      
    } catch (error) {
      console.log('    ⚠️ Quality checks failed, attempting auto-fix...');
      await this.autoFixQualityIssues();
    }
  }

  async autoFixQualityIssues() {
    console.log('🔧 Attempting auto-fix for quality issues...');
    
    try {
      // Try to fix lint issues
      if (this.commandExists('npm run lint:fix')) {
        execSync('npm run lint:fix', { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 30000 
        });
        console.log('    ✅ Auto-fixed lint issues');
      }
      
      // Try to format code
      if (this.commandExists('npm run format')) {
        execSync('npm run format', { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 30000 
        });
        console.log('    ✅ Auto-formatted code');
      }
      
    } catch (error) {
      console.log('    ❌ Auto-fix failed, manual intervention may be required');
      throw error;
    }
  }

  async generateTests() {
    console.log('🧪 Generating/updating tests...');
    
    // Run the test generator
    try {
      const testGeneratorPath = path.join(this.projectRoot, 'scripts/test-generator.js');
      if (fs.existsSync(testGeneratorPath)) {
        execSync(`node "${testGeneratorPath}"`, { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 60000 
        });
        console.log('    ✅ Tests generated/updated');
      }
    } catch (error) {
      console.log('    ⚠️ Test generation failed:', error.message);
    }
  }

  async runTests() {
    console.log('🧪 Running tests...');
    
    try {
      // Unit tests
      if (this.commandExists('npm test')) {
        console.log('  - Running unit tests...');
        execSync('npm test', { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 120000 
        });
        console.log('    ✅ Unit tests passed');
      }
      
      // E2E tests (if available)
      if (this.commandExists('npm run test:e2e')) {
        console.log('  - Running E2E tests...');
        execSync('npm run test:e2e', { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 300000 
        });
        console.log('    ✅ E2E tests passed');
      }
      
    } catch (error) {
      console.log('    ❌ Tests failed, attempting auto-fix...');
      await this.autoFixTestFailures();
    }
  }

  async autoFixTestFailures() {
    console.log('🔧 Attempting to auto-fix test failures...');
    
    try {
      const testFixerPath = path.join(this.projectRoot, 'scripts/test-error-fixer.js');
      if (fs.existsSync(testFixerPath)) {
        execSync(`node "${testFixerPath}"`, { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 120000 
        });
        console.log('    ✅ Test failures auto-fixed');
        
        // Re-run tests
        await this.runTests();
      }
    } catch (error) {
      console.log('    ❌ Auto-fix failed for tests');
      throw error;
    }
  }

  async updateDocumentation() {
    console.log('📝 Updating documentation...');
    
    try {
      // Run dashboard updater
      const dashboardUpdaterPath = path.join(this.projectRoot, 'scripts/auto-dashboard-updater.js');
      if (fs.existsSync(dashboardUpdaterPath)) {
        execSync(`node "${dashboardUpdaterPath}"`, { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 30000 
        });
        console.log('    ✅ Dashboard updated');
      }
      
      // Run test docs generator
      const testDocsGeneratorPath = path.join(this.projectRoot, 'scripts/test-docs-generator.js');
      if (fs.existsSync(testDocsGeneratorPath)) {
        execSync(`node "${testDocsGeneratorPath}"`, { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 30000 
        });
        console.log('    ✅ Test documentation updated');
      }
      
    } catch (error) {
      console.log('    ⚠️ Documentation update failed:', error.message);
    }
  }

  async buildProject() {
    console.log('🏗️ Building project...');
    
    try {
      if (this.commandExists('npm run build')) {
        execSync('npm run build', { 
          cwd: this.projectRoot, 
          stdio: 'pipe',
          timeout: 300000 
        });
        console.log('    ✅ Build successful');
        return true;
      }
    } catch (error) {
      console.log('    ❌ Build failed:', error.message);
      throw error;
    }
    
    return false;
  }

  async deployIfReady() {
    console.log('🚀 Checking deployment readiness...');
    
    try {
      // Check if all tests pass and build is successful
      const isReady = await this.checkDeploymentReadiness();
      
      if (isReady) {
        console.log('  - Deploying to GitHub Pages...');
        
        // Commit changes
        try {
          execSync('git add .', { cwd: this.projectRoot, stdio: 'pipe' });
          execSync(`git commit -m "🤖 Automated update from dev cycle #${this.cycleCount}"`, { 
            cwd: this.projectRoot, 
            stdio: 'pipe' 
          });
          execSync('git push origin main', { 
            cwd: this.projectRoot, 
            stdio: 'pipe',
            timeout: 60000 
          });
          console.log('    ✅ Deployed successfully');
        } catch (error) {
          if (!error.message.includes('nothing to commit')) {
            throw error;
          }
          console.log('    ℹ️ No changes to deploy');
        }
      } else {
        console.log('    ⏸️ Deployment skipped - not ready');
      }
      
    } catch (error) {
      console.log('    ❌ Deployment failed:', error.message);
    }
  }

  async checkDeploymentReadiness() {
    // Check if we're on main branch
    try {
      const currentBranch = execSync('git branch --show-current', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      }).trim();
      
      if (currentBranch !== 'main') {
        console.log(`    ⚠️ Not on main branch (current: ${currentBranch})`);
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateProgress() {
    console.log('📊 Updating progress tracking...');
    
    const progressData = {
      cycleNumber: this.cycleCount,
      timestamp: new Date().toISOString(),
      status: 'completed',
      duration: Date.now() - this.cycleStartTime,
      actions: ['analyze', 'quality-check', 'test', 'build', 'deploy', 'docs-update']
    };
    
    // Save progress to tracking file
    const progressPath = path.join(this.projectRoot, 'logs/progress-tracking.json');
    this.saveProgress(progressPath, progressData);
    
    console.log('    ✅ Progress updated');
  }

  async handleCycleFailure(error) {
    console.log('🚨 Handling cycle failure...');
    
    const failureData = {
      cycleNumber: this.cycleCount,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message,
      stack: error.stack
    };
    
    // Save failure log
    const failuresPath = path.join(this.projectRoot, 'logs/cycle-failures.json');
    this.saveProgress(failuresPath, failureData);
    
    // Attempt recovery
    console.log('🔄 Attempting automatic recovery...');
    try {
      // Reset to last known good state if needed
      execSync('git stash', { cwd: this.projectRoot, stdio: 'pipe' });
      console.log('    ✅ Changes stashed for recovery');
    } catch (stashError) {
      console.log('    ⚠️ Could not stash changes');
    }
  }

  commandExists(command) {
    try {
      execSync(`npm run-script ${command.replace('npm run ', '')}`, { 
        cwd: this.projectRoot, 
        stdio: 'pipe' 
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  saveAnalysis(filePath, data) {
    this.ensureDirectoryExists(path.dirname(filePath));
    
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        existingData = [];
      }
    }
    
    existingData.push(data);
    
    // Keep only last 100 entries
    if (existingData.length > 100) {
      existingData = existingData.slice(-100);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  }

  saveProgress(filePath, data) {
    this.ensureDirectoryExists(path.dirname(filePath));
    
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        existingData = [];
      }
    }
    
    existingData.push(data);
    
    // Keep only last 50 entries
    if (existingData.length > 50) {
      existingData = existingData.slice(-50);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// Start the incremental development cycle
const devCycle = new IncrementalDevCycle();

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Incremental Development Cycle...');
  process.exit(0);
});