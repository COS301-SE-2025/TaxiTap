#!/usr/bin/env python3

"""
TaxiTap Lightweight Security & Performance Tester
Safe testing that won't impact Convex free tier limits
"""

import requests
import time
import json
from datetime import datetime

class SafeTaxiTapTester:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.results = []
        self.request_count = 0
        self.max_requests = 20  # Limit to 20 requests total
        
    def log(self, message, level='INFO'):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] [{level}] {message}")
    
    def safe_request(self, method, endpoint, data=None, timeout=10):
        """Make a safe request with limits"""
        if self.request_count >= self.max_requests:
            self.log("Request limit reached (20 requests)", 'WARNING')
            return None
            
        self.request_count += 1
        url = f"{self.base_url}{endpoint}"
        
        try:
            start_time = time.time()
            
            if method.upper() == 'GET':
                response = requests.get(url, timeout=timeout)
            else:
                response = requests.post(url, json=data, timeout=timeout)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            return {
                'status_code': response.status_code,
                'response_time': response_time,
                'success': response.status_code < 400,
                'url': url
            }
            
        except requests.RequestException as e:
            return {
                'error': str(e),
                'success': False,
                'url': url
            }
    
    def test_basic_connectivity(self):
        """Test basic connectivity without making many requests"""
        self.log("🔍 Testing basic connectivity...")
        
        # Test 1: Basic health check (if available)
        result = self.safe_request('GET', '/health')
        if result:
            self.log(f"Health check: Status {result.get('status_code', 'N/A')}")
        
        # Test 2: Check if API is responding
        result = self.safe_request('GET', '/')
        if result:
            self.log(f"Root endpoint: Status {result.get('status_code', 'N/A')}")
        
        return True
    
    def test_security_basics(self):
        """Test basic security without heavy load"""
        self.log("🔒 Testing basic security...")
        
        security_tests = [
            {'name': 'Unauthorized Access', 'method': 'GET', 'endpoint': '/api/users'},
            {'name': 'Admin Endpoint', 'method': 'GET', 'endpoint': '/api/admin'},
            {'name': 'Config Endpoint', 'method': 'GET', 'endpoint': '/api/config'},
        ]
        
        for test in security_tests:
            result = self.safe_request(test['method'], test['endpoint'])
            if result:
                status_code = result.get('status_code', 'N/A')
                if result.get('success', False):
                    self.log(f"⚠️  {test['name']}: Accessible (Status {status_code})", 'WARNING')
                else:
                    self.log(f"✅ {test['name']}: Properly protected (Status {status_code})")
        
        return True
    
    def test_performance_basics(self):
        """Test basic performance with minimal requests"""
        self.log("⚡ Testing basic performance...")
        
        # Test response times for a few requests
        response_times = []
        
        for i in range(3):  # Only 3 requests
            result = self.safe_request('GET', '/')
            if result and 'response_time' in result:
                response_times.append(result['response_time'])
                self.log(f"Request {i+1}: {result['response_time']:.2f}ms")
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            self.log(f"Average response time: {avg_time:.2f}ms")
            
            if avg_time > 2000:
                self.log("⚠️  Response time is slow (>2s)", 'WARNING')
            else:
                self.log("✅ Response time is acceptable")
        
        return True
    
    def generate_safe_report(self):
        """Generate a lightweight report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'target': self.base_url,
            'total_requests': self.request_count,
            'max_requests_limit': self.max_requests,
            'test_type': 'lightweight_safe_testing',
            'convex_impact': 'minimal',
            'recommendations': [
                'This was a lightweight test with minimal Convex usage',
                'For comprehensive testing, consider upgrading to Convex Pro',
                'Or run tests during off-peak hours to minimize impact'
            ]
        }
        
        return report
    
    def run_safe_tests(self):
        """Run all safe tests"""
        self.log("🚀 Starting Safe TaxiTap Testing")
        self.log(f"Target: {self.base_url}")
        self.log(f"Request limit: {self.max_requests} requests")
        self.log("=" * 50)
        
        start_time = time.time()
        
        # Run tests
        self.test_basic_connectivity()
        self.test_security_basics()
        self.test_performance_basics()
        
        end_time = time.time()
        duration = end_time - start_time
        
        self.log("=" * 50)
        self.log(f"✅ Safe testing completed in {duration:.2f} seconds")
        self.log(f"📊 Total requests made: {self.request_count}")
        
        # Generate report
        report = self.generate_safe_report()
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"safe_test_report_{timestamp}.json"
        
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.log(f"📄 Safe test report saved: {report_filename}")
        
        return report

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python3 safe_tester.py <convex_url>")
        print("Example: python3 safe_tester.py https://affable-goose-538.convex.cloud")
        sys.exit(1)
    
    base_url = sys.argv[1]
    tester = SafeTaxiTapTester(base_url)
    tester.run_safe_tests()

if __name__ == '__main__':
    main()
