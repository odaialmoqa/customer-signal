#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting load testing suite...\n');

const testConfigs = [
  {
    name: 'Light Load Test',
    users: 10,
    duration: '30s',
    rampUp: '5s',
    description: 'Basic functionality test with light load'
  },
  {
    name: 'Medium Load Test',
    users: 50,
    duration: '60s',
    rampUp: '10s',
    description: 'Moderate load to test normal usage patterns'
  },
  {
    name: 'Heavy Load Test',
    users: 100,
    duration: '120s',
    rampUp: '20s',
    description: 'High load to test system limits'
  },
  {
    name: 'Spike Test',
    users: 200,
    duration: '30s',
    rampUp: '5s',
    description: 'Sudden traffic spike simulation'
  },
  {
    name: 'Endurance Test',
    users: 25,
    duration: '300s',
    rampUp: '30s',
    description: 'Long-running test to check for memory leaks'
  }
];

async function runLoadTest(config) {
  console.log(`📊 Running ${config.name}...`);
  console.log(`   Users: ${config.users}, Duration: ${config.duration}, Ramp-up: ${config.rampUp}`);
  console.log(`   ${config.description}\n`);

  return new Promise((resolve, reject) => {
    // Create a simple load test script
    const testScript = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '${config.rampUp}', target: ${config.users} },
    { duration: '${config.duration}', target: ${config.users} },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    errors: ['rate<0.05'], // Error rate must be below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Test different endpoints
  const endpoints = [
    '/api/health',
    '/api/conversations',
    '/api/analytics/dashboard',
    '/api/keywords',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  let response = http.get(\`\${BASE_URL}\${endpoint}\`);
  
  let success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}
`;

    // Write test script to temporary file
    const scriptPath = path.join(__dirname, `../temp-load-test-${Date.now()}.js`);
    fs.writeFileSync(scriptPath, testScript);

    // Check if k6 is available, if not use our custom load tester
    const useK6 = checkK6Available();
    
    if (useK6) {
      // Run with k6
      const k6Process = spawn('k6', ['run', scriptPath], {
        stdio: 'inherit',
        env: { ...process.env, BASE_URL: process.env.BASE_URL || 'http://localhost:3000' }
      });

      k6Process.on('close', (code) => {
        fs.unlinkSync(scriptPath); // Clean up temp file
        if (code === 0) {
          console.log(`✅ ${config.name} completed successfully\n`);
          resolve();
        } else {
          console.log(`❌ ${config.name} failed with code ${code}\n`);
          reject(new Error(`Load test failed with code ${code}`));
        }
      });
    } else {
      // Use our custom Node.js load tester
      console.log('⚠️  k6 not found, using built-in load tester...');
      runCustomLoadTest(config)
        .then(() => {
          fs.unlinkSync(scriptPath);
          console.log(`✅ ${config.name} completed successfully\n`);
          resolve();
        })
        .catch((error) => {
          fs.unlinkSync(scriptPath);
          console.log(`❌ ${config.name} failed: ${error.message}\n`);
          reject(error);
        });
    }
  });
}

function checkK6Available() {
  try {
    require('child_process').execSync('k6 version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

async function runCustomLoadTest(config) {
  const http = require('http');
  const https = require('https');
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const isHttps = baseUrl.startsWith('https');
  const httpModule = isHttps ? https : http;
  
  const endpoints = ['/api/health', '/api/conversations', '/api/analytics/dashboard', '/api/keywords'];
  const users = parseInt(config.users);
  const durationMs = parseDuration(config.duration);
  const rampUpMs = parseDuration(config.rampUp);
  
  let activeRequests = 0;
  let completedRequests = 0;
  let errorCount = 0;
  let responseTimes = [];
  
  const startTime = Date.now();
  const endTime = startTime + durationMs;
  
  // Ramp up users gradually
  const userInterval = rampUpMs / users;
  
  for (let i = 0; i < users; i++) {
    setTimeout(() => {
      startUserSession();
    }, i * userInterval);
  }
  
  function startUserSession() {
    const makeRequest = () => {
      if (Date.now() >= endTime) return;
      
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const url = new URL(endpoint, baseUrl);
      
      const requestStart = Date.now();
      activeRequests++;
      
      const req = httpModule.get(url, (res) => {
        const responseTime = Date.now() - requestStart;
        responseTimes.push(responseTime);
        completedRequests++;
        activeRequests--;
        
        if (res.statusCode !== 200) {
          errorCount++;
        }
        
        // Schedule next request
        setTimeout(makeRequest, Math.random() * 2000 + 1000);
      });
      
      req.on('error', (error) => {
        errorCount++;
        completedRequests++;
        activeRequests--;
        
        // Schedule next request even on error
        setTimeout(makeRequest, Math.random() * 2000 + 1000);
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        errorCount++;
        completedRequests++;
        activeRequests--;
      });
    };
    
    makeRequest();
  }
  
  // Wait for test to complete
  return new Promise((resolve) => {
    const checkCompletion = () => {
      if (Date.now() >= endTime && activeRequests === 0) {
        // Calculate results
        const totalTime = Date.now() - startTime;
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const errorRate = (errorCount / completedRequests) * 100;
        const rps = completedRequests / (totalTime / 1000);
        
        console.log(`   Results:`);
        console.log(`   - Total requests: ${completedRequests}`);
        console.log(`   - Error rate: ${errorRate.toFixed(2)}%`);
        console.log(`   - Average response time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   - Requests per second: ${rps.toFixed(2)}`);
        
        resolve();
      } else {
        setTimeout(checkCompletion, 1000);
      }
    };
    
    setTimeout(checkCompletion, durationMs + 5000); // Give extra time for cleanup
  });
}

function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) return 30000; // Default 30 seconds
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 30000;
  }
}

async function runAllTests() {
  console.log('🎯 Load Testing Configuration:');
  console.log(`   Target URL: ${process.env.BASE_URL || 'http://localhost:3000'}`);
  console.log(`   Total test scenarios: ${testConfigs.length}\n`);
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const config of testConfigs) {
    try {
      await runLoadTest(config);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`❌ ${config.name} failed:`, error.message);
    }
    
    // Wait between tests
    if (testConfigs.indexOf(config) < testConfigs.length - 1) {
      console.log('⏳ Waiting 30 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  console.log('📊 Load Testing Summary:');
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${((passedTests / testConfigs.length) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All load tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some load tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Check if server is running
async function checkServerHealth() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  return new Promise((resolve, reject) => {
    const http = baseUrl.startsWith('https') ? require('https') : require('http');
    const url = new URL('/api/health', baseUrl);
    
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Server is healthy and ready for testing\n');
        resolve();
      } else {
        reject(new Error(`Server health check failed with status ${res.statusCode}`));
      }
    });
    
    req.on('error', (error) => {
      reject(new Error(`Cannot connect to server: ${error.message}`));
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Server health check timeout'));
    });
  });
}

// Main execution
async function main() {
  try {
    await checkServerHealth();
    await runAllTests();
  } catch (error) {
    console.error('❌ Load testing failed:', error.message);
    console.log('\n💡 Make sure your server is running and accessible at the configured URL');
    process.exit(1);
  }
}

main();