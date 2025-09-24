# TaxiTap Non-Functional Testing Guide

## Overview

This guide provides comprehensive instructions for performing non-functional testing on the TaxiTap application using various tools including JMeter, Artillery.io, and K6.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [JMeter Testing](#jmeter-testing)
4. [Artillery.io WebSocket Testing](#artilleryio-websocket-testing)
5. [K6 Load Testing](#k6-load-testing)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Test Scenarios](#test-scenarios)
8. [Performance Benchmarks](#performance-benchmarks)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Prerequisites

### Software Requirements

- **JMeter 5.6+**: For HTTP load testing
- **Artillery.io**: For WebSocket and real-time testing
- **K6**: For modern load testing with JavaScript
- **Prometheus**: For metrics collection
- **Grafana**: For visualization
- **AlertManager**: For alerting
- **Docker**: For containerized testing environments

### Hardware Requirements

- **Minimum**: 8GB RAM, 4 CPU cores
- **Recommended**: 16GB RAM, 8 CPU cores
- **Network**: Stable internet connection with low latency

### Test Data Requirements

- Valid Convex API keys
- Test user accounts (passengers and drivers)
- Realistic South African location data
- Sample ride request data

## Test Environment Setup

### 1. Clone Test Repository

```bash
git clone <repository-url>
cd TaxiTap/testing
```

### 2. Install Dependencies

```bash
# Install JMeter
wget https://downloads.apache.org//jmeter/binaries/apache-jmeter-5.6.2.tgz
tar -xzf apache-jmeter-5.6.2.tgz
export JMETER_HOME=$(pwd)/apache-jmeter-5.6.2

# Install Artillery.io
npm install -g artillery

# Install K6
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install Prometheus and Grafana
docker-compose up -d prometheus grafana
```

### 3. Configure Environment Variables

```bash
export CONVEX_URL="https://your-convex-deployment.convex.cloud"
export API_KEY="your-api-key-here"
export TEST_DURATION="600"
```

## JMeter Testing

### Running Load Tests

1. **Basic Load Test**
```bash
cd jmeter
jmeter -n -t TaxiTap_Load_Test.jmx -l results/load_test_results.jtl
```

2. **GUI Mode (for test development)**
```bash
jmeter -t TaxiTap_Load_Test.jmx
```

3. **Command Line with Custom Parameters**
```bash
jmeter -n -t TaxiTap_Load_Test.jmx \
  -JCONVEX_URL=$CONVEX_URL \
  -JAPI_KEY=$API_KEY \
  -JTEST_DURATION=300 \
  -l results/custom_load_test.jtl
```

### Test Scenarios

#### Peak Hour Simulation
- **Duration**: 10 minutes
- **Users**: 50 concurrent passengers, 30 drivers
- **Pattern**: Gradual ramp-up, sustained load, ramp-down

#### Real-time Location Updates
- **Duration**: 15 minutes
- **Users**: 30 drivers
- **Frequency**: Location update every 30 seconds
- **Pattern**: Continuous throughout test

#### Driver Matching Load
- **Duration**: 10 minutes
- **Users**: 25 passengers
- **Frequency**: Driver search every 2-3 seconds
- **Pattern**: Random intervals

### Analyzing Results

1. **View Results Tree**: Detailed request/response data
2. **Summary Report**: Aggregate statistics
3. **Graph Results**: Visual performance trends

```bash
# Generate HTML report
jmeter -g results/load_test_results.jtl -o results/html_report/
```

## Artillery.io WebSocket Testing

### Running WebSocket Tests

1. **Basic Real-time Test**
```bash
cd artillery
artillery run taxi_tap_realtime_test.yml
```

2. **With Custom Configuration**
```bash
artillery run taxi_tap_realtime_test.yml \
  --config '{"target": "wss://your-convex-deployment.convex.cloud"}'
```

3. **With Output File**
```bash
artillery run taxi_tap_realtime_test.yml -o results/artillery_results.json
```

### Test Scenarios

#### Real-time Location Updates
- **Duration**: 20 minutes
- **Users**: 40 drivers
- **Frequency**: Location update every 30 seconds
- **Pattern**: Continuous WebSocket connection

#### Ride Request Notifications
- **Duration**: 15 minutes
- **Users**: 30 drivers
- **Pattern**: Listen for ride requests, simulate acceptance

#### Passenger Tracking
- **Duration**: 15 minutes
- **Users**: 30 passengers
- **Pattern**: Request ride, track progress, complete ride

## K6 Load Testing

### Running K6 Tests

1. **Basic Load Test**
```bash
cd k6
k6 run taxi_tap_load_test.js
```

2. **With Environment Variables**
```bash
k6 run -e CONVEX_URL=$CONVEX_URL -e API_KEY=$API_KEY taxi_tap_load_test.js
```

3. **Stress Test**
```bash
k6 run taxi_tap_stress_test.js
```

4. **With Custom Thresholds**
```bash
k6 run --threshold http_req_duration=p(95)<3000 taxi_tap_load_test.js
```

### Test Scenarios

#### Load Test
- **Duration**: 19 minutes
- **Users**: 0-50 (gradual ramp-up)
- **Pattern**: 40% ride requests, 30% location updates, 30% driver matching

#### Stress Test
- **Duration**: 20 minutes
- **Users**: 0-1000 (gradual ramp-up with spike)
- **Pattern**: High-frequency operations with reduced sleep times

## Monitoring and Alerting

### Prometheus Setup

1. **Start Prometheus**
```bash
cd monitoring
prometheus --config.file=prometheus.yml
```

2. **Access Prometheus UI**
```
http://localhost:9090
```

### Grafana Dashboard

1. **Import Dashboard**
```bash
# Import TaxiTap dashboard
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @grafana_dashboard.json
```

2. **Access Grafana**
```
http://localhost:3000
Username: admin
Password: admin
```

### AlertManager Configuration

1. **Start AlertManager**
```bash
alertmanager --config.file=alertmanager.yml
```

2. **Configure Notifications**
- Email notifications for critical alerts
- Slack notifications for warnings
- PagerDuty for system outages

## Test Scenarios

### 1. Peak Hour Load Test

**Objective**: Test system performance during peak usage hours (7-9 AM, 5-7 PM)

**Test Parameters**:
- Duration: 10 minutes
- Concurrent Users: 100 (70% passengers, 30% drivers)
- Ramp-up: 5 minutes
- Sustained Load: 5 minutes

**Success Criteria**:
- Response time P95 < 3 seconds
- Error rate < 2%
- 95% of ride requests successful

### 2. Real-time Location Updates

**Objective**: Test real-time location update performance

**Test Parameters**:
- Duration: 15 minutes
- Concurrent Users: 50 drivers
- Update Frequency: Every 30 seconds
- Geographic Spread: Johannesburg, Cape Town, Durban

**Success Criteria**:
- Location update success rate > 98%
- Update latency < 2 seconds
- No connection drops

### 3. Driver Matching Performance

**Objective**: Test driver matching algorithm under load

**Test Parameters**:
- Duration: 10 minutes
- Concurrent Users: 30 passengers
- Search Frequency: Every 2-3 seconds
- Search Radius: 1-10 km

**Success Criteria**:
- Driver matching response time < 4 seconds
- Match accuracy > 90%
- No timeout errors

### 4. Stress Test

**Objective**: Determine system breaking point

**Test Parameters**:
- Duration: 20 minutes
- Concurrent Users: 0-1000
- Pattern: Gradual ramp-up with spike
- Operations: All API endpoints

**Success Criteria**:
- System remains stable up to 500 concurrent users
- Graceful degradation beyond capacity
- Recovery time < 2 minutes

## Performance Benchmarks

### Response Time Targets

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| Ride Request | 500ms | 2s | 5s |
| Location Update | 200ms | 1s | 2s |
| Driver Matching | 800ms | 3s | 6s |
| Ride Acceptance | 300ms | 1.5s | 3s |
| Ride Completion | 400ms | 2s | 4s |

### Throughput Targets

| Operation | Target | Peak |
|-----------|--------|------|
| Ride Requests/sec | 50 | 100 |
| Location Updates/sec | 200 | 400 |
| Driver Searches/sec | 30 | 60 |
| WebSocket Connections | 500 | 1000 |

### Error Rate Targets

| Scenario | Target | Critical |
|----------|--------|----------|
| Overall Error Rate | < 1% | < 5% |
| Ride Request Failures | < 0.5% | < 2% |
| Location Update Failures | < 0.2% | < 1% |
| Connection Failures | < 0.1% | < 0.5% |

## Troubleshooting

### Common Issues

#### 1. Connection Timeouts
**Symptoms**: High timeout error rate
**Solutions**:
- Increase timeout values in test configuration
- Check network connectivity
- Verify Convex service status
- Reduce concurrent user load

#### 2. High Response Times
**Symptoms**: P95 response times exceed targets
**Solutions**:
- Check database performance
- Monitor CPU and memory usage
- Optimize database queries
- Scale infrastructure

#### 3. WebSocket Connection Failures
**Symptoms**: WebSocket connections dropping
**Solutions**:
- Check WebSocket server configuration
- Monitor connection pool limits
- Verify authentication tokens
- Test with reduced connection frequency

#### 4. Memory Issues
**Symptoms**: Out of memory errors
**Solutions**:
- Increase JVM heap size for JMeter
- Monitor system memory usage
- Optimize test data size
- Use distributed testing

### Debug Commands

```bash
# Check JMeter logs
tail -f jmeter.log

# Monitor system resources
htop
iostat -x 1
netstat -an | grep :443

# Check Convex logs
convex logs --tail=100

# Test API connectivity
curl -v $CONVEX_URL/health
```

## Best Practices

### Test Design

1. **Start Small**: Begin with low load and gradually increase
2. **Realistic Data**: Use realistic test data and scenarios
3. **Baseline First**: Establish baseline performance before optimization
4. **Isolate Variables**: Test one component at a time when possible

### Test Execution

1. **Consistent Environment**: Use same environment for all tests
2. **Document Everything**: Record all test parameters and results
3. **Repeat Tests**: Run tests multiple times for consistency
4. **Monitor Resources**: Watch system resources during tests

### Result Analysis

1. **Multiple Metrics**: Look at response time, throughput, and error rates
2. **Trend Analysis**: Identify performance trends over time
3. **Root Cause**: Investigate the root cause of performance issues
4. **Action Items**: Create actionable improvement plans

### Continuous Testing

1. **Automated Tests**: Integrate performance tests into CI/CD pipeline
2. **Regular Monitoring**: Set up continuous monitoring in production
3. **Performance Budgets**: Define and enforce performance budgets
4. **Alert on Regression**: Set up alerts for performance regressions

## Test Execution Checklist

### Pre-Test
- [ ] Verify test environment setup
- [ ] Check API connectivity
- [ ] Validate test data
- [ ] Confirm monitoring is active
- [ ] Notify stakeholders

### During Test
- [ ] Monitor system resources
- [ ] Watch for error patterns
- [ ] Record observations
- [ ] Check alert notifications
- [ ] Document any issues

### Post-Test
- [ ] Collect all test results
- [ ] Generate reports
- [ ] Analyze performance metrics
- [ ] Identify bottlenecks
- [ ] Create improvement recommendations
- [ ] Share results with team

## Contact Information

For questions or issues with this testing guide:
- **Technical Lead**: [Your Name]
- **Email**: [your.email@example.com]
- **Slack**: #taxi-tap-performance

---

*Last Updated: [Current Date]*
*Version: 1.0*
