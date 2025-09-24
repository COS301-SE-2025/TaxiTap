#!/usr/bin/env python3

"""
TaxiTap Security Testing Suite
Comprehensive security testing for authentication, authorization, and data protection
"""

import requests
import json
import time
import random
import string
import hashlib
import hmac
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse
import sys
from urllib.parse import urljoin
import sqlite3
from datetime import datetime, timedelta

class TaxiTapSecurityTester:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TaxiTap-Security-Tester/1.0'
        })
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
        
        self.vulnerabilities = []
        self.test_results = {}
        
    def log_vulnerability(self, severity, test_name, description, evidence=None):
        """Log a security vulnerability"""
        vuln = {
            'timestamp': datetime.now().isoformat(),
            'severity': severity,
            'test': test_name,
            'description': description,
            'evidence': evidence
        }
        self.vulnerabilities.append(vuln)
        print(f"[{severity.upper()}] {test_name}: {description}")
        if evidence:
            print(f"  Evidence: {evidence}")

    def test_authentication_bypass(self):
        """Test for authentication bypass vulnerabilities"""
        print("\n🔐 Testing Authentication Bypass...")
        
        # Test 1: Access protected endpoints without authentication
        protected_endpoints = [
            '/api/requestRide',
            '/api/acceptRide',
            '/api/updateUserLocation',
            '/api/getNearbyDrivers',
            '/api/completeRide'
        ]
        
        for endpoint in protected_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    self.log_vulnerability(
                        'HIGH', 
                        'Authentication Bypass',
                        f'Protected endpoint {endpoint} accessible without authentication',
                        f'Status: {response.status_code}'
                    )
                elif response.status_code not in [401, 403]:
                    self.log_vulnerability(
                        'MEDIUM',
                        'Unexpected Response',
                        f'Endpoint {endpoint} returned unexpected status {response.status_code}',
                        f'Expected: 401/403, Got: {response.status_code}'
                    )
            except requests.RequestException as e:
                print(f"  Error testing {endpoint}: {e}")

    def test_sql_injection(self):
        """Test for SQL injection vulnerabilities"""
        print("\n💉 Testing SQL Injection...")
        
        # Common SQL injection payloads
        sql_payloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users--",
            "admin'--",
            "' OR 'x'='x",
            "1' OR '1'='1' /*",
            "1' AND '1'='1"
        ]
        
        # Test endpoints that might be vulnerable
        test_endpoints = [
            {'url': '/api/login', 'method': 'POST', 'data': {'phoneNumber': 'PAYLOAD', 'password': 'test'}},
            {'url': '/api/getNearbyDrivers', 'method': 'GET', 'params': {'latitude': 'PAYLOAD', 'longitude': '28.0473'}},
            {'url': '/api/requestRide', 'method': 'POST', 'data': {'passengerId': 'PAYLOAD', 'startLocation': {'address': 'PAYLOAD'}}}
        ]
        
        for endpoint in test_endpoints:
            for payload in sql_payloads:
                try:
                    if endpoint['method'] == 'GET':
                        params = {k: payload if v == 'PAYLOAD' else v for k, v in endpoint['params'].items()}
                        response = self.session.get(f"{self.base_url}{endpoint['url']}", params=params, timeout=10)
                    else:
                        data = {k: payload if v == 'PAYLOAD' else v for k, v in endpoint['data'].items()}
                        response = self.session.post(f"{self.base_url}{endpoint['url']}", json=data, timeout=10)
                    
                    # Check for SQL error patterns
                    error_patterns = [
                        'sql syntax',
                        'mysql_fetch',
                        'ORA-01756',
                        'Microsoft OLE DB Provider',
                        'PostgreSQL query failed',
                        'Warning: mysql_',
                        'valid MySQL result',
                        'MySqlClient\.',
                        'SQLServer JDBC Driver',
                        'ODBC SQL Server Driver',
                        'ORA-00921',
                        'ORA-00933',
                        'Oracle error',
                        'Oracle driver',
                        'PostgresException',
                        'Warning: pg_',
                        'valid PostgreSQL result',
                        'Npgsql\.',
                        'PG::SyntaxError',
                        'ERROR: syntax error'
                    ]
                    
                    response_text = response.text.lower()
                    for pattern in error_patterns:
                        if pattern in response_text:
                            self.log_vulnerability(
                                'HIGH',
                                'SQL Injection',
                                f'SQL injection detected in {endpoint["url"]}',
                                f'Payload: {payload}, Pattern: {pattern}'
                            )
                            break
                            
                except requests.RequestException as e:
                    print(f"  Error testing SQL injection on {endpoint['url']}: {e}")

    def test_xss_vulnerabilities(self):
        """Test for Cross-Site Scripting (XSS) vulnerabilities"""
        print("\n🌐 Testing XSS Vulnerabilities...")
        
        xss_payloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            'javascript:alert("XSS")',
            '<svg onload=alert("XSS")>',
            '"><script>alert("XSS")</script>',
            "'><script>alert('XSS')</script>",
            '<iframe src="javascript:alert(\'XSS\')">',
            '<body onload=alert("XSS")>',
            '<input onfocus=alert("XSS") autofocus>',
            '<select onfocus=alert("XSS") autofocus>'
        ]
        
        # Test endpoints that accept user input
        test_endpoints = [
            {'url': '/api/requestRide', 'method': 'POST', 'data': {'startLocation': {'address': 'PAYLOAD'}}},
            {'url': '/api/updateUserLocation', 'method': 'POST', 'data': {'userId': 'PAYLOAD'}},
            {'url': '/api/completeRide', 'method': 'POST', 'data': {'rideId': 'PAYLOAD'}}
        ]
        
        for endpoint in test_endpoints:
            for payload in xss_payloads:
                try:
                    data = {}
                    for key, value in endpoint['data'].items():
                        if value == 'PAYLOAD':
                            data[key] = payload
                        elif isinstance(value, dict):
                            data[key] = {k: payload if v == 'PAYLOAD' else v for k, v in value.items()}
                        else:
                            data[key] = value
                    
                    response = self.session.post(f"{self.base_url}{endpoint['url']}", json=data, timeout=10)
                    
                    # Check if payload is reflected in response
                    if payload in response.text:
                        self.log_vulnerability(
                            'HIGH',
                            'XSS Vulnerability',
                            f'XSS payload reflected in {endpoint["url"]}',
                            f'Payload: {payload}'
                        )
                        
                except requests.RequestException as e:
                    print(f"  Error testing XSS on {endpoint['url']}: {e}")

    def test_authorization_flaws(self):
        """Test for authorization and privilege escalation vulnerabilities"""
        print("\n🔑 Testing Authorization Flaws...")
        
        # Test horizontal privilege escalation
        test_cases = [
            {
                'name': 'Access Other User Data',
                'endpoint': '/api/getUserProfile',
                'method': 'GET',
                'params': {'userId': 'other_user_id'}
            },
            {
                'name': 'Access Other User Rides',
                'endpoint': '/api/getUserRides',
                'method': 'GET',
                'params': {'userId': 'other_user_id'}
            },
            {
                'name': 'Modify Other User Data',
                'endpoint': '/api/updateUserProfile',
                'method': 'POST',
                'data': {'userId': 'other_user_id', 'name': 'Hacked'}
            }
        ]
        
        for test_case in test_cases:
            try:
                if test_case['method'] == 'GET':
                    response = self.session.get(f"{self.base_url}{test_case['endpoint']}", params=test_case['params'], timeout=10)
                else:
                    response = self.session.post(f"{self.base_url}{test_case['endpoint']}", json=test_case['data'], timeout=10)
                
                if response.status_code == 200:
                    self.log_vulnerability(
                        'HIGH',
                        'Authorization Bypass',
                        f'{test_case["name"]} - Unauthorized access allowed',
                        f'Status: {response.status_code}'
                    )
                    
            except requests.RequestException as e:
                print(f"  Error testing authorization on {test_case['endpoint']}: {e}")

    def test_input_validation(self):
        """Test for input validation vulnerabilities"""
        print("\n📝 Testing Input Validation...")
        
        # Test various input validation scenarios
        validation_tests = [
            {
                'name': 'Phone Number Validation',
                'endpoint': '/api/login',
                'method': 'POST',
                'data': {'phoneNumber': 'invalid_phone', 'password': 'test'},
                'expected_status': 400
            },
            {
                'name': 'Email Validation',
                'endpoint': '/api/signup',
                'method': 'POST',
                'data': {'email': 'invalid_email', 'password': 'test'},
                'expected_status': 400
            },
            {
                'name': 'Coordinate Validation',
                'endpoint': '/api/updateUserLocation',
                'method': 'POST',
                'data': {'latitude': 'invalid_lat', 'longitude': 'invalid_lng'},
                'expected_status': 400
            },
            {
                'name': 'Large Input',
                'endpoint': '/api/requestRide',
                'method': 'POST',
                'data': {'startLocation': {'address': 'A' * 10000}},
                'expected_status': 400
            }
        ]
        
        for test in validation_tests:
            try:
                response = self.session.post(f"{self.base_url}{test['endpoint']}", json=test['data'], timeout=10)
                
                if response.status_code != test['expected_status']:
                    self.log_vulnerability(
                        'MEDIUM',
                        'Input Validation',
                        f'{test["name"]} - Unexpected response status',
                        f'Expected: {test["expected_status"]}, Got: {response.status_code}'
                    )
                    
            except requests.RequestException as e:
                print(f"  Error testing input validation on {test['endpoint']}: {e}")

    def test_rate_limiting(self):
        """Test for rate limiting vulnerabilities"""
        print("\n⏱️ Testing Rate Limiting...")
        
        # Test rapid requests to sensitive endpoints
        sensitive_endpoints = [
            '/api/login',
            '/api/signup',
            '/api/requestRide',
            '/api/updateUserLocation'
        ]
        
        for endpoint in sensitive_endpoints:
            try:
                # Send 100 rapid requests
                responses = []
                for i in range(100):
                    response = self.session.post(f"{self.base_url}{endpoint}", json={'test': 'data'}, timeout=5)
                    responses.append(response.status_code)
                    time.sleep(0.01)  # Small delay
                
                # Check if rate limiting is implemented
                success_count = sum(1 for status in responses if status == 200)
                if success_count > 50:  # Allow some successful requests
                    self.log_vulnerability(
                        'MEDIUM',
                        'Rate Limiting',
                        f'No rate limiting detected on {endpoint}',
                        f'Successful requests: {success_count}/100'
                    )
                    
            except requests.RequestException as e:
                print(f"  Error testing rate limiting on {endpoint}: {e}")

    def test_data_exposure(self):
        """Test for sensitive data exposure"""
        print("\n🔍 Testing Data Exposure...")
        
        # Test for information disclosure
        test_endpoints = [
            '/api/health',
            '/api/status',
            '/api/version',
            '/api/debug',
            '/api/admin',
            '/api/config',
            '/api/logs',
            '/api/metrics'
        ]
        
        for endpoint in test_endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                
                if response.status_code == 200:
                    # Check for sensitive information
                    sensitive_patterns = [
                        'password',
                        'secret',
                        'key',
                        'token',
                        'database',
                        'connection',
                        'config',
                        'admin',
                        'debug'
                    ]
                    
                    response_text = response.text.lower()
                    for pattern in sensitive_patterns:
                        if pattern in response_text:
                            self.log_vulnerability(
                                'MEDIUM',
                                'Information Disclosure',
                                f'Sensitive information exposed in {endpoint}',
                                f'Pattern: {pattern}'
                            )
                            break
                            
            except requests.RequestException as e:
                print(f"  Error testing data exposure on {endpoint}: {e}")

    def test_session_management(self):
        """Test session management security"""
        print("\n🔐 Testing Session Management...")
        
        # Test session fixation
        try:
            # Create a session
            session1 = requests.Session()
            response1 = session1.get(f"{self.base_url}/api/login", timeout=10)
            
            # Try to reuse session token
            session2 = requests.Session()
            if 'Set-Cookie' in response1.headers:
                session2.headers.update({'Cookie': response1.headers['Set-Cookie']})
                response2 = session2.get(f"{self.base_url}/api/protected", timeout=10)
                
                if response2.status_code == 200:
                    self.log_vulnerability(
                        'HIGH',
                        'Session Fixation',
                        'Session tokens can be reused across sessions',
                        f'Status: {response2.status_code}'
                    )
                    
        except requests.RequestException as e:
            print(f"  Error testing session management: {e}")

    def test_cors_policy(self):
        """Test CORS policy security"""
        print("\n🌐 Testing CORS Policy...")
        
        try:
            # Test CORS preflight request
            headers = {
                'Origin': 'https://malicious-site.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = self.session.options(f"{self.base_url}/api/requestRide", headers=headers, timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if cors_headers['Access-Control-Allow-Origin'] == '*':
                self.log_vulnerability(
                    'MEDIUM',
                    'CORS Misconfiguration',
                    'CORS allows all origins (*)',
                    f'Headers: {cors_headers}'
                )
            elif cors_headers['Access-Control-Allow-Origin'] == 'https://malicious-site.com':
                self.log_vulnerability(
                    'HIGH',
                    'CORS Vulnerability',
                    'CORS allows malicious origin',
                    f'Headers: {cors_headers}'
                )
                
        except requests.RequestException as e:
            print(f"  Error testing CORS policy: {e}")

    def generate_security_report(self):
        """Generate comprehensive security test report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'target': self.base_url,
            'total_vulnerabilities': len(self.vulnerabilities),
            'severity_breakdown': {
                'HIGH': len([v for v in self.vulnerabilities if v['severity'] == 'HIGH']),
                'MEDIUM': len([v for v in self.vulnerabilities if v['severity'] == 'MEDIUM']),
                'LOW': len([v for v in self.vulnerabilities if v['severity'] == 'LOW'])
            },
            'vulnerabilities': self.vulnerabilities,
            'recommendations': self.get_security_recommendations()
        }
        
        return report

    def get_security_recommendations(self):
        """Get security recommendations based on findings"""
        recommendations = []
        
        if any(v['test'] == 'Authentication Bypass' for v in self.vulnerabilities):
            recommendations.append({
                'category': 'Authentication',
                'priority': 'HIGH',
                'recommendation': 'Implement proper authentication checks on all protected endpoints',
                'details': 'Ensure all API endpoints validate user authentication before processing requests'
            })
        
        if any(v['test'] == 'SQL Injection' for v in self.vulnerabilities):
            recommendations.append({
                'category': 'Input Validation',
                'priority': 'HIGH',
                'recommendation': 'Implement parameterized queries and input sanitization',
                'details': 'Use prepared statements and validate all user inputs to prevent SQL injection'
            })
        
        if any(v['test'] == 'XSS Vulnerability' for v in self.vulnerabilities):
            recommendations.append({
                'category': 'Input Validation',
                'priority': 'HIGH',
                'recommendation': 'Implement output encoding and input validation',
                'details': 'Sanitize user inputs and encode outputs to prevent XSS attacks'
            })
        
        if any(v['test'] == 'Rate Limiting' for v in self.vulnerabilities):
            recommendations.append({
                'category': 'Rate Limiting',
                'priority': 'MEDIUM',
                'recommendation': 'Implement rate limiting on sensitive endpoints',
                'details': 'Add rate limiting to prevent brute force attacks and DoS'
            })
        
        return recommendations

    def run_all_tests(self):
        """Run all security tests"""
        print("🚀 Starting TaxiTap Security Testing Suite...")
        print(f"Target: {self.base_url}")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all security tests
        self.test_authentication_bypass()
        self.test_sql_injection()
        self.test_xss_vulnerabilities()
        self.test_authorization_flaws()
        self.test_input_validation()
        self.test_rate_limiting()
        self.test_data_exposure()
        self.test_session_management()
        self.test_cors_policy()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 60)
        print(f"✅ Security testing completed in {duration:.2f} seconds")
        print(f"📊 Total vulnerabilities found: {len(self.vulnerabilities)}")
        
        # Generate and save report
        report = self.generate_security_report()
        
        # Save report to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"security_test_report_{timestamp}.json"
        
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Security report saved: {report_filename}")
        
        return report

def main():
    parser = argparse.ArgumentParser(description='TaxiTap Security Testing Suite')
    parser.add_argument('--url', required=True, help='Base URL of the TaxiTap application')
    parser.add_argument('--api-key', help='API key for authenticated requests')
    parser.add_argument('--output', help='Output file for the security report')
    
    args = parser.parse_args()
    
    # Create security tester instance
    tester = TaxiTapSecurityTester(args.url, args.api_key)
    
    # Run all security tests
    report = tester.run_all_tests()
    
    # Print summary
    print("\n📋 Security Test Summary:")
    print(f"  High Severity: {report['severity_breakdown']['HIGH']}")
    print(f"  Medium Severity: {report['severity_breakdown']['MEDIUM']}")
    print(f"  Low Severity: {report['severity_breakdown']['LOW']}")
    
    if report['vulnerabilities']:
        print("\n🚨 Vulnerabilities Found:")
        for vuln in report['vulnerabilities']:
            print(f"  [{vuln['severity']}] {vuln['test']}: {vuln['description']}")
    
    if report['recommendations']:
        print("\n💡 Recommendations:")
        for rec in report['recommendations']:
            print(f"  [{rec['priority']}] {rec['category']}: {rec['recommendation']}")

if __name__ == '__main__':
    main()
