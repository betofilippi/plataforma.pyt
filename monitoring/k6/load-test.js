import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must be below 2s
    http_req_failed: ['rate<0.05'], // Error rate must be below 5%
    errors: ['rate<0.1'], // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://plataforma.app';
const API_URL = __ENV.API_URL || 'https://plataforma.app/api';

// Test scenarios
const scenarios = [
  'homepage',
  'api_health',
  'login',
  'dashboard',
  'modules',
  'database_query'
];

export default function () {
  // Randomly select a scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  switch (scenario) {
    case 'homepage':
      testHomepage();
      break;
    case 'api_health':
      testApiHealth();
      break;
    case 'login':
      testLogin();
      break;
    case 'dashboard':
      testDashboard();
      break;
    case 'modules':
      testModules();
      break;
    case 'database_query':
      testDatabaseQuery();
      break;
  }

  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}

function testHomepage() {
  const response = http.get(BASE_URL);
  
  const success = check(response, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage contains title': (r) => r.body.includes('Plataforma'),
    'homepage loads in reasonable time': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);
}

function testApiHealth() {
  const response = http.get(`${API_URL}/health`);
  
  const success = check(response, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health response is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
    'health check is fast': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
}

function testLogin() {
  // Test login flow
  const loginData = {
    email: 'test@example.com',
    password: 'testpassword123'
  };

  const response = http.post(`${API_URL}/auth/login`, JSON.stringify(loginData), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const success = check(response, {
    'login attempt handled': (r) => r.status === 200 || r.status === 401,
    'login response time acceptable': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);
}

function testDashboard() {
  // Simulate authenticated dashboard access
  const headers = {
    'Authorization': 'Bearer dummy-token-for-testing',
    'Content-Type': 'application/json',
  };

  const response = http.get(`${BASE_URL}/dashboard`, { headers });
  
  const success = check(response, {
    'dashboard accessible or redirects': (r) => r.status === 200 || r.status === 302 || r.status === 401,
    'dashboard response time acceptable': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);
}

function testModules() {
  // Test module loading
  const modules = [
    'base_de_dados',
    'inteligencia_artificial',
    'sistema',
    'vendas',
    'estoque'
  ];

  const module = modules[Math.floor(Math.random() * modules.length)];
  const response = http.get(`${API_URL}/modules/${module}`, {
    headers: {
      'Authorization': 'Bearer dummy-token-for-testing',
    },
  });

  const success = check(response, {
    'module endpoint responds': (r) => r.status === 200 || r.status === 401 || r.status === 404,
    'module response time acceptable': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);
}

function testDatabaseQuery() {
  // Test database query endpoint
  const queryData = {
    query: 'SELECT COUNT(*) FROM users',
    schema: 'sistema'
  };

  const response = http.post(`${API_URL}/postgres/query`, JSON.stringify(queryData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dummy-token-for-testing',
    },
  });

  const success = check(response, {
    'database query handled': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    'database query response time': (r) => r.timings.duration < 5000,
  });

  errorRate.add(!success);
}

// Setup and teardown functions
export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  
  // Warmup request
  const warmupResponse = http.get(`${API_URL}/health`);
  if (warmupResponse.status !== 200) {
    console.warn('Warmup request failed, service might not be ready');
  }
}

export function teardown(data) {
  console.log('Load test completed');
  // Could send results to monitoring system here
}

// Handle different test phases
export function handleSummary(data) {
  return {
    'results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, { indent = '', enableColors = false } = {}) {
  const summary = `
${indent}Load Test Summary:
${indent}================
${indent}
${indent}Scenarios: ${data.metrics.iterations.values.count} iterations
${indent}Virtual Users: ${data.metrics.vus_max.values.max} max VUs
${indent}
${indent}Response Times:
${indent}  Average: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
${indent}  95th percentile: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
${indent}  99th percentile: ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms
${indent}
${indent}Success Rate: ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
${indent}Error Rate: ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%
${indent}
${indent}Requests: ${data.metrics.http_reqs.values.count} total
${indent}Data Transferred: ${(data.metrics.data_received.values.count / 1024 / 1024).toFixed(2)} MB received
${indent}
${indent}Thresholds:
${indent}  Response time (95th): ${data.metrics.http_req_duration.thresholds['p(95)<2000'].ok ? '✓ PASS' : '✗ FAIL'}
${indent}  Error rate: ${data.metrics.http_req_failed.thresholds['rate<0.05'].ok ? '✓ PASS' : '✗ FAIL'}
${indent}  Custom errors: ${data.metrics.errors?.thresholds?.['rate<0.1']?.ok !== false ? '✓ PASS' : '✗ FAIL'}
`;
  
  return summary;
}