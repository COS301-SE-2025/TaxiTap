#!/bin/bash

# TaxiTap Non-Functional Testing Execution Script
# This script automates the execution of various performance tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${RESULTS_DIR}/test_execution_${TIMESTAMP}.log"

# Default values
CONVEX_URL="${CONVEX_URL:-https://your-convex-deployment.convex.cloud}"
API_KEY="${API_KEY:-your-api-key-here}"
TEST_DURATION="${TEST_DURATION:-600}"
CONCURRENT_USERS="${CONCURRENT_USERS:-50}"

# Test types
RUN_JMETER="${RUN_JMETER:-true}"
RUN_K6="${RUN_K6:-true}"
RUN_ARTILLERY="${RUN_ARTILLERY:-true}"
RUN_STRESS_TEST="${RUN_STRESS_TEST:-false}"
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
    print_status $BLUE "Checking prerequisites..."
    
    # Check if required tools are installed
    local missing_tools=()
    
    if ! command -v jmeter &> /dev/null; then
        missing_tools+=("JMeter")
    fi
    
    if ! command -v k6 &> /dev/null; then
        missing_tools+=("K6")
    fi
    
    if ! command -v artillery &> /dev/null; then
        missing_tools+=("Artillery")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("Docker")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_status $RED "Missing required tools: ${missing_tools[*]}"
        print_status $YELLOW "Please install the missing tools before running tests"
        exit 1
    fi
    
    # Check if test files exist
    local missing_files=()
    
    if [ ! -f "${SCRIPT_DIR}/jmeter/TaxiTap_Load_Test.jmx" ]; then
        missing_files+=("JMeter test plan")
    fi
    
    if [ ! -f "${SCRIPT_DIR}/k6/taxi_tap_load_test.js" ]; then
        missing_files+=("K6 load test script")
    fi
    
    if [ ! -f "${SCRIPT_DIR}/artillery/taxi_tap_realtime_test.yml" ]; then
        missing_files+=("Artillery test configuration")
    fi
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_status $RED "Missing test files: ${missing_files[*]}"
        exit 1
    fi
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    print_status $GREEN "Prerequisites check completed successfully"
}

