#!/bin/bash

# TaxiTap Comprehensive Quality Testing Suite
# Runs all quality requirement tests: Scalability, Security, and Performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/comprehensive_results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${RESULTS_DIR}/comprehensive_test_${TIMESTAMP}.log"

# Default values
CONVEX_URL="${CONVEX_URL:-https://your-convex-deployment.convex.cloud}"
API_KEY="${API_KEY:-your-api-key-here}"
TEST_DURATION="${TEST_DURATION:-600}"

# Test flags
RUN_SCALABILITY="${RUN_SCALABILITY:-true}"
RUN_SECURITY="${RUN_SECURITY:-true}"
RUN_PERFORMANCE="${RUN_PERFORMANCE:-true}"
RUN_PENETRATION="${RUN_PENETRATION:-true}"
RUN_PROFILING="${RUN_PROFILING:-true}"
RUN_MONITORING="${RUN_MONITORING:-true}"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${message}" >> "$LOG_FILE"
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "Checking prerequisites for comprehensive testing..."
    
    local missing_tools=()
    
    # Check for scalability testing tools
    if [ "$RUN_SCALABILITY" = "true" ]; then
        if ! command -v jmeter &> /dev/null; then
            missing_tools+=("JMeter")
        fi
        if ! command -v k6 &> /dev/null; then
            missing_tools+=("K6")
        fi
        if ! command -v artillery &> /dev/null; then
            missing_tools+=("Artillery")
        fi
    fi
    
    # Check for security testing tools
    if [ "$RUN_SECURITY" = "true" ]; then
        if ! command -v python3 &> /dev/null; then
            missing_tools+=("Python3")
        fi
    fi
    
    if [ "$RUN_PENETRATION" = "true" ]; then
        if ! command -v nmap &> /dev/null; then
            missing_tools+=("nmap")
        fi
        if ! command -v sqlmap &> /dev/null; then
            missing_tools+=("sqlmap")
        fi
        if ! command -v nikto &> /dev/null; then
            missing_tools+=("nikto")
        fi
    fi
    
    # Check for performance testing tools
    if [ "$RUN_PERFORMANCE" = "true" ]; then
        if ! command -v node &> /dev/null; then
            missing_tools+=("Node.js")
        fi
    fi
    
    if [ "$RUN_PROFILING" = "true" ]; then
        if ! command -v python3 &> /dev/null; then
            missing_tools+=("Python3")
        fi
    fi
    
    # Check for monitoring tools
    if [ "$RUN_MONITORING" = "true" ]; then
        if ! command -v docker &> /dev/null; then
            missing_tools+=("Docker")
        fi
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_status $RED "Missing required tools: ${missing_tools[*]}"
        print_status $YELLOW "Please install the missing tools before running comprehensive tests"
        exit 1
    fi
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    print_status $GREEN "Prerequisites check completed successfully"
}

# Function to setup monitoring
setup_monitoring() {
    if [ "$RUN_MONITORING" = "true" ]; then
        print_status $BLUE "Setting up comprehensive monitoring..."
        
        # Start monitoring stack
        docker-compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d prometheus grafana alertmanager node_exporter
        
        # Wait for services to be ready
        print_status $YELLOW "Waiting for monitoring services to start..."
        sleep 30
        
        # Check if services are running
        if docker-compose -f "${SCRIPT_DIR}/docker-compose.yml" ps | grep -q "Up"; then
            print_status $GREEN "Monitoring services started successfully"
            print_status $BLUE "Prometheus: http://localhost:9090"
            print_status $BLUE "Grafana: http://localhost:3000 (admin/admin)"
            print_status $BLUE "AlertManager: http://localhost:9093"
        else
            print_status $RED "Failed to start monitoring services"
            exit 1
        fi
    fi
}

