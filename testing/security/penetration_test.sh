#!/bin/bash

# TaxiTap Penetration Testing Suite
# Comprehensive penetration testing for vulnerability assessment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_URL="${1:-https://your-convex-deployment.convex.cloud}"
API_KEY="${2:-your-api-key-here}"
OUTPUT_DIR="./penetration_results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Tools check
check_tools() {
    local missing_tools=()
    
    if ! command -v nmap &> /dev/null; then
        missing_tools+=("nmap")
    fi
    
    if ! command -v sqlmap &> /dev/null; then
        missing_tools+=("sqlmap")
    fi
    
    if ! command -v nikto &> /dev/null; then
        missing_tools+=("nikto")
    fi
    
    if ! command -v dirb &> /dev/null; then
        missing_tools+=("dirb")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo -e "${RED}Missing required tools: ${missing_tools[*]}${NC}"
        echo "Please install the missing tools before running penetration tests"
        exit 1
    fi
}

# Create output directory
setup_output() {
    mkdir -p "$OUTPUT_DIR"
    echo -e "${BLUE}Penetration testing results will be saved to: $OUTPUT_DIR${NC}"
}

# Port scanning
port_scan() {
    echo -e "${BLUE}🔍 Starting port scan...${NC}"
    
    local target_host=$(echo "$TARGET_URL" | sed 's|https\?://||' | cut -d'/' -f1)
    
    nmap -sS -sV -O -A -p- "$target_host" -oN "$OUTPUT_DIR/nmap_scan_$TIMESTAMP.txt" 2>/dev/null || {
        echo -e "${YELLOW}Warning: nmap scan failed, trying basic scan...${NC}"
        nmap -sT "$target_host" -oN "$OUTPUT_DIR/nmap_basic_$TIMESTAMP.txt" 2>/dev/null || true
    }
    
    echo -e "${GREEN}✅ Port scan completed${NC}"
}

# Web vulnerability scanning
web_vuln_scan() {
    echo -e "${BLUE}🌐 Starting web vulnerability scan...${NC}"
    
    # Nikto scan
    nikto -h "$TARGET_URL" -output "$OUTPUT_DIR/nikto_scan_$TIMESTAMP.txt" 2>/dev/null || {
        echo -e "${YELLOW}Warning: Nikto scan failed${NC}"
    }
    
    # Directory brute force
    dirb "$TARGET_URL" /usr/share/dirb/wordlists/common.txt -o "$OUTPUT_DIR/dirb_scan_$TIMESTAMP.txt" 2>/dev/null || {
        echo -e "${YELLOW}Warning: Dirb scan failed${NC}"
    }
    
    echo -e "${GREEN}✅ Web vulnerability scan completed${NC}"
}

# SQL injection testing
sql_injection_test() {
    echo -e "${BLUE}💉 Starting SQL injection testing...${NC}"
    
    # Test login endpoint
    sqlmap -u "$TARGET_URL/api/login" \
           --data="phoneNumber=test&password=test" \
           --method=POST \
           --batch \
           --output-dir="$OUTPUT_DIR/sqlmap_login_$TIMESTAMP" \
           --level=3 \
           --risk=2 2>/dev/null || {
        echo -e "${YELLOW}Warning: SQLMap login test failed${NC}"
    }
    
    # Test other endpoints
    sqlmap -u "$TARGET_URL/api/getNearbyDrivers?latitude=test&longitude=test" \
           --batch \
           --output-dir="$OUTPUT_DIR/sqlmap_drivers_$TIMESTAMP" \
           --level=2 \
           --risk=1 2>/dev/null || {
        echo -e "${YELLOW}Warning: SQLMap drivers test failed${NC}"
    }
    
    echo -e "${GREEN}✅ SQL injection testing completed${NC}"
}

# Authentication testing
auth_testing() {
    echo -e "${BLUE}🔐 Starting authentication testing...${NC}"
    
    # Test for common authentication bypasses
    local auth_tests=(
        "admin:admin"
        "admin:password"
        "admin:123456"
        "test:test"
        "user:user"
        "guest:guest"
    )
    
    for creds in "${auth_tests[@]}"; do
        local username=$(echo "$creds" | cut -d':' -f1)
        local password=$(echo "$creds" | cut -d':' -f2)
        
        echo "Testing credentials: $username:$password"
        
        curl -s -X POST "$TARGET_URL/api/login" \
             -H "Content-Type: application/json" \
             -d "{\"phoneNumber\":\"$username\",\"password\":\"$password\"}" \
             -w "Status: %{http_code}\n" \
             >> "$OUTPUT_DIR/auth_test_$TIMESTAMP.txt" 2>/dev/null || true
    done
    
    echo -e "${GREEN}✅ Authentication testing completed${NC}"
}

