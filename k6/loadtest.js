import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for detailed monitoring
export let errorRate = new Rate('errors');
export let dbInsertLatency = new Trend('db_insert_latency');
export let healthCheckLatency = new Trend('health_check_latency');
export let getDataLatency = new Trend('get_data_latency');

// Test configuration - Graduated load pattern
export let options = {
  stages: [
    { duration: '30s', target: 5 },    // Warm up: 0 → 5 users
    { duration: '1m', target: 10 },    // Ramp up: 5 → 10 users
    { duration: '2m', target: 10 },    // Stay at 10 users
    { duration: '1m', target: 20 },    // Ramp up: 10 → 20 users
    { duration: '3m', target: 20 },    // Stay at 20 users (peak load)
    { duration: '1m', target: 30 },    // Stress test: 20 → 30 users
    { duration: '2m', target: 30 },    // Stress sustain: 30 users
    { duration: '1m', target: 0 },     // Ramp down: 30 → 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],     // 95% of requests under 3s
    'http_req_failed': ['rate<0.1'],          // Error rate under 10%
    'errors': ['rate<0.15'],                  // Custom error rate under 15%
    'db_insert_latency': ['p(90)<2000'],     // 90% of DB inserts under 2s
    'health_check_latency': ['p(95)<500'],   // 95% of health checks under 500ms
  },
};

// Configuration - REPLACE WITH YOUR EC2 PUBLIC IP
const BASE_URL = __ENV.TARGET_URL || 'http://54.255.208.1:3000';

// Sample data for realistic POST requests
const sampleUsers = [
  { name: 'Alice Johnson', email: 'alice@loadtest.com', message: 'Testing application performance under load' },
  { name: 'Bob Smith', email: 'bob@loadtest.com', message: 'Monitoring database response times during stress test' },
  { name: 'Carol Davis', email: 'carol@loadtest.com', message: 'Evaluating system scalability with k6 load testing' },
  { name: 'David Wilson', email: 'david@loadtest.com', message: 'Measuring API latency under concurrent users' },
  { name: 'Emma Brown', email: 'emma@loadtest.com', message: 'Performance testing Node.js application endpoints' },
  { name: 'Frank Miller', email: 'frank@loadtest.com', message: 'Load testing database connection pooling' },
  { name: 'Grace Lee', email: 'grace@loadtest.com', message: 'Stress testing application memory usage' },
  { name: 'Henry Taylor', email: 'henry@loadtest.com', message: 'Monitoring CPU utilization during peak load' },
  { name: 'Ivy Chen', email: 'ivy@loadtest.com', message: 'Testing network throughput under load' },
  { name: 'Jack Davis', email: 'jack@loadtest.com', message: 'Evaluating error rates during stress conditions' },
];

// Main load testing function
export default function() {
  // Weighted distribution of different request types
  let scenario = Math.random();
  
  if (scenario < 0.2) {
    // 20% - Health check requests (lightweight)
    healthCheck();
  } else if (scenario < 0.5) {
    // 30% - GET data requests (medium load)
    getData();
  } else {
    // 50% - POST data requests (heavy load - database writes)
    postData();
  }
  
  // Random think time between 500ms to 2 seconds
  sleep(Math.random() * 1.5 + 0.5);
}

// Health check endpoint testing
function healthCheck() {
  let response = http.get(`${BASE_URL}/health`);
  
  let result = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 1000ms': (r) => r.timings.duration < 1000,
    'health check has status field': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.status === 'healthy';
      } catch (e) {
        return false;
      }
    },
    'health check has uptime': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.uptime !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!result);
  healthCheckLatency.add(response.timings.duration);
}

