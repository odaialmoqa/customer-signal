#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Comprehensive test runner for CustomerSignal
 * Runs all test suites and generates a consolidated report
 */

const testSuites = [
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    required: true,
    timeout: 300000 // 5 minutes
  },
  {
    name: 'Integration Tests',
    command: 'npm run test:integration',
    required: true,
    timeout: 600000 // 10 minutes
  },
  {
    name: 'API Tests',
    command: 'npm run test:api',
    required: true,
    timeout: 300000 // 5 minutes
  },
  {
    name: 'End-to-End Tests (Vitest)',
    command: 'npm run test:e2e',
    required: true,
    timeout: 600000 // 10 minutes
  },
  {
    name: 'End-to-End Tests (Playwright)',
    command: 'npm run test:e2e:playwright',
    required: false, // Optional as it requires browser setup
    timeout: 900000 // 15 minutes
  },
  {
    name: 'Accessibility Tests (Vitest)',
    command: 'npm run test:accessibility',
    required: true,
    timeout: 300000 // 5 minutes
  },
  {
    name: 'Accessibility Tests (Playwright)',
    command: 'npm run test:accessibility:playwright',
    required: false, // Optional as it requires browser setup
    timeout: 600000 // 10 minutes
  },
  {
    name: 'Performance Tests',
    command: 'npm run test:performance',
    required: true,
    timeout: 600000 // 10 minutes
  },
  {
    name: 'Load Tests',
    command: 'npm run test:load',
    required: false, // Optional as it's resource intensive
    timeout: 900000 // 15 minutes
  },
  {
    name: 'Security Tests',
    command: 'npm run test:security',
    required: true,
    timeout: 300000 // 5 minutes
  }
]