# API security testing
api_security_test() {
    echo -e "${BLUE}🔌 Starting API security testing...${NC}"
    
    # Test for common API vulnerabilities
    local api_tests=(
        "GET /api/users"
        "GET /api/admin"
        "GET /api/config"
        "GET /api/debug"
        "GET /api/logs"
        "GET /api/metrics"
        "GET /api/health"
        "GET /api/status"
    )
    
    for test in "${api_tests[@]}"; do
        local method=$(echo "$test" | cut -d' ' -f1)
        local endpoint=$(echo "$test" | cut -d' ' -f2)
        
        echo "Testing: $method $endpoint"
        
        curl -s -X "$method" "$TARGET_URL$endpoint" \
             -H "Authorization: Bearer $API_KEY" \
             -w "Status: %{http_code}\n" \
             >> "$OUTPUT_DIR/api_test_$TIMESTAMP.txt" 2>/dev/null || true
    done
    
    echo -e "${GREEN}✅ API security testing completed${NC}"
}

# Generate penetration test report
generate_report() {
    echo -e "${BLUE}📄 Generating penetration test report...${NC}"
    
    local report_file="$OUTPUT_DIR/penetration_report_$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# TaxiTap Penetration Test Report

**Test Date**: $(date)
**Target**: $TARGET_URL
**Tester**: Automated Penetration Testing Suite

## Executive Summary

This report contains the results of automated penetration testing performed on the TaxiTap application.

## Test Results

### Port Scanning
- **File**: nmap_scan_$TIMESTAMP.txt
- **Status**: Completed
- **Findings**: Check nmap output for open ports and services

### Web Vulnerability Scanning
- **Nikto Scan**: nikto_scan_$TIMESTAMP.txt
- **Directory Brute Force**: dirb_scan_$TIMESTAMP.txt
- **Status**: Completed

### SQL Injection Testing
- **Login Endpoint**: sqlmap_login_$TIMESTAMP/
- **Drivers Endpoint**: sqlmap_drivers_$TIMESTAMP/
- **Status**: Completed

### Authentication Testing
- **File**: auth_test_$TIMESTAMP.txt
- **Status**: Completed
- **Findings**: Check for successful authentication bypasses

### API Security Testing
- **File**: api_test_$TIMESTAMP.txt
- **Status**: Completed
- **Findings**: Check for unauthorized API access

## Recommendations

1. **Review all scan results** for potential vulnerabilities
2. **Implement proper authentication** on all protected endpoints
3. **Validate all user inputs** to prevent injection attacks
4. **Implement rate limiting** to prevent brute force attacks
5. **Regular security testing** should be performed

## Files Generated

- nmap_scan_$TIMESTAMP.txt
- nikto_scan_$TIMESTAMP.txt
- dirb_scan_$TIMESTAMP.txt
- sqlmap_login_$TIMESTAMP/
- sqlmap_drivers_$TIMESTAMP/
- auth_test_$TIMESTAMP.txt
- api_test_$TIMESTAMP.txt

## Next Steps

1. Review all generated files for security findings
2. Prioritize vulnerabilities by severity
3. Implement fixes for identified issues
4. Re-test after fixes are implemented

---
*Report generated by TaxiTap Penetration Testing Suite*
EOF

    echo -e "${GREEN}✅ Penetration test report generated: $report_file${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting TaxiTap Penetration Testing Suite${NC}"
    echo -e "${BLUE}Target: $TARGET_URL${NC}"
    echo -e "${BLUE}API Key: ${API_KEY:0:10}...${NC}"
    echo "=========================================="
    
    # Check prerequisites
    check_tools
    setup_output
    
    # Run penetration tests
    port_scan
    web_vuln_scan
    sql_injection_test
    auth_testing
    api_security_test
    
    # Generate report
    generate_report
    
    echo "=========================================="
    echo -e "${GREEN}✅ Penetration testing completed!${NC}"
    echo -e "${BLUE}Results saved to: $OUTPUT_DIR${NC}"
    echo -e "${BLUE}Report: penetration_report_$TIMESTAMP.md${NC}"
}

# Show usage
show_usage() {
    echo "Usage: $0 <target_url> [api_key]"
    echo ""
    echo "Examples:"
    echo "  $0 https://my-app.convex.cloud"
    echo "  $0 https://my-app.convex.cloud my-api-key"
    echo ""
    echo "Required tools:"
    echo "  - nmap (port scanning)"
    echo "  - sqlmap (SQL injection testing)"
    echo "  - nikto (web vulnerability scanning)"
    echo "  - dirb (directory brute force)"
}

# Check if help is requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Check if target URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Target URL is required${NC}"
    show_usage
    exit 1
fi

# Run main function
main
