import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for stress testing
export let errorRate = new Rate('errors');
export let connectionErrors = new Counter('connection_errors');
export let timeoutErrors = new Counter('timeout_errors');
export let rideRequestDuration = new Trend('ride_request_duration');
export let locationUpdateDuration = new Trend('location_update_duration');
export let concurrentUsers = new Counter('concurrent_users');

// Stress test configuration
export let options = {
  stages: [
    // Gradual ramp-up
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 500 },
    // Sustained high load
    { duration: '5m', target: 500 },
    // Spike test
    { duration: '1m', target: 1000 },
    { duration: '2m', target: 500 },
    // Ramp down
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // Relaxed thresholds for stress test
    http_req_failed: ['rate<0.15'], // Allow up to 15% error rate
    errors: ['rate<0.15'],
    ride_request_duration: ['p(95)<8000'],
    location_update_duration: ['p(95)<5000'],
  },
  // Increase timeouts for stress test
  http_req_timeout: '30s',
  http_req_duration: '30s',
};

// Configuration
const CONVEX_URL = __ENV.CONVEX_URL || 'https://your-convex-deployment.convex.cloud';
const API_KEY = __ENV.API_KEY || 'your-api-key-here';

// Helper functions
function getRandomCoordinates() {
  const cities = [
    { lat: -26.2041, lng: 28.0473 }, // Johannesburg
    { lat: -33.9249, lng: 18.4241 }, // Cape Town
    { lat: -29.8587, lng: 31.0218 }, // Durban
  ];
  const city = cities[Math.floor(Math.random() * cities.length)];
  return {
    lat: city.lat + (Math.random() - 0.5) * 0.2,
    lng: city.lng + (Math.random() - 0.5) * 0.2,
  };
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };
}

// Stress test scenarios
export default function () {
  const scenario = Math.random();
  
  if (scenario < 0.5) {
    // 50% - High-frequency location updates
    testHighFrequencyLocationUpdates();
  } else if (scenario < 0.8) {
    // 30% - Concurrent ride requests
    testConcurrentRideRequests();
  } else {
    // 20% - Driver matching under load
    testDriverMatchingUnderLoad();
  }
  
  // Reduced sleep time for stress test
  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5 seconds
}

function testHighFrequencyLocationUpdates() {
  const coords = getRandomCoordinates();
  const userId = `driver_${Math.random().toString(36).substr(2, 9)}`;
  
  // Send multiple rapid location updates
  for (let i = 0; i < 3; i++) {
    const payload = JSON.stringify({
      userId: userId,
      latitude: coords.lat + (Math.random() - 0.5) * 0.001,
      longitude: coords.lng + (Math.random() - 0.5) * 0.001,
      role: 'driver',
    });

    const params = {
      headers: getHeaders(),
      tags: { endpoint: 'location_update', test_type: 'stress' },
      timeout: '10s',
    };

    const response = http.post(`${CONVEX_URL}/api/updateUserLocation`, payload, params);
    
    const success = check(response, {
      'location update status is 200': (r) => r.status === 200,
      'location update response time < 5s': (r) => r.timings.duration < 5000,
    });

    if (!success) {
      if (response.status === 0) {
        connectionErrors.add(1);
      } else if (response.timings.duration > 10000) {
        timeoutErrors.add(1);
      }
    }

    errorRate.add(!success);
    locationUpdateDuration.add(response.timings.duration);
    
    // Very short sleep between rapid updates
    sleep(0.1);
  }
}

function testConcurrentRideRequests() {
  const coords = getRandomCoordinates();
  const payload = JSON.stringify({
    passengerId: `user_${Math.random().toString(36).substr(2, 9)}`,
    driverId: `driver_${Math.random().toString(36).substr(2, 9)}`,
    startLocation: {
      coordinates: {
        latitude: coords.lat,
        longitude: coords.lng,
      },
      address: `Test Address ${Math.random().toString(36).substr(2, 9)}`,
    },
    endLocation: {
      coordinates: {
        latitude: coords.lat + (Math.random() - 0.5) * 0.1,
        longitude: coords.lng + (Math.random() - 0.5) * 0.1,
      },
      address: `Test Destination ${Math.random().toString(36).substr(2, 9)}`,
    },
    estimatedFare: Math.random() * 35 + 15,
    estimatedDistance: Math.random() * 18 + 2,
  });

  const params = {
    headers: getHeaders(),
    tags: { endpoint: 'ride_request', test_type: 'stress' },
    timeout: '15s',
  };

  const response = http.post(`${CONVEX_URL}/api/requestRide`, payload, params);
  
  const success = check(response, {
    'ride request status is 200': (r) => r.status === 200,
    'ride request response time < 8s': (r) => r.timings.duration < 8000,
  });

  if (!success) {
    if (response.status === 0) {
      connectionErrors.add(1);
    } else if (response.timings.duration > 15000) {
      timeoutErrors.add(1);
    }
  }

  errorRate.add(!success);
  rideRequestDuration.add(response.timings.duration);
}