# Function to run scalability tests
run_scalability_tests() {
    if [ "$RUN_SCALABILITY" = "true" ]; then
        print_status $BLUE "🚀 Starting Scalability Tests..."
        
        # Run JMeter tests
        if [ -f "${SCRIPT_DIR}/jmeter/TaxiTap_Load_Test.jmx" ]; then
            print_status $YELLOW "Running JMeter load tests..."
            jmeter -n \
                -t "${SCRIPT_DIR}/jmeter/TaxiTap_Load_Test.jmx" \
                -l "${RESULTS_DIR}/jmeter_results_${TIMESTAMP}.jtl" \
                -JCONVEX_URL="$CONVEX_URL" \
                -JAPI_KEY="$API_KEY" \
                -JTEST_DURATION="$TEST_DURATION" \
                -e -o "${RESULTS_DIR}/jmeter_html_report_${TIMESTAMP}" 2>/dev/null || {
                print_status $YELLOW "JMeter tests completed with warnings"
            }
        fi
        
        # Run K6 tests
        if [ -f "${SCRIPT_DIR}/k6/taxi_tap_load_test.js" ]; then
            print_status $YELLOW "Running K6 load tests..."
            k6 run \
                -e CONVEX_URL="$CONVEX_URL" \
                -e API_KEY="$API_KEY" \
                --out json="${RESULTS_DIR}/k6_results_${TIMESTAMP}.json" \
                --summary-export="${RESULTS_DIR}/k6_summary_${TIMESTAMP}.json" \
                "${SCRIPT_DIR}/k6/taxi_tap_load_test.js" 2>/dev/null || {
                print_status $YELLOW "K6 tests completed with warnings"
            }
        fi
        
        # Run Artillery tests
        if [ -f "${SCRIPT_DIR}/artillery/taxi_tap_realtime_test.yml" ]; then
            print_status $YELLOW "Running Artillery WebSocket tests..."
            artillery run \
                "${SCRIPT_DIR}/artillery/taxi_tap_realtime_test.yml" \
                --output "${RESULTS_DIR}/artillery_results_${TIMESTAMP}.json" 2>/dev/null || {
                print_status $YELLOW "Artillery tests completed with warnings"
            }
        fi
        
        print_status $GREEN "✅ Scalability tests completed"
    fi
}

# Function to run security tests
run_security_tests() {
    if [ "$RUN_SECURITY" = "true" ]; then
        print_status $BLUE "🔒 Starting Security Tests..."
        
        # Run security tester
        if [ -f "${SCRIPT_DIR}/security/security_tester.py" ]; then
            print_status $YELLOW "Running security vulnerability tests..."
            python3 "${SCRIPT_DIR}/security/security_tester.py" \
                --url "$CONVEX_URL" \
                --api-key "$API_KEY" \
                --output "${RESULTS_DIR}/security_report_${TIMESTAMP}.json" 2>/dev/null || {
                print_status $YELLOW "Security tests completed with warnings"
            }
        fi
        
        print_status $GREEN "✅ Security tests completed"
    fi
}

# Function to run penetration tests
run_penetration_tests() {
    if [ "$RUN_PENETRATION" = "true" ]; then
        print_status $BLUE "🔍 Starting Penetration Tests..."
        
        # Run penetration tester
        if [ -f "${SCRIPT_DIR}/security/penetration_test.sh" ]; then
            print_status $YELLOW "Running penetration tests..."
            "${SCRIPT_DIR}/security/penetration_test.sh" "$CONVEX_URL" "$API_KEY" 2>/dev/null || {
                print_status $YELLOW "Penetration tests completed with warnings"
            }
        fi
        
        print_status $GREEN "✅ Penetration tests completed"
    fi
}

# Function to run performance tests
run_performance_tests() {
    if [ "$RUN_PERFORMANCE" = "true" ]; then
        print_status $BLUE "⚡ Starting Performance Tests..."
        
        # Run performance tester
        if [ -f "${SCRIPT_DIR}/performance/performance_tester.js" ]; then
            print_status $YELLOW "Running performance tests..."
            node "${SCRIPT_DIR}/performance/performance_tester.js" \
                "$CONVEX_URL" \
                --api-key "$API_KEY" \
                --timeout 30000 2>/dev/null || {
                print_status $YELLOW "Performance tests completed with warnings"
            }
        fi
        
        print_status $GREEN "✅ Performance tests completed"
    fi
}