# Function to setup monitoring
setup_monitoring() {
    if [ "$RUN_MONITORING" = "true" ]; then
        print_status $BLUE "Setting up monitoring..."
        
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

# Function to run JMeter tests
run_jmeter_tests() {
    if [ "$RUN_JMETER" = "true" ]; then
        print_status $BLUE "Starting JMeter load tests..."
        
        local jmeter_results="${RESULTS_DIR}/jmeter_results_${TIMESTAMP}.jtl"
        local jmeter_html_report="${RESULTS_DIR}/jmeter_html_report_${TIMESTAMP}"
        
        # Run JMeter test
        jmeter -n \
            -t "${SCRIPT_DIR}/jmeter/TaxiTap_Load_Test.jmx" \
            -l "$jmeter_results" \
            -JCONVEX_URL="$CONVEX_URL" \
            -JAPI_KEY="$API_KEY" \
            -JTEST_DURATION="$TEST_DURATION" \
            -e -o "$jmeter_html_report"
        
        if [ $? -eq 0 ]; then
            print_status $GREEN "JMeter tests completed successfully"
            print_status $BLUE "Results: $jmeter_results"
            print_status $BLUE "HTML Report: $jmeter_html_report/index.html"
        else
            print_status $RED "JMeter tests failed"
            return 1
        fi
    fi
}

# Function to run K6 tests
run_k6_tests() {
    if [ "$RUN_K6" = "true" ]; then
        print_status $BLUE "Starting K6 load tests..."
        
        local k6_results="${RESULTS_DIR}/k6_results_${TIMESTAMP}.json"
        local k6_html_report="${RESULTS_DIR}/k6_html_report_${TIMESTAMP}.html"
        
        # Run K6 load test
        k6 run \
            -e CONVEX_URL="$CONVEX_URL" \
            -e API_KEY="$API_KEY" \
            --out json="$k6_results" \
            --summary-export="${RESULTS_DIR}/k6_summary_${TIMESTAMP}.json" \
            "${SCRIPT_DIR}/k6/taxi_tap_load_test.js"
        
        if [ $? -eq 0 ]; then
            print_status $GREEN "K6 load tests completed successfully"
            print_status $BLUE "Results: $k6_results"
        else
            print_status $RED "K6 load tests failed"
            return 1
        fi
        
        # Run stress test if requested
        if [ "$RUN_STRESS_TEST" = "true" ]; then
            print_status $BLUE "Starting K6 stress tests..."
            
            local stress_results="${RESULTS_DIR}/stress_test_results_${TIMESTAMP}.json"
            
            k6 run \
                -e CONVEX_URL="$CONVEX_URL" \
                -e API_KEY="$API_KEY" \
                --out json="$stress_results" \
                --summary-export="${RESULTS_DIR}/stress_test_summary_${TIMESTAMP}.json" \
                "${SCRIPT_DIR}/k6/taxi_tap_stress_test.js"
            
            if [ $? -eq 0 ]; then
                print_status $GREEN "K6 stress tests completed successfully"
                print_status $BLUE "Results: $stress_results"
            else
                print_status $RED "K6 stress tests failed"
                return 1
            fi
        fi
    fi
}

# Function to run Artillery tests
run_artillery_tests() {
    if [ "$RUN_ARTILLERY" = "true" ]; then
        print_status $BLUE "Starting Artillery WebSocket tests..."
        
        local artillery_results="${RESULTS_DIR}/artillery_results_${TIMESTAMP}.json"
        
        # Run Artillery test
        artillery run \
            "${SCRIPT_DIR}/artillery/taxi_tap_realtime_test.yml" \
            --output "$artillery_results"
        
        if [ $? -eq 0 ]; then
            print_status $GREEN "Artillery tests completed successfully"
            print_status $BLUE "Results: $artillery_results"
        else
            print_status $RED "Artillery tests failed"
            return 1
        fi
    fi
}

# Function to generate test summary
generate_summary() {
    print_status $BLUE "Generating test summary..."
    
    local summary_file="${RESULTS_DIR}/test_summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# TaxiTap Performance Test Summary

**Test Execution Time**: $(date)
**Test Duration**: ${TEST_DURATION} seconds
**Concurrent Users**: ${CONCURRENT_USERS}
**Convex URL**: ${CONVEX_URL}

## Test Results

### JMeter Tests
- **Status**: $([ "$RUN_JMETER" = "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
- **Results File**: $([ "$RUN_JMETER" = "true" ] && echo "jmeter_results_${TIMESTAMP}.jtl" || echo "N/A")

### K6 Load Tests
- **Status**: $([ "$RUN_K6" = "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
- **Results File**: $([ "$RUN_K6" = "true" ] && echo "k6_results_${TIMESTAMP}.json" || echo "N/A")

### K6 Stress Tests
- **Status**: $([ "$RUN_STRESS_TEST" = "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
- **Results File**: $([ "$RUN_STRESS_TEST" = "true" ] && echo "stress_test_results_${TIMESTAMP}.json" || echo "N/A")

### Artillery WebSocket Tests
- **Status**: $([ "$RUN_ARTILLERY" = "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
- **Results File**: $([ "$RUN_ARTILLERY" = "true" ] && echo "artillery_results_${TIMESTAMP}.json" || echo "N/A")

### Monitoring
- **Status**: $([ "$RUN_MONITORING" = "true" ] && echo "✅ Active" || echo "⏭️ Skipped")
- **Prometheus**: $([ "$RUN_MONITORING" = "true" ] && echo "http://localhost:9090" || echo "N/A")
- **Grafana**: $([ "$RUN_MONITORING" = "true" ] && echo "http://localhost:3000" || echo "N/A")

## Next Steps

1. Review test results in the results directory
2. Analyze performance metrics in Grafana
3. Check for any alerts in AlertManager
4. Generate performance report based on findings
5. Identify optimization opportunities

## Files Generated

- Test execution log: \`test_execution_${TIMESTAMP}.log\`
- JMeter results: \`jmeter_results_${TIMESTAMP}.jtl\`
- K6 results: \`k6_results_${TIMESTAMP}.json\`
- Artillery results: \`artillery_results_${TIMESTAMP}.json\`
- Test summary: \`test_summary_${TIMESTAMP}.md\`

EOF

    print_status $GREEN "Test summary generated: $summary_file"
}

# Function to cleanup
cleanup() {
    print_status $BLUE "Cleaning up..."
    
    # Stop monitoring services if they were started
    if [ "$RUN_MONITORING" = "true" ]; then
        docker-compose -f "${SCRIPT_DIR}/docker-compose.yml" down
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
    echo "  -c, --users USERS       Concurrent users (default: 50)"
    echo "  --no-jmeter            Skip JMeter tests"
    echo "  --no-k6                Skip K6 tests"
    echo "  --no-artillery         Skip Artillery tests"
    echo "  --stress-test          Run stress tests"
    echo "  --no-monitoring        Skip monitoring setup"
    echo ""
    echo "Environment Variables:"
    echo "  CONVEX_URL             Convex deployment URL"
    echo "  API_KEY                API authentication key"
    echo "  TEST_DURATION          Test duration in seconds"
    echo "  CONCURRENT_USERS       Number of concurrent users"
    echo ""
    echo "Examples:"
    echo "  $0 --url https://my-app.convex.cloud --key my-api-key"
    echo "  $0 --duration 300 --users 100 --stress-test"
    echo "  $0 --no-artillery --stress-test"
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
            -c|--users)
                CONCURRENT_USERS="$2"
                shift 2
                ;;
            --no-jmeter)
                RUN_JMETER="false"
                shift
                ;;
            --no-k6)
                RUN_K6="false"
                shift
                ;;
            --no-artillery)
                RUN_ARTILLERY="false"
                shift
                ;;
            --stress-test)
                RUN_STRESS_TEST="true"
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
    print_status $BLUE "TaxiTap Performance Testing Configuration:"
    print_status $BLUE "  Convex URL: $CONVEX_URL"
    print_status $BLUE "  Test Duration: $TEST_DURATION seconds"
    print_status $BLUE "  Concurrent Users: $CONCURRENT_USERS"
    print_status $BLUE "  JMeter Tests: $RUN_JMETER"
    print_status $BLUE "  K6 Tests: $RUN_K6"
    print_status $BLUE "  Artillery Tests: $RUN_ARTILLERY"
    print_status $BLUE "  Stress Tests: $RUN_STRESS_TEST"
    print_status $BLUE "  Monitoring: $RUN_MONITORING"
    print_status $BLUE "  Results Directory: $RESULTS_DIR"
    print_status $BLUE "  Log File: $LOG_FILE"
    
    # Execute tests
    check_prerequisites
    setup_monitoring
    
    # Run tests
    local test_failures=0
    
    if ! run_jmeter_tests; then
        ((test_failures++))
    fi
    
    if ! run_k6_tests; then
        ((test_failures++))
    fi
    
    if ! run_artillery_tests; then
        ((test_failures++))
    fi
    
    generate_summary
    
    if [ $test_failures -eq 0 ]; then
        print_status $GREEN "All tests completed successfully!"
    else
        print_status $YELLOW "Some tests failed. Check the logs for details."
    fi
    
    cleanup
    
    print_status $BLUE "Test execution completed. Check results in: $RESULTS_DIR"
    exit $test_failures
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