function testDriverMatchingUnderLoad() {
  const coords = getRandomCoordinates();
  const params = {
    headers: getHeaders(),
    tags: { endpoint: 'driver_matching', test_type: 'stress' },
    timeout: '10s',
  };

  const response = http.get(
    `${CONVEX_URL}/api/getNearbyDrivers?latitude=${coords.lat}&longitude=${coords.lng}&radiusKm=${Math.random() * 10 + 1}`,
    params
  );
  
  const success = check(response, {
    'driver matching status is 200': (r) => r.status === 200,
    'driver matching response time < 6s': (r) => r.timings.duration < 6000,
  });

  if (!success) {
    if (response.status === 0) {
      connectionErrors.add(1);
    } else if (response.timings.duration > 10000) {
      timeoutErrors.add(1);
    }
  }

  errorRate.add(!success);
}

// Setup function
export function setup() {
  console.log('Setting up TaxiTap stress test...');
  console.log(`Target URL: ${CONVEX_URL}`);
  console.log('Stress test will gradually increase load up to 1000 concurrent users');
  
  // Verify API connectivity with timeout
  const healthCheck = http.get(`${CONVEX_URL}/health`, {
    headers: getHeaders(),
    timeout: '30s',
  });
  
  if (healthCheck.status !== 200) {
    console.warn('Health check failed, but continuing with stress test...');
  }
  
  return { startTime: Date.now() };
}

// Teardown function
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Stress test completed in ${duration}ms`);
  console.log('Stress test summary:');
  console.log(`- Total requests: ${__ENV.VU * __ENV.ITER || 'N/A'}`);
  console.log(`- Error rate: ${(errorRate.rate * 100 || 0).toFixed(2)}%`);
  console.log(`- Connection errors: ${connectionErrors.count || 0}`);
  console.log(`- Timeout errors: ${timeoutErrors.count || 0}`);
}

// Custom summary function
export function handleSummary(data) {
  return {
    'stress_test_summary.json': JSON.stringify(data, null, 2),
    'stress_test_report.html': generateStressTestReport(data),
  };
}

function generateStressTestReport(data) {
  const errorRatePercent = (data.metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2);
  const avgResponseTime = data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A';
  const p95ResponseTime = data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TaxiTap Stress Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .threshold { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TaxiTap Stress Test Report</h1>
        <p>High-load performance testing results</p>
      </div>
      
      <div class="metric">
        <h3>Test Overview</h3>
        <p><strong>Duration:</strong> ${data.metrics.iteration_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
        <p><strong>Total Requests:</strong> ${data.metrics.http_reqs?.values?.count || 'N/A'}</p>
        <p><strong>Peak Concurrent Users:</strong> ${data.metrics.vus?.values?.max || 'N/A'}</p>
        <p><strong>Error Rate:</strong> <span class="${errorRatePercent < 5 ? 'success' : errorRatePercent < 15 ? 'warning' : 'error'}">${errorRatePercent}%</span></p>
      </div>
      
      <div class="metric">
        <h3>Response Time Analysis</h3>
        <p><strong>Average Response Time:</strong> ${avgResponseTime}ms</p>
        <p><strong>P95 Response Time:</strong> <span class="${p95ResponseTime < 5000 ? 'success' : p95ResponseTime < 10000 ? 'warning' : 'error'}">${p95ResponseTime}ms</span></p>
        <p><strong>P99 Response Time:</strong> ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'}ms</p>
        <p><strong>Max Response Time:</strong> ${data.metrics.http_req_duration?.values?.max?.toFixed(2) || 'N/A'}ms</p>
      </div>
      
      <div class="metric">
        <h3>Error Analysis</h3>
        <p><strong>Connection Errors:</strong> ${data.metrics.connection_errors?.values?.count || 0}</p>
        <p><strong>Timeout Errors:</strong> ${data.metrics.timeout_errors?.values?.count || 0}</p>
        <p><strong>HTTP 4xx Errors:</strong> ${data.metrics.http_req_failed?.values?.count || 0}</p>
        <p><strong>HTTP 5xx Errors:</strong> ${data.metrics.http_req_failed?.values?.count || 0}</p>
      </div>
      
      <div class="metric">
        <h3>Custom Metrics</h3>
        <p><strong>Ride Request Duration:</strong> ${data.metrics.ride_request_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
        <p><strong>Location Update Duration:</strong> ${data.metrics.location_update_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
      </div>
      
      <div class="metric">
        <h3>Thresholds Status</h3>
        <p class="threshold">P95 Response Time < 10s: <span class="${p95ResponseTime < 10000 ? 'success' : 'error'}">${p95ResponseTime < 10000 ? 'PASS' : 'FAIL'}</span></p>
        <p class="threshold">Error Rate < 15%: <span class="${errorRatePercent < 15 ? 'success' : 'error'}">${errorRatePercent < 15 ? 'PASS' : 'FAIL'}</span></p>
      </div>
    </body>
    </html>
  `;
}