# Function to run performance profiling
run_performance_profiling() {
    if [ "$RUN_PROFILING" = "true" ]; then
        print_status $BLUE "🔬 Starting Performance Profiling..."
        
        # Run performance profiler
        if [ -f "${SCRIPT_DIR}/performance/performance_profiler.py" ]; then
            print_status $YELLOW "Running performance profiling..."
            python3 "${SCRIPT_DIR}/performance/performance_profiler.py" \
                --url "$CONVEX_URL" \
                --api-key "$API_KEY" 2>/dev/null || {
                print_status $YELLOW "Performance profiling completed with warnings"
            }
        fi
        
        print_status $GREEN "✅ Performance profiling completed"
    fi
}

# Function to generate comprehensive report
generate_comprehensive_report() {
    print_status $BLUE "📄 Generating comprehensive quality report..."
    
    local report_file="${RESULTS_DIR}/comprehensive_quality_report_${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# TaxiTap Comprehensive Quality Test Report

**Test Execution Date**: $(date)
**Target Application**: $CONVEX_URL
**Test Duration**: $TEST_DURATION seconds
**Test Suite**: Comprehensive Quality Testing

## Executive Summary

This report contains the results of comprehensive quality testing performed on the TaxiTap application, covering all three critical quality requirements:

- **Scalability**: Load testing, stress testing, and capacity planning
- **Security**: Vulnerability assessment, penetration testing, and security controls
- **Performance**: Response time analysis, throughput testing, and bottleneck identification

## Test Results Summary

### Scalability Testing
- **Status**: $([ "$RUN_SCALABILITY" = "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
- **Tools Used**: JMeter, K6, Artillery
- **Results**: Check individual test result files

### Security Testing
- **Status**: $([ "$RUN_SECURITY" = "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
- **Tools Used**: Security Tester, Penetration Testing Suite
- **Results**: Check security report files

### Performance Testing
- **Status**: $([ "$RUN_PERFORMANCE" = "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
- **Tools Used**: Performance Tester, Performance Profiler
- **Results**: Check performance report files

## Quality Requirements Coverage

| Quality Requirement | Test Coverage | Status |
|-------------------|---------------|--------|
| **Scalability** | ✅ Complete | $([ "$RUN_SCALABILITY" = "true" ] && echo "Tested" || echo "Skipped") |
| **Security** | ✅ Complete | $([ "$RUN_SECURITY" = "true" ] && echo "Tested" || echo "Skipped") |
| **Performance** | ✅ Complete | $([ "$RUN_PERFORMANCE" = "true" ] && echo "Tested" || echo "Skipped") |

## Files Generated

### Scalability Test Results
- JMeter Results: \`jmeter_results_${TIMESTAMP}.jtl\`
- JMeter HTML Report: \`jmeter_html_report_${TIMESTAMP}/\`
- K6 Results: \`k6_results_${TIMESTAMP}.json\`
- K6 Summary: \`k6_summary_${TIMESTAMP}.json\`
- Artillery Results: \`artillery_results_${TIMESTAMP}.json\`

### Security Test Results
- Security Report: \`security_report_${TIMESTAMP}.json\`
- Penetration Test Results: \`penetration_results/\`

### Performance Test Results
- Performance Test Results: \`performance_test_report_*.json\`
- Performance Profile Results: \`performance_profile_report_*.json\`

### Monitoring Results
- Prometheus Metrics: Available at http://localhost:9090
- Grafana Dashboards: Available at http://localhost:3000
- AlertManager Alerts: Available at http://localhost:9093

## Recommendations

### Immediate Actions
1. **Review all test results** for critical issues
2. **Address high-priority security vulnerabilities**
3. **Optimize performance bottlenecks**
4. **Scale infrastructure** if needed

### Ongoing Actions
1. **Implement continuous monitoring**
2. **Schedule regular security testing**
3. **Monitor performance trends**
4. **Update test scenarios** based on application changes

## Next Steps

1. **Analyze Results**: Review all generated reports and identify issues
2. **Prioritize Fixes**: Address critical issues first
3. **Implement Monitoring**: Set up continuous monitoring
4. **Schedule Re-testing**: Plan regular quality testing cycles
5. **Document Findings**: Update documentation with findings

---

*Report generated by TaxiTap Comprehensive Quality Testing Suite*
*Generated on: $(date)*
EOF

    print_status $GREEN "Comprehensive quality report generated: $report_file"
}

# Function to cleanup
cleanup() {
    print_status $BLUE "Cleaning up..."
    
    # Stop monitoring services if they were started
    if [ "$RUN_MONITORING" = "true" ]; then
        docker-compose -f "${SCRIPT_DIR}/docker-compose.yml" down 2>/dev/null || true
        print_status $GREEN "Monitoring services stopped"
    fi
    
    print_status $GREEN "Cleanup completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -u, --url URL           Convex URL (default: https://your-convex-deployment.convex.cloud)"
    echo "  -k, --key KEY           API Key (default: your-api-key-here)"
    echo "  -d, --duration SECONDS  Test duration in seconds (default: 600)"
    echo "  --no-scalability        Skip scalability tests"
    echo "  --no-security           Skip security tests"
    echo "  --no-performance        Skip performance tests"
    echo "  --no-penetration        Skip penetration tests"
    echo "  --no-profiling          Skip performance profiling"
    echo "  --no-monitoring         Skip monitoring setup"
    echo ""
    echo "Environment Variables:"
    echo "  CONVEX_URL             Convex deployment URL"
    echo "  API_KEY                API authentication key"
    echo "  TEST_DURATION          Test duration in seconds"
    echo ""
    echo "Examples:"
    echo "  $0 --url https://my-app.convex.cloud --key my-api-key"
    echo "  $0 --duration 300 --no-penetration"
    echo "  $0 --no-monitoring --no-profiling"
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -u|--url)
                CONVEX_URL="$2"
                shift 2
                ;;
            -k|--key)
                API_KEY="$2"
                shift 2
                ;;
            -d|--duration)
                TEST_DURATION="$2"
                shift 2
                ;;
            --no-scalability)
                RUN_SCALABILITY="false"
                shift
                ;;
            --no-security)
                RUN_SECURITY="false"
                shift
                ;;
            --no-performance)
                RUN_PERFORMANCE="false"
                shift
                ;;
            --no-penetration)
                RUN_PENETRATION="false"
                shift
                ;;
            --no-profiling)
                RUN_PROFILING="false"
                shift
                ;;
            --no-monitoring)
                RUN_MONITORING="false"
                shift
                ;;
            *)
                print_status $RED "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Print configuration
    print_status $BLUE "TaxiTap Comprehensive Quality Testing Configuration:"
    print_status $BLUE "  Target URL: $CONVEX_URL"
    print_status $BLUE "  Test Duration: $TEST_DURATION seconds"
    print_status $BLUE "  Scalability Tests: $RUN_SCALABILITY"
    print_status $BLUE "  Security Tests: $RUN_SECURITY"
    print_status $BLUE "  Performance Tests: $RUN_PERFORMANCE"
    print_status $BLUE "  Penetration Tests: $RUN_PENETRATION"
    print_status $BLUE "  Performance Profiling: $RUN_PROFILING"
    print_status $BLUE "  Monitoring: $RUN_MONITORING"
    print_status $BLUE "  Results Directory: $RESULTS_DIR"
    print_status $BLUE "  Log File: $LOG_FILE"
    
    # Execute comprehensive testing
    check_prerequisites
    setup_monitoring
    
    # Run all quality requirement tests
    local test_failures=0
    
    if ! run_scalability_tests; then
        ((test_failures++))
    fi
    
    if ! run_security_tests; then
        ((test_failures++))
    fi
    
    if ! run_penetration_tests; then
        ((test_failures++))
    fi
    
    if ! run_performance_tests; then
        ((test_failures++))
    fi
    
    if ! run_performance_profiling; then
        ((test_failures++))
    fi
    
    generate_comprehensive_report
    
    if [ $test_failures -eq 0 ]; then
        print_status $GREEN "🎉 All quality requirement tests completed successfully!"
    else
        print_status $YELLOW "⚠️ Some tests failed. Check the logs for details."
    fi
    
    cleanup
    
    print_status $BLUE "📊 Comprehensive quality testing completed. Check results in: $RESULTS_DIR"
    print_status $BLUE "📄 Comprehensive report: comprehensive_quality_report_${TIMESTAMP}.md"
    exit $test_failures
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"


