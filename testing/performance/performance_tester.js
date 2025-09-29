#!/usr/bin/env node

/**
 * TaxiTap Performance Testing Suite
 * Comprehensive performance testing for response times, throughput, and resource utilization
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class TaxiTapPerformanceTester {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;
    this.verbose = options.verbose || false;
    this.results = [];
    this.metrics = {
      responseTimes: [],
      throughput: [],
      errorRates: [],
      resourceUsage: []
    };
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const url = new URL(endpoint, this.baseUrl);
    const startTime = performance.now();
    
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TaxiTap-Performance-Tester/1.0',
        ...headers
      },
      timeout: this.timeout
    };

    if (this.apiKey) {
      requestOptions.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(url, requestOptions, (res) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            responseTime: responseTime,
            startTime: startTime,
            endTime: endTime
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        reject({
          error: error.message,
          responseTime: endTime - startTime,
          startTime: startTime,
          endTime: endTime
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        reject({
          error: 'Request timeout',
          responseTime: endTime - startTime,
          startTime: startTime,
          endTime: endTime
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async testResponseTime(endpoint, method = 'GET', data = null, iterations = 100) {
    this.log(`Testing response time for ${method} ${endpoint} (${iterations} iterations)`);
    
    const responseTimes = [];
    const errors = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const response = await this.makeRequest(method, endpoint, data);
        responseTimes.push(response.responseTime);
        
        if (response.statusCode >= 400) {
          errors.push({
            statusCode: response.statusCode,
            iteration: i,
            responseTime: response.responseTime
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        errors.push({
          error: error.error,
          iteration: i,
          responseTime: error.responseTime
        });
      }
    }
    
    const stats = this.calculateStats(responseTimes);
    const errorRate = (errors.length / iterations) * 100;
    
    const result = {
      endpoint,
      method,
      iterations,
      stats,
      errorRate,
      errors: errors.slice(0, 5), // Keep first 5 errors for analysis
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    this.metrics.responseTimes.push(...responseTimes);
    
    this.log(`Response time stats: P50=${stats.p50.toFixed(2)}ms, P95=${stats.p95.toFixed(2)}ms, P99=${stats.p99.toFixed(2)}ms, Error rate=${errorRate.toFixed(2)}%`);
    
    return result;
  }

  async testThroughput(endpoint, method = 'GET', data = null, duration = 60000, concurrency = 10) {
    this.log(`Testing throughput for ${method} ${endpoint} (${duration}ms duration, ${concurrency} concurrent)`);
    
    const startTime = performance.now();
    const endTime = startTime + duration;
    const requests = [];
    const errors = [];
    
    const makeConcurrentRequest = async () => {
      while (performance.now() < endTime) {
        try {
          const response = await this.makeRequest(method, endpoint, data);
          requests.push({
            responseTime: response.responseTime,
            statusCode: response.statusCode,
            timestamp: performance.now()
          });
          
          if (response.statusCode >= 400) {
            errors.push({
              statusCode: response.statusCode,
              responseTime: response.responseTime
            });
          }
          
        } catch (error) {
          errors.push({
            error: error.error,
            responseTime: error.responseTime
          });
        }
      }
    };
    
    // Start concurrent requests
    const promises = Array(concurrency).fill().map(() => makeConcurrentRequest());
    await Promise.all(promises);
    
    const actualDuration = performance.now() - startTime;
    const totalRequests = requests.length;
    const requestsPerSecond = (totalRequests / actualDuration) * 1000;
    const errorRate = (errors.length / totalRequests) * 100;
    
    const responseTimes = requests.map(r => r.responseTime);
    const stats = this.calculateStats(responseTimes);
    
    const result = {
      endpoint,
      method,
      duration: actualDuration,
      concurrency,
      totalRequests,
      requestsPerSecond,
      errorRate,
      stats,
      errors: errors.slice(0, 10), // Keep first 10 errors
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    this.metrics.throughput.push({
      requestsPerSecond,
      timestamp: new Date().toISOString()
    });
    
    this.log(`Throughput: ${requestsPerSecond.toFixed(2)} req/s, Total requests: ${totalRequests}, Error rate: ${errorRate.toFixed(2)}%`);
    
    return result;
  }

  async testLoadProgression(endpoint, method = 'GET', data = null, maxConcurrency = 50, step = 5) {
    this.log(`Testing load progression for ${method} ${endpoint} (max concurrency: ${maxConcurrency})`);
    
    const progressionResults = [];
    
    for (let concurrency = step; concurrency <= maxConcurrency; concurrency += step) {
      this.log(`Testing with ${concurrency} concurrent users`);
      
      const result = await this.testThroughput(endpoint, method, data, 30000, concurrency);
      progressionResults.push({
        concurrency,
        ...result
      });
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    const result = {
      endpoint,
      method,
      progressionResults,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    return result;
  }

  async testMemoryUsage(endpoint, method = 'GET', data = null, iterations = 1000) {
    this.log(`Testing memory usage for ${method} ${endpoint} (${iterations} iterations)`);
    
    const initialMemory = process.memoryUsage();
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const response = await this.makeRequest(method, endpoint, data);
        const currentMemory = process.memoryUsage();
        
        memorySnapshots.push({
          iteration: i,
          heapUsed: currentMemory.heapUsed,
          heapTotal: currentMemory.heapTotal,
          external: currentMemory.external,
          responseTime: response.responseTime
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        this.log(`Error in iteration ${i}: ${error.error}`, 'ERROR');
      }
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    const result = {
      endpoint,
      method,
      iterations,
      initialMemory,
      finalMemory,
      memoryIncrease,
      memorySnapshots: memorySnapshots.slice(0, 100), // Keep first 100 snapshots
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    this.metrics.resourceUsage.push({
      memoryIncrease,
      timestamp: new Date().toISOString()
    });
    
    this.log(`Memory usage: Initial=${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final=${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase=${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    
    return result;
  }

  async testDatabasePerformance() {
    this.log('Testing database performance');
    
    const dbTests = [
      {
        name: 'User Lookup',
        endpoint: '/api/getUserProfile',
        method: 'GET',
        data: { userId: 'test_user_id' }
      },
      {
        name: 'Ride History',
        endpoint: '/api/getRideHistory',
        method: 'GET',
        data: { userId: 'test_user_id', limit: 100 }
      },
      {
        name: 'Driver Search',
        endpoint: '/api/getNearbyDrivers',
        method: 'GET',
        data: { latitude: -26.2041, longitude: 28.0473, radiusKm: 5 }
      },
      {
        name: 'Location Update',
        endpoint: '/api/updateUserLocation',
        method: 'POST',
        data: {
          userId: 'test_user_id',
          latitude: -26.2041,
          longitude: 28.0473,
          role: 'driver'
        }
      }
    ];
    
    const dbResults = [];
    
    for (const test of dbTests) {
      this.log(`Testing database operation: ${test.name}`);
      
      const result = await this.testResponseTime(test.endpoint, test.method, test.data, 50);
      dbResults.push({
        operation: test.name,
        ...result
      });
    }
    
    const result = {
      testType: 'database_performance',
      operations: dbResults,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    return result;
  }

  async testRealTimePerformance() {
    this.log('Testing real-time performance');
    
    const realTimeTests = [
      {
        name: 'WebSocket Connection',
        endpoint: '/ws',
        method: 'GET'
      },
      {
        name: 'Location Streaming',
        endpoint: '/api/streamLocation',
        method: 'GET'
      },
      {
        name: 'Ride Updates',
        endpoint: '/api/streamRideUpdates',
        method: 'GET'
      }
    ];
    
    const realTimeResults = [];
    
    for (const test of realTimeTests) {
      this.log(`Testing real-time operation: ${test.name}`);
      
      try {
        const result = await this.testResponseTime(test.endpoint, test.method, null, 20);
        realTimeResults.push({
          operation: test.name,
          ...result
        });
      } catch (error) {
        this.log(`Real-time test failed for ${test.name}: ${error.error}`, 'WARN');
        realTimeResults.push({
          operation: test.name,
          error: error.error,
          status: 'failed'
        });
      }
    }
    
    const result = {
      testType: 'realtime_performance',
      operations: realTimeResults,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    return result;
  }

  calculateStats(values) {
    if (values.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    
    const sorted = values.sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      min: sorted[0],
      max: sorted[len - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / len,
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }

  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      target: this.baseUrl,
      totalTests: this.results.length,
      summary: this.generateSummary(),
      detailedResults: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateSummary() {
    const allResponseTimes = this.metrics.responseTimes;
    const allThroughput = this.metrics.throughput;
    const allErrorRates = this.results.map(r => r.errorRate || 0);
    
    return {
      responseTime: this.calculateStats(allResponseTimes),
      averageThroughput: allThroughput.length > 0 ? 
        allThroughput.reduce((sum, t) => sum + t.requestsPerSecond, 0) / allThroughput.length : 0,
      averageErrorRate: allErrorRates.length > 0 ?
        allErrorRates.reduce((sum, rate) => sum + rate, 0) / allErrorRates.length : 0,
      totalRequests: allResponseTimes.length,
      testDuration: this.results.length > 0 ? 
        new Date(this.results[this.results.length - 1].timestamp) - new Date(this.results[0].timestamp) : 0
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const summary = this.generateSummary();
    
    // Response time recommendations
    if (summary.responseTime.p95 > 3000) {
      recommendations.push({
        category: 'Response Time',
        priority: 'HIGH',
        issue: 'P95 response time exceeds 3 seconds',
        recommendation: 'Optimize database queries and implement caching',
        details: `Current P95: ${summary.responseTime.p95.toFixed(2)}ms`
      });
    }
    
    if (summary.responseTime.p99 > 5000) {
      recommendations.push({
        category: 'Response Time',
        priority: 'CRITICAL',
        issue: 'P99 response time exceeds 5 seconds',
        recommendation: 'Implement database indexing and query optimization',
        details: `Current P99: ${summary.responseTime.p99.toFixed(2)}ms`
      });
    }
    
    // Throughput recommendations
    if (summary.averageThroughput < 100) {
      recommendations.push({
        category: 'Throughput',
        priority: 'MEDIUM',
        issue: 'Low throughput detected',
        recommendation: 'Scale infrastructure and optimize application performance',
        details: `Current throughput: ${summary.averageThroughput.toFixed(2)} req/s`
      });
    }
    
    // Error rate recommendations
    if (summary.averageErrorRate > 5) {
      recommendations.push({
        category: 'Reliability',
        priority: 'HIGH',
        issue: 'High error rate detected',
        recommendation: 'Investigate and fix error sources',
        details: `Current error rate: ${summary.averageErrorRate.toFixed(2)}%`
      });
    }
    
    return recommendations;
  }

  async runComprehensiveTests() {
    this.log('🚀 Starting TaxiTap Performance Testing Suite');
    this.log(`Target: ${this.baseUrl}`);
    
    const startTime = performance.now();
    
    // Test core API endpoints
    const coreEndpoints = [
      { endpoint: '/api/requestRide', method: 'POST', data: { passengerId: 'test', startLocation: { lat: -26.2041, lng: 28.0473 } } },
      { endpoint: '/api/updateUserLocation', method: 'POST', data: { userId: 'test', latitude: -26.2041, longitude: 28.0473 } },
      { endpoint: '/api/getNearbyDrivers', method: 'GET', data: { latitude: -26.2041, longitude: 28.0473 } },
      { endpoint: '/api/acceptRide', method: 'POST', data: { rideId: 'test', driverId: 'test' } }
    ];
    
    for (const test of coreEndpoints) {
      await this.testResponseTime(test.endpoint, test.method, test.data, 100);
      await this.testThroughput(test.endpoint, test.method, test.data, 30000, 10);
    }
    
    // Test database performance
    await this.testDatabasePerformance();
    
    // Test real-time performance
    await this.testRealTimePerformance();
    
    // Test load progression
    await this.testLoadProgression('/api/requestRide', 'POST', { passengerId: 'test', startLocation: { lat: -26.2041, lng: 28.0473 } }, 30, 5);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.log(`✅ Performance testing completed in ${(duration / 1000).toFixed(2)} seconds`);
    
    // Generate report
    const report = this.generatePerformanceReport();
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = `performance_test_report_${timestamp}.json`;
    
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    
    this.log(`📄 Performance report saved: ${reportFilename}`);
    
    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node performance_tester.js <base_url> [options]');
    console.log('Options:');
    console.log('  --api-key <key>     API key for authenticated requests');
    console.log('  --timeout <ms>      Request timeout in milliseconds (default: 30000)');
    console.log('  --verbose           Enable verbose logging');
    process.exit(1);
  }
  
  const baseUrl = args[0];
  const options = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--api-key' && i + 1 < args.length) {
      options.apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--timeout' && i + 1 < args.length) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--verbose') {
      options.verbose = true;
    }
  }
  
  const tester = new TaxiTapPerformanceTester(baseUrl, options);
  
  try {
    const report = await tester.runComprehensiveTests();
    
    // Print summary
    console.log('\n📊 Performance Test Summary:');
    console.log(`  Total Tests: ${report.totalTests}`);
    console.log(`  P95 Response Time: ${report.summary.responseTime.p95.toFixed(2)}ms`);
    console.log(`  Average Throughput: ${report.summary.averageThroughput.toFixed(2)} req/s`);
    console.log(`  Average Error Rate: ${report.summary.averageErrorRate.toFixed(2)}%`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  [${rec.priority}] ${rec.category}: ${rec.recommendation}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TaxiTapPerformanceTester;