class TestRunner {
  constructor() {
    this.results = []
    this.startTime = Date.now()
    this.reportDir = path.join(__dirname, '..', 'test-results')
    
    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true })
    }
  }

  async runTest(testSuite) {
    console.log(`\n🧪 Running ${testSuite.name}...`)
    console.log(`Command: ${testSuite.command}`)
    console.log('─'.repeat(50))

    const startTime = Date.now()
    let success = false
    let output = ''
    let error = ''

    try {
      output = execSync(testSuite.command, {
        encoding: 'utf8',
        timeout: testSuite.timeout,
        stdio: 'pipe'
      })
      success = true
      console.log('✅ PASSED')
    } catch (err) {
      success = false
      error = err.message
      output = err.stdout || ''
      console.log('❌ FAILED')
      console.log(`Error: ${err.message}`)
      
      if (testSuite.required) {
        console.log('⚠️  This is a required test suite')
      }
    }

    const duration = Date.now() - startTime
    const result = {
      name: testSuite.name,
      command: testSuite.command,
      success,
      duration,
      output,
      error,
      required: testSuite.required,
      timestamp: new Date().toISOString()
    }

    this.results.push(result)
    console.log(`Duration: ${duration}ms`)
    
    return result
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite')
    console.log('═'.repeat(60))

    for (const testSuite of testSuites) {
      await this.runTest(testSuite)
    }

    this.generateReport()
    this.printSummary()
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.success).length
    const failedTests = this.results.filter(r => !r.success).length
    const requiredFailures = this.results.filter(r => !r.success && r.required).length

    const report = {
      summary: {
        totalTests: this.results.length,
        passed: passedTests,
        failed: failedTests,
        requiredFailures,
        totalDuration,
        timestamp: new Date().toISOString(),
        success: requiredFailures === 0
      },
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      }
    }

    // Write JSON report
    const jsonReportPath = path.join(this.reportDir, 'comprehensive-test-report.json')
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2))

    // Write HTML report
    this.generateHtmlReport(report)

    console.log(`\n📊 Reports generated:`)
    console.log(`   JSON: ${jsonReportPath}`)
    console.log(`   HTML: ${path.join(this.reportDir, 'comprehensive-test-report.html')}`)
  }

  generateHtmlReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CustomerSignal - Comprehensive Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
        .metric { text-align: center; padding: 15px; border-radius: 6px; }
        .metric.success { background: #dcfce7; color: #166534; }
        .metric.warning { background: #fef3c7; color: #92400e; }
        .metric.error { background: #fee2e2; color: #991b1b; }
        .metric h3 { margin: 0; font-size: 2em; }
        .metric p { margin: 5px 0 0 0; font-weight: 500; }
        .results { padding: 0 20px 20px; }
        .test-result { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px; overflow: hidden; }
        .test-header { padding: 15px; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; }
        .test-header.success { border-left: 4px solid #10b981; }
        .test-header.failed { border-left: 4px solid #ef4444; }
        .test-name { font-weight: 600; }
        .test-status { padding: 4px 8px; border-radius: 4px; font-size: 0.875em; font-weight: 500; }
        .test-status.success { background: #dcfce7; color: #166534; }
        .test-status.failed { background: #fee2e2; color: #991b1b; }
        .test-details { padding: 15px; background: white; border-top: 1px solid #e5e7eb; }
        .test-output { background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.875em; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
        .footer { padding: 20px; text-align: center; color: #6b7280; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CustomerSignal - Comprehensive Test Report</h1>
            <p>Generated on ${new Date(report.summary.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric ${report.summary.success ? 'success' : 'error'}">
                <h3>${report.summary.success ? '✅' : '❌'}</h3>
                <p>Overall Status</p>
            </div>
            <div class="metric success">
                <h3>${report.summary.passed}</h3>
                <p>Tests Passed</p>
            </div>
            <div class="metric ${report.summary.failed > 0 ? 'error' : 'success'}">
                <h3>${report.summary.failed}</h3>
                <p>Tests Failed</p>
            </div>
            <div class="metric ${report.summary.requiredFailures > 0 ? 'error' : 'success'}">
                <h3>${report.summary.requiredFailures}</h3>
                <p>Required Failures</p>
            </div>
            <div class="metric">
                <h3>${Math.round(report.summary.totalDuration / 1000)}s</h3>
                <p>Total Duration</p>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Results</h2>
            ${report.results.map(result => `
                <div class="test-result">
                    <div class="test-header ${result.success ? 'success' : 'failed'}">
                        <div>
                            <div class="test-name">${result.name}</div>
                            <div style="font-size: 0.875em; color: #6b7280; margin-top: 4px;">
                                ${result.command} • ${Math.round(result.duration / 1000)}s
                                ${result.required ? ' • Required' : ' • Optional'}
                            </div>
                        </div>
                        <div class="test-status ${result.success ? 'success' : 'failed'}">
                            ${result.success ? 'PASSED' : 'FAILED'}
                        </div>
                    </div>
                    ${result.output || result.error ? `
                        <div class="test-details">
                            <div class="test-output">${result.error || result.output}</div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>Environment: Node.js ${report.environment.nodeVersion} on ${report.environment.platform} ${report.environment.arch}</p>
        </div>
    </div>
</body>
</html>
    `

    const htmlReportPath = path.join(this.reportDir, 'comprehensive-test-report.html')
    fs.writeFileSync(htmlReportPath, html)
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.success).length
    const failedTests = this.results.filter(r => !r.success).length
    const requiredFailures = this.results.filter(r => !r.success && r.required).length

    console.log('\n' + '═'.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('═'.repeat(60))
    console.log(`Total Tests: ${this.results.length}`)
    console.log(`✅ Passed: ${passedTests}`)
    console.log(`❌ Failed: ${failedTests}`)
    console.log(`⚠️  Required Failures: ${requiredFailures}`)
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`)
    console.log('')

    if (requiredFailures === 0) {
      console.log('🎉 ALL REQUIRED TESTS PASSED!')
      console.log('The application is ready for deployment.')
    } else {
      console.log('💥 SOME REQUIRED TESTS FAILED!')
      console.log('Please fix the failing tests before deployment.')
      
      const failedRequired = this.results.filter(r => !r.success && r.required)
      console.log('\nFailed Required Tests:')
      failedRequired.forEach(test => {
        console.log(`  • ${test.name}`)
      })
    }

    console.log('═'.repeat(60))

    // Exit with appropriate code
    process.exit(requiredFailures > 0 ? 1 : 0)
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner()
  runner.runAllTests().catch(err => {
    console.error('Test runner failed:', err)
    process.exit(1)
  })
}

module.exports = TestRunner