// GET data endpoint testing
function getData() {
  let response = http.get(`${BASE_URL}/data`);
  
  let result = check(response, {
    'get data status is 200': (r) => r.status === 200,
    'get data response time < 2000ms': (r) => r.timings.duration < 2000,
    'get data returns success': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'get data returns array': (r) => {
      try {
        let body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
    'get data has count field': (r) => {
      try {
        let body = JSON.parse(r.body);
        return typeof body.count === 'number';
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!result);
  getDataLatency.add(response.timings.duration);
}

// POST data endpoint testing (most intensive)
function postData() {
  const startTime = Date.now();
  
  // Select random user data and make it unique
  let userData = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
  userData = {
    ...userData,
    email: `${userData.email.split('@')[0]}_${Date.now()}@${userData.email.split('@')[1]}`,
    message: `${userData.message} - Load test at ${new Date().toISOString()}`,
  };
  
  let payload = JSON.stringify(userData);
  let params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  let response = http.post(`${BASE_URL}/data`, payload, params);
  
  let result = check(response, {
    'post data status is 201': (r) => r.status === 201,
    'post data response time < 3000ms': (r) => r.timings.duration < 3000,
    'post data returns success': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'post data returns created record': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.data && body.data.id;
      } catch (e) {
        return false;
      }
    },
    'post data validates email format': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.data && body.data.email && body.data.email.includes('@');
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!result);
  dbInsertLatency.add(response.timings.duration);
}

// Detailed summary report
export function handleSummary(data) {
  return {
    'loadtest-results.json': JSON.stringify(data, null, 2),
    stdout: `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📊 LOAD TEST SUMMARY REPORT                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  🚀 PERFORMANCE OVERVIEW                                                     ║
║  ────────────────────────────────────────────────────────────────────────  ║
║     Total Requests: ${data.metrics.http_reqs.values.count.toString().padStart(10)} requests                                      ║
║     Request Rate:   ${data.metrics.http_reqs.values.rate.toFixed(2).padStart(10)} req/s                                         ║
║     Data Received:  ${(data.metrics.data_received.values.count / 1024 / 1024).toFixed(2).padStart(10)} MB                                          ║
║     Data Sent:      ${(data.metrics.data_sent.values.count / 1024 / 1024).toFixed(2).padStart(10)} MB                                          ║
║                                                                              ║
║  ⏱️  RESPONSE TIME ANALYSIS                                                   ║
║  ────────────────────────────────────────────────────────────────────────  ║
║     Average:        ${data.metrics.http_req_duration.values.avg.toFixed(2).padStart(10)}ms                                        ║
║     Median (P50):   ${data.metrics.http_req_duration.values['p(50)'].toFixed(2).padStart(10)}ms                                        ║
║     90th Percentile:${data.metrics.http_req_duration.values['p(90)'].toFixed(2).padStart(10)}ms                                        ║
║     95th Percentile:${data.metrics.http_req_duration.values['p(95)'].toFixed(2).padStart(10)}ms                                        ║
║     99th Percentile:${data.metrics.http_req_duration.values['p(99)'].toFixed(2).padStart(10)}ms                                        ║
║     Maximum:        ${data.metrics.http_req_duration.values.max.toFixed(2).padStart(10)}ms                                        ║
║                                                                              ║
║  ❌ ERROR ANALYSIS                                                           ║
║  ────────────────────────────────────────────────────────────────────────  ║
║     HTTP Failures:  ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2).padStart(9)}%                                         ║
║     Custom Errors:  ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2).padStart(9)}%                                         ║
║     Failed Requests:${data.metrics.http_req_failed.values.count || 0}                                             ║
║                                                                              ║
║  🗄️  DATABASE PERFORMANCE                                                    ║
║  ────────────────────────────────────────────────────────────────────────  ║
║     DB Insert P90:  ${data.metrics.db_insert_latency?.values['p(90)']?.toFixed(2).padStart(10) || 'N/A'.padStart(10)}ms                                        ║
║     DB Insert P95:  ${data.metrics.db_insert_latency?.values['p(95)']?.toFixed(2).padStart(10) || 'N/A'.padStart(10)}ms                                        ║
║     DB Insert Avg:  ${data.metrics.db_insert_latency?.values.avg?.toFixed(2).padStart(10) || 'N/A'.padStart(10)}ms                                        ║
║                                                                              ║
║  🏥 HEALTH CHECK PERFORMANCE                                                 ║
║  ────────────────────────────────────────────────────────────────────────  ║
║     Health P95:     ${data.metrics.health_check_latency?.values['p(95)']?.toFixed(2).padStart(10) || 'N/A'.padStart(10)}ms                                        ║
║     Health Average: ${data.metrics.health_check_latency?.values.avg?.toFixed(2).padStart(10) || 'N/A'.padStart(10)}ms                                        ║
║                                                                              ║
║  📈 GRAFANA MONITORING                                                       ║
║  ────────────────────────────────────────────────────────────────────────  ║
║     Monitor these metrics in your Grafana dashboard:                        ║
║     • Request Latency (P90/P99) - Should show spikes during load            ║
║     • Requests Per Second - Should match k6 rate above                      ║
║     • CPU & Memory Usage - Watch for resource saturation                    ║
║     • DB Connection Count - Monitor connection pool usage                    ║
║     • Error Rates - Should correlate with k6 error rates                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

🎯 Load test completed! Check your Grafana dashboard for real-time metrics.
📊 Detailed results saved to: loadtest-results.json
`,
  };
}