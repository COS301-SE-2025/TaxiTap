import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
export let errorRate = new Rate('errors');
export let rideRequestDuration = new Trend('ride_request_duration');
export let locationUpdateDuration = new Trend('location_update_duration');
export let driverMatchingDuration = new Trend('driver_matching_duration');

// Test configuration
export let options = {
  stages: [
    // Warm-up phase
    { duration: '2m', target: 10 },
    // Peak load phase
    { duration: '5m', target: 50 },
    // Sustained load phase
    { duration: '10m', target: 30 },
    // Ramp down phase
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests must complete below 5s
    http_req_failed: ['rate<0.05'], // Error rate must be below 5%
    errors: ['rate<0.05'],
    ride_request_duration: ['p(95)<3000'],
    location_update_duration: ['p(95)<2000'],
    driver_matching_duration: ['p(95)<4000'],
  },
};

// Test data
const testData = new SharedArray('test_data', function () {
  return [
    {
      passengerId: 'user_001',
      driverId: 'driver_001',
      startLocation: { lat: -26.2041, lng: 28.0473, address: 'Sandton City, Johannesburg' },
      endLocation: { lat: -26.1715, lng: 28.0473, address: 'Rosebank, Johannesburg' },
    },
    {
      passengerId: 'user_002',
      driverId: 'driver_002',
      startLocation: { lat: -33.9249, lng: 18.4241, address: 'V&A Waterfront, Cape Town' },
      endLocation: { lat: -33.9180, lng: 18.4241, address: 'Green Point, Cape Town' },
    },
    {
      passengerId: 'user_003',
      driverId: 'driver_003',
      startLocation: { lat: -29.8587, lng: 31.0218, address: 'Gateway Theatre, Durban' },
      endLocation: { lat: -29.8587, lng: 31.0218, address: 'Umhlanga, Durban' },
    },
  ];
});

// Configuration
const CONVEX_URL = __ENV.CONVEX_URL || 'https://your-convex-deployment.convex.cloud';
const API_KEY = __ENV.API_KEY || 'your-api-key-here';

// Helper functions
function getRandomTestData() {
  return testData[Math.floor(Math.random() * testData.length)];
}

function getRandomCoordinates() {
  const cities = [
    { lat: -26.2041, lng: 28.0473 }, // Johannesburg
    { lat: -33.9249, lng: 18.4241 }, // Cape Town
    { lat: -29.8587, lng: 31.0218 }, // Durban
  ];
  const city = cities[Math.floor(Math.random() * cities.length)];
  return {
    lat: city.lat + (Math.random() - 0.5) * 0.1,
    lng: city.lng + (Math.random() - 0.5) * 0.1,
  };
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };
}

// Test scenarios
export default function () {
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Ride requests
    testRideRequest();
  } else if (scenario < 0.7) {
    // 30% - Location updates
    testLocationUpdate();
  } else {
    // 30% - Driver matching queries
    testDriverMatching();
  }
  
  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

function testRideRequest() {
  const data = getRandomTestData();
  const payload = JSON.stringify({
    passengerId: data.passengerId,
    driverId: data.driverId,
    startLocation: {
      coordinates: {
        latitude: data.startLocation.lat,
        longitude: data.startLocation.lng,
      },
      address: data.startLocation.address,
    },
    endLocation: {
      coordinates: {
        latitude: data.endLocation.lat,
        longitude: data.endLocation.lng,
      },
      address: data.endLocation.address,
    },
    estimatedFare: Math.random() * 35 + 15, // R15-R50
    estimatedDistance: Math.random() * 18 + 2, // 2-20km
  });

  const params = {
    headers: getHeaders(),
    tags: { endpoint: 'ride_request' },
  };

  const response = http.post(`${CONVEX_URL}/api/requestRide`, payload, params);
  
  const success = check(response, {
    'ride request status is 200': (r) => r.status === 200,
    'ride request response time < 3s': (r) => r.timings.duration < 3000,
    'ride request has rideId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.rideId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
  rideRequestDuration.add(response.timings.duration);
}

function testLocationUpdate() {
  const coords = getRandomCoordinates();
  const payload = JSON.stringify({
    userId: `driver_${Math.random().toString(36).substr(2, 9)}`,
    latitude: coords.lat,
    longitude: coords.lng,
    role: 'driver',
  });

  const params = {
    headers: getHeaders(),
    tags: { endpoint: 'location_update' },
  };

  const response = http.post(`${CONVEX_URL}/api/updateUserLocation`, payload, params);
  
  const success = check(response, {
    'location update status is 200': (r) => r.status === 200,
    'location update response time < 2s': (r) => r.timings.duration < 2000,
    'location update successful': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true || body.success === undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
  locationUpdateDuration.add(response.timings.duration);
}

function testDriverMatching() {
  const coords = getRandomCoordinates();
  const params = {
    headers: getHeaders(),
    tags: { endpoint: 'driver_matching' },
  };

  const response = http.get(
    `${CONVEX_URL}/api/getNearbyDrivers?latitude=${coords.lat}&longitude=${coords.lng}&radiusKm=5`,
    params
  );
  
  const success = check(response, {
    'driver matching status is 200': (r) => r.status === 200,
    'driver matching response time < 4s': (r) => r.timings.duration < 4000,
    'driver matching returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
  driverMatchingDuration.add(response.timings.duration);
}

// Setup function (runs once before the test)
export function setup() {
  console.log('Setting up TaxiTap load test...');
  console.log(`Target URL: ${CONVEX_URL}`);
  console.log(`Test data entries: ${testData.length}`);
  
  // Verify API connectivity
  const healthCheck = http.get(`${CONVEX_URL}/health`, {
    headers: getHeaders(),
    timeout: '10s',
  });
  
  if (healthCheck.status !== 200) {
    console.warn('Health check failed, but continuing with test...');
  }
  
  return { startTime: Date.now() };
}

// Teardown function (runs once after the test)
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Test completed in ${duration}ms`);
  console.log('Test summary:');
  console.log(`- Total requests: ${__ENV.VU * __ENV.ITER || 'N/A'}`);
  console.log(`- Error rate: ${errorRate.rate || 'N/A'}`);
}

// Custom summary function
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    'summary.html': generateHTMLReport(data),
  };
}

function generateHTMLReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TaxiTap Load Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>TaxiTap Load Test Report</h1>
      <div class="metric">
        <h3>Test Summary</h3>
        <p>Duration: ${data.metrics.iteration_duration?.values?.avg || 'N/A'}ms</p>
        <p>Total Requests: ${data.metrics.http_reqs?.values?.count || 'N/A'}</p>
        <p>Error Rate: ${(data.metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2)}%</p>
      </div>
      <div class="metric">
        <h3>Response Times</h3>
        <p>Average: ${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
        <p>P95: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms</p>
        <p>P99: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'}ms</p>
      </div>
      <div class="metric">
        <h3>Custom Metrics</h3>
        <p>Ride Request Duration: ${data.metrics.ride_request_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
        <p>Location Update Duration: ${data.metrics.location_update_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
        <p>Driver Matching Duration: ${data.metrics.driver_matching_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
      </div>
    </body>
    </html>
  `;
}
