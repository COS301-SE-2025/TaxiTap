#!/usr/bin/env python3

"""
TaxiTap Convex-Aware Security Tester
Tests Convex functions properly instead of REST endpoints
"""

import requests
import json
import time
from datetime import datetime

class ConvexSecurityTester:
    def __init__(self, convex_url):
        self.convex_url = convex_url.rstrip('/')
        self.results = []
        
    def log(self, message, level='INFO'):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] [{level}] {message}")
    
    def test_convex_function(self, function_name, args=None):
        """Test a Convex function properly"""
        url = f"{self.convex_url}/api/functions/{function_name}"
        
        payload = {
            "args": args or {}
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            return {
                'status_code': response.status_code,
                'response': response.text,
                'success': response.status_code < 400
            }
        except requests.RequestException as e:
            return {
                'error': str(e),
                'success': False
            }
    
    def test_authentication_security(self):
        """Test authentication on Convex functions"""
        self.log("🔐 Testing Convex authentication security...")
        
        # Test functions that should require authentication
        functions_to_test = [
            "functions.users.UserManagement.logInWithSMS.loginSMS",
            "functions.rides.RequestRide.requestRide",
            "functions.rides.acceptRide.acceptRide"
        ]
        
        for func in functions_to_test:
            result = self.test_convex_function(func, {"test": "data"})
            
            if result['success']:
                self.log(f"⚠️  {func}: Accessible without proper auth", 'WARNING')
            else:
                self.log(f"✅ {func}: Properly protected")
    
    def test_input_validation(self):
        """Test input validation on Convex functions"""
        self.log("📝 Testing Convex input validation...")
        
        # Test with invalid inputs
        invalid_inputs = [
            {"phoneNumber": "invalid", "password": "test"},
            {"phoneNumber": "12345678901234567890", "password": "test"},
            {"phoneNumber": "", "password": ""},
        ]
        
        for i, invalid_input in enumerate(invalid_inputs):
            result = self.test_convex_function(
                "functions.users.UserManagement.logInWithSMS.loginSMS",
                invalid_input
            )
            
            if result['success']:
                self.log(f"⚠️  Invalid input {i+1}: Accepted", 'WARNING')
            else:
                self.log(f"✅ Invalid input {i+1}: Properly rejected")
    
    def test_cors_security(self):
        """Test CORS configuration"""
        self.log("🌐 Testing CORS security...")
        
        # Test with malicious origin
        headers = {
            'Origin': 'https://malicious-site.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        
        try:
            response = requests.options(f"{self.convex_url}/api/functions/test", headers=headers)
            cors_origin = response.headers.get('Access-Control-Allow-Origin', '')
            
            if cors_origin == '*':
                self.log("⚠️  CORS allows all origins (*)", 'WARNING')
            elif cors_origin == 'https://malicious-site.com':
                self.log("🚨 CORS allows malicious origin", 'ERROR')
            else:
                self.log("✅ CORS properly configured")
                
        except requests.RequestException as e:
            self.log(f"Error testing CORS: {e}", 'ERROR')
    
    def run_convex_security_tests(self):
        """Run all Convex-specific security tests"""
        self.log("🚀 Starting Convex Security Testing")
        self.log(f"Target: {self.convex_url}")
        self.log("=" * 50)
        
        start_time = time.time()
        
        self.test_authentication_security()
        self.test_input_validation()
        self.test_cors_security()
        
        end_time = time.time()
        duration = end_time - start_time
        
        self.log("=" * 50)
        self.log(f"✅ Convex security testing completed in {duration:.2f} seconds")
        
        return {
            'duration': duration,
            'target': self.convex_url,
            'timestamp': datetime.now().isoformat()
        }

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python3 convex_security_tester.py <convex_url>")
        print("Example: python3 convex_security_tester.py https://affable-goose-538.convex.cloud")
        sys.exit(1)
    
    convex_url = sys.argv[1]
    tester = ConvexSecurityTester(convex_url)
    tester.run_convex_security_tests()

if __name__ == '__main__':
    main()
