#!/usr/bin/env python3

"""
TaxiTap Performance Profiler
Advanced performance profiling and bottleneck identification
"""

import time
import psutil
import requests
import json
import threading
import queue
from datetime import datetime
import argparse
import sys
import os

class PerformanceProfiler:
    def __init__(self, target_url, api_key=None):
        self.target_url = target_url
        self.api_key = api_key
        self.metrics = {
            'cpu_usage': [],
            'memory_usage': [],
            'network_io': [],
            'disk_io': [],
            'response_times': [],
            'throughput': []
        }
        self.profiling_active = False
        
    def start_system_monitoring(self, duration=60):
        """Monitor system resources during performance testing"""
        print(f"🔍 Starting system monitoring for {duration} seconds...")
        
        self.profiling_active = True
        start_time = time.time()
        
        while self.profiling_active and (time.time() - start_time) < duration:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Network I/O
            network = psutil.net_io_counters()
            
            # Disk I/O
            disk = psutil.disk_io_counters()
            
            timestamp = datetime.now().isoformat()
            
            self.metrics['cpu_usage'].append({
                'timestamp': timestamp,
                'cpu_percent': cpu_percent,
                'cpu_count': psutil.cpu_count()
            })
            
            self.metrics['memory_usage'].append({
                'timestamp': timestamp,
                'total': memory.total,
                'available': memory.available,
                'percent': memory.percent,
                'used': memory.used
            })
            
            self.metrics['network_io'].append({
                'timestamp': timestamp,
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            })
            
            self.metrics['disk_io'].append({
                'timestamp': timestamp,
                'read_count': disk.read_count,
                'write_count': disk.write_count,
                'read_bytes': disk.read_bytes,
                'write_bytes': disk.write_bytes
            })
            
            time.sleep(1)
        
        print("✅ System monitoring completed")
    
    def profile_api_endpoint(self, endpoint, method='GET', data=None, iterations=100):
        """Profile a specific API endpoint"""
        print(f"📊 Profiling {method} {endpoint} ({iterations} iterations)")
        
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        
        response_times = []
        errors = []
        
        for i in range(iterations):
            start_time = time.time()
            
            try:
                if method.upper() == 'GET':
                    response = requests.get(f"{self.target_url}{endpoint}", headers=headers, timeout=30)
                else:
                    response = requests.post(f"{self.target_url}{endpoint}", json=data, headers=headers, timeout=30)
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                
                response_times.append(response_time)
                
                if response.status_code >= 400:
                    errors.append({
                        'iteration': i,
                        'status_code': response.status_code,
                        'response_time': response_time
                    })
                
            except requests.RequestException as e:
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                errors.append({
                    'iteration': i,
                    'error': str(e),
                    'response_time': response_time
                })
            
            # Small delay between requests
            time.sleep(0.1)
        
        # Calculate statistics
        if response_times:
            stats = {
                'min': min(response_times),
                'max': max(response_times),
                'avg': sum(response_times) / len(response_times),
                'p50': sorted(response_times)[len(response_times) // 2],
                'p95': sorted(response_times)[int(len(response_times) * 0.95)],
                'p99': sorted(response_times)[int(len(response_times) * 0.99)]
            }
        else:
            stats = {'min': 0, 'max': 0, 'avg': 0, 'p50': 0, 'p95': 0, 'p99': 0}
        
        result = {
            'endpoint': endpoint,
            'method': method,
            'iterations': iterations,
            'stats': stats,
            'error_rate': len(errors) / iterations * 100,
            'errors': errors[:10],  # Keep first 10 errors
            'timestamp': datetime.now().isoformat()
        }
        
        self.metrics['response_times'].append(result)
        
        print(f"  Response Time Stats:")
        print(f"    Min: {stats['min']:.2f}ms")
        print(f"    Max: {stats['max']:.2f}ms")
        print(f"    Avg: {stats['avg']:.2f}ms")
        print(f"    P95: {stats['p95']:.2f}ms")
        print(f"    P99: {stats['p99']:.2f}ms")
        print(f"    Error Rate: {result['error_rate']:.2f}%")
        
        return result
    
    def profile_concurrent_load(self, endpoint, method='GET', data=None, concurrency=10, duration=60):
        """Profile concurrent load on an endpoint"""
        print(f"🚀 Profiling concurrent load: {concurrency} users for {duration}s")
        
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        
        results_queue = queue.Queue()
        start_time = time.time()
        end_time = start_time + duration
        
        def worker():
            request_count = 0
            while time.time() < end_time:
                request_start = time.time()
                
                try:
                    if method.upper() == 'GET':
                        response = requests.get(f"{self.target_url}{endpoint}", headers=headers, timeout=30)
                    else:
                        response = requests.post(f"{self.target_url}{endpoint}", json=data, headers=headers, timeout=30)
                    
                    request_end = time.time()
                    response_time = (request_end - request_start) * 1000
                    
                    results_queue.put({
                        'success': True,
                        'status_code': response.status_code,
                        'response_time': response_time,
                        'timestamp': request_start
                    })
                    
                except requests.RequestException as e:
                    request_end = time.time()
                    response_time = (request_end - request_start) * 1000
                    
                    results_queue.put({
                        'success': False,
                        'error': str(e),
                        'response_time': response_time,
                        'timestamp': request_start
                    })
                
                request_count += 1
        
        # Start worker threads
        threads = []
        for i in range(concurrency):
            thread = threading.Thread(target=worker)
            thread.start()
            threads.append(thread)
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Calculate throughput
        actual_duration = time.time() - start_time
        total_requests = len(results)
        requests_per_second = total_requests / actual_duration
        
        # Calculate response time statistics
        response_times = [r['response_time'] for r in results if r['success']]
        if response_times:
            stats = {
                'min': min(response_times),
                'max': max(response_times),
                'avg': sum(response_times) / len(response_times),
                'p50': sorted(response_times)[len(response_times) // 2],
                'p95': sorted(response_times)[int(len(response_times) * 0.95)],
                'p99': sorted(response_times)[int(len(response_times) * 0.99)]
            }
        else:
            stats = {'min': 0, 'max': 0, 'avg': 0, 'p50': 0, 'p95': 0, 'p99': 0}
        
        # Calculate error rate
        error_count = sum(1 for r in results if not r['success'])
        error_rate = error_count / total_requests * 100 if total_requests > 0 else 0
        
        result = {
            'endpoint': endpoint,
            'method': method,
            'concurrency': concurrency,
            'duration': actual_duration,
            'total_requests': total_requests,
            'requests_per_second': requests_per_second,
            'error_rate': error_rate,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        }
        
        self.metrics['throughput'].append(result)
        
        print(f"  Throughput: {requests_per_second:.2f} req/s")
        print(f"  Total Requests: {total_requests}")
        print(f"  Error Rate: {error_rate:.2f}%")
        print(f"  Avg Response Time: {stats['avg']:.2f}ms")
        
        return result
    
    def identify_bottlenecks(self):
        """Identify performance bottlenecks based on collected metrics"""
        print("🔍 Analyzing performance bottlenecks...")
        
        bottlenecks = []
        
        # Analyze CPU usage
        if self.metrics['cpu_usage']:
            avg_cpu = sum(m['cpu_percent'] for m in self.metrics['cpu_usage']) / len(self.metrics['cpu_usage'])
            if avg_cpu > 80:
                bottlenecks.append({
                    'type': 'CPU',
                    'severity': 'HIGH',
                    'description': f'High CPU usage: {avg_cpu:.1f}%',
                    'recommendation': 'Consider CPU optimization or scaling'
                })
            elif avg_cpu > 60:
                bottlenecks.append({
                    'type': 'CPU',
                    'severity': 'MEDIUM',
                    'description': f'Moderate CPU usage: {avg_cpu:.1f}%',
                    'recommendation': 'Monitor CPU usage and consider optimization'
                })
        
        # Analyze memory usage
        if self.metrics['memory_usage']:
            avg_memory = sum(m['percent'] for m in self.metrics['memory_usage']) / len(self.metrics['memory_usage'])
            if avg_memory > 90:
                bottlenecks.append({
                    'type': 'Memory',
                    'severity': 'HIGH',
                    'description': f'High memory usage: {avg_memory:.1f}%',
                    'recommendation': 'Consider memory optimization or scaling'
                })
            elif avg_memory > 75:
                bottlenecks.append({
                    'type': 'Memory',
                    'severity': 'MEDIUM',
                    'description': f'Moderate memory usage: {avg_memory:.1f}%',
                    'recommendation': 'Monitor memory usage and consider optimization'
                })
        
        # Analyze response times
        if self.metrics['response_times']:
            for result in self.metrics['response_times']:
                if result['stats']['p95'] > 3000:  # 3 seconds
                    bottlenecks.append({
                        'type': 'Response Time',
                        'severity': 'HIGH',
                        'description': f'Slow response time on {result["endpoint"]}: P95={result["stats"]["p95"]:.0f}ms',
                        'recommendation': 'Optimize endpoint performance or implement caching'
                    })
                elif result['stats']['p95'] > 1000:  # 1 second
                    bottlenecks.append({
                        'type': 'Response Time',
                        'severity': 'MEDIUM',
                        'description': f'Moderate response time on {result["endpoint"]}: P95={result["stats"]["p95"]:.0f}ms',
                        'recommendation': 'Consider performance optimization'
                    })
        
        # Analyze throughput
        if self.metrics['throughput']:
            for result in self.metrics['throughput']:
                if result['requests_per_second'] < 50:
                    bottlenecks.append({
                        'type': 'Throughput',
                        'severity': 'MEDIUM',
                        'description': f'Low throughput on {result["endpoint"]}: {result["requests_per_second"]:.1f} req/s',
                        'recommendation': 'Consider scaling or optimization'
                    })
        
        return bottlenecks
    
    def generate_report(self):
        """Generate comprehensive performance profiling report"""
        bottlenecks = self.identify_bottlenecks()
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'target': self.target_url,
            'summary': {
                'total_tests': len(self.metrics['response_times']) + len(self.metrics['throughput']),
                'bottlenecks_found': len(bottlenecks),
                'critical_bottlenecks': len([b for b in bottlenecks if b['severity'] == 'HIGH']),
                'medium_bottlenecks': len([b for b in bottlenecks if b['severity'] == 'MEDIUM'])
            },
            'metrics': self.metrics,
            'bottlenecks': bottlenecks,
            'recommendations': self.get_recommendations(bottlenecks)
        }
        
        return report
    
    def get_recommendations(self, bottlenecks):
        """Generate recommendations based on identified bottlenecks"""
        recommendations = []
        
        # CPU recommendations
        cpu_bottlenecks = [b for b in bottlenecks if b['type'] == 'CPU']
        if cpu_bottlenecks:
            recommendations.append({
                'category': 'CPU Optimization',
                'priority': 'HIGH',
                'recommendations': [
                    'Implement CPU profiling to identify hotspots',
                    'Consider using more efficient algorithms',
                    'Implement caching to reduce CPU load',
                    'Consider horizontal scaling'
                ]
            })
        
        # Memory recommendations
        memory_bottlenecks = [b for b in bottlenecks if b['type'] == 'Memory']
        if memory_bottlenecks:
            recommendations.append({
                'category': 'Memory Optimization',
                'priority': 'HIGH',
                'recommendations': [
                    'Implement memory profiling',
                    'Optimize data structures and algorithms',
                    'Implement memory pooling',
                    'Consider garbage collection tuning'
                ]
            })
        
        # Response time recommendations
        response_bottlenecks = [b for b in bottlenecks if b['type'] == 'Response Time']
        if response_bottlenecks:
            recommendations.append({
                'category': 'Response Time Optimization',
                'priority': 'HIGH',
                'recommendations': [
                    'Implement database query optimization',
                    'Add caching layers (Redis, Memcached)',
                    'Implement CDN for static content',
                    'Optimize API endpoints'
                ]
            })
        
        # Throughput recommendations
        throughput_bottlenecks = [b for b in bottlenecks if b['type'] == 'Throughput']
        if throughput_bottlenecks:
            recommendations.append({
                'category': 'Throughput Optimization',
                'priority': 'MEDIUM',
                'recommendations': [
                    'Implement load balancing',
                    'Consider horizontal scaling',
                    'Optimize database connections',
                    'Implement connection pooling'
                ]
            })
        
        return recommendations
    
    def run_comprehensive_profiling(self):
        """Run comprehensive performance profiling"""
        print("🚀 Starting TaxiTap Performance Profiling")
        print(f"Target: {self.target_url}")
        print("=" * 60)
        
        # Start system monitoring in background
        monitoring_thread = threading.Thread(target=self.start_system_monitoring, args=(120,))
        monitoring_thread.start()
        
        # Test core endpoints
        core_endpoints = [
            {'endpoint': '/api/requestRide', 'method': 'POST', 'data': {'passengerId': 'test', 'startLocation': {'lat': -26.2041, 'lng': 28.0473}}},
            {'endpoint': '/api/updateUserLocation', 'method': 'POST', 'data': {'userId': 'test', 'latitude': -26.2041, 'longitude': 28.0473}},
            {'endpoint': '/api/getNearbyDrivers', 'method': 'GET', 'data': {'latitude': -26.2041, 'longitude': 28.0473}},
            {'endpoint': '/api/acceptRide', 'method': 'POST', 'data': {'rideId': 'test', 'driverId': 'test'}}
        ]
        
        # Profile individual endpoints
        for endpoint in core_endpoints:
            self.profile_api_endpoint(endpoint['endpoint'], endpoint['method'], endpoint['data'], 50)
        
        # Profile concurrent load
        for endpoint in core_endpoints[:2]:  # Test first 2 endpoints
            self.profile_concurrent_load(endpoint['endpoint'], endpoint['method'], endpoint['data'], 10, 30)
        
        # Stop monitoring
        self.profiling_active = False
        monitoring_thread.join()
        
        # Generate report
        report = self.generate_report()
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"performance_profile_report_{timestamp}.json"
        
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print("=" * 60)
        print(f"✅ Performance profiling completed")
        print(f"📄 Report saved: {report_filename}")
        
        # Print summary
        print(f"\n📊 Profiling Summary:")
        print(f"  Total Tests: {report['summary']['total_tests']}")
        print(f"  Bottlenecks Found: {report['summary']['bottlenecks_found']}")
        print(f"  Critical Issues: {report['summary']['critical_bottlenecks']}")
        print(f"  Medium Issues: {report['summary']['medium_bottlenecks']}")
        
        if bottlenecks:
            print(f"\n🚨 Identified Bottlenecks:")
            for bottleneck in bottlenecks:
                print(f"  [{bottleneck['severity']}] {bottleneck['type']}: {bottleneck['description']}")
        
        return report

def main():
    parser = argparse.ArgumentParser(description='TaxiTap Performance Profiler')
    parser.add_argument('--url', required=True, help='Base URL of the TaxiTap application')
    parser.add_argument('--api-key', help='API key for authenticated requests')
    
    args = parser.parse_args()
    
    profiler = PerformanceProfiler(args.url, args.api_key)
    profiler.run_comprehensive_profiling()

if __name__ == '__main__':
    main()


