#!/usr/bin/env python3
"""
Test runner script for the comprehensive test suite.

Provides convenient commands to run different types of tests
with appropriate configurations and reporting.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list, description: str) -> int:
    """Run a command and return the exit code."""
    print(f"\n{'=' * 60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'=' * 60}")
    
    result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)
    return result.returncode


def main():
    parser = argparse.ArgumentParser(
        description="Run comprehensive test suite for Python backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_tests.py --all                    # Run all tests
  python run_tests.py --unit                   # Run only unit tests
  python run_tests.py --integration           # Run only integration tests
  python run_tests.py --api                   # Run only API tests
  python run_tests.py --performance           # Run only performance tests
  python run_tests.py --coverage              # Run with coverage report
  python run_tests.py --fast                  # Run fast tests only
  python run_tests.py --verbose               # Verbose output
  python run_tests.py --parallel              # Run tests in parallel
        """
    )
    
    # Test categories
    parser.add_argument('--all', action='store_true', help='Run all tests')
    parser.add_argument('--unit', action='store_true', help='Run unit tests')
    parser.add_argument('--integration', action='store_true', help='Run integration tests')
    parser.add_argument('--api', action='store_true', help='Run API tests')
    parser.add_argument('--performance', action='store_true', help='Run performance tests')
    parser.add_argument('--slow', action='store_true', help='Include slow tests')
    
    # Test options
    parser.add_argument('--coverage', action='store_true', help='Run with coverage report')
    parser.add_argument('--fast', action='store_true', help='Run fast tests only (exclude slow)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--parallel', '-n', type=int, help='Run tests in parallel (specify worker count)')
    parser.add_argument('--failfast', action='store_true', help='Stop on first failure')
    parser.add_argument('--lf', action='store_true', help='Run last failed tests')
    parser.add_argument('--tb', choices=['short', 'long', 'line', 'no'], default='short', help='Traceback format')
    
    # Filtering
    parser.add_argument('--keyword', '-k', help='Run tests matching keyword expression')
    parser.add_argument('--markers', '-m', help='Run tests matching marker expression')
    parser.add_argument('--path', help='Run tests in specific path')
    
    # Reporting
    parser.add_argument('--junit-xml', help='Generate JUnit XML report')
    parser.add_argument('--html-report', help='Generate HTML coverage report')
    parser.add_argument('--json-report', help='Generate JSON test report')
    
    args = parser.parse_args()
    
    # Build pytest command
    cmd = ['python', '-m', 'pytest']
    
    # Add test paths based on categories
    test_paths = []
    if args.all:
        test_paths = ['tests/']
    else:
        if args.unit:
            test_paths.append('tests/unit/')
        if args.integration:
            test_paths.append('tests/integration/')
        if args.api:
            test_paths.append('tests/api/')
        if args.performance:
            test_paths.append('tests/performance/')
        
        # If no specific category selected, run unit and integration
        if not test_paths and not args.path:
            test_paths = ['tests/unit/', 'tests/integration/']
    
    if args.path:
        test_paths = [args.path]
    
    cmd.extend(test_paths)
    
    # Add markers/filters
    if args.fast:
        cmd.extend(['-m', 'not slow'])
    elif args.slow:
        cmd.extend(['-m', 'slow'])
    
    if args.markers:
        cmd.extend(['-m', args.markers])
    
    if args.keyword:
        cmd.extend(['-k', args.keyword])
    
    # Add options
    if args.verbose:
        cmd.append('-v')
    
    if args.parallel:
        cmd.extend(['-n', str(args.parallel)])
    
    if args.failfast:
        cmd.append('--maxfail=1')
    
    if args.lf:
        cmd.append('--lf')
    
    cmd.extend(['--tb', args.tb])
    
    # Coverage options
    if args.coverage:
        cmd.extend([
            '--cov=app',
            '--cov-report=term-missing',
            '--cov-report=html:htmlcov',
            '--cov-branch'
        ])
    
    # Reporting options
    if args.junit_xml:
        cmd.extend(['--junit-xml', args.junit_xml])
    
    if args.json_report:
        cmd.extend(['--json-report', '--json-report-file', args.json_report])
    
    # Always show summary
    cmd.append('--tb=short')
    cmd.append('-ra')  # Show all except passed
    
    # Set environment variables for testing
    env = os.environ.copy()
    env['ENVIRONMENT'] = 'testing'
    env['DEBUG'] = 'false'
    env['DISABLE_REDIS'] = 'true'
    env['DISABLE_RATE_LIMITING'] = 'true'
    
    # Run the command
    print(f"\nRunning pytest with command: {' '.join(cmd)}")
    print(f"Environment: ENVIRONMENT=testing")
    
    result = subprocess.run(cmd, env=env, cwd=Path(__file__).parent.parent)
    
    # Print summary
    print(f"\n{'=' * 60}")
    if result.returncode == 0:
        print("✅ All tests passed!")
        
        if args.coverage:
            print("📊 Coverage report generated in htmlcov/")
        
        if args.junit_xml:
            print(f"📄 JUnit XML report: {args.junit_xml}")
        
        if args.json_report:
            print(f"📋 JSON report: {args.json_report}")
    else:
        print(f"❌ Tests failed with exit code {result.returncode}")
        
        if args.lf:
            print("💡 Tip: Use --lf to re-run only failed tests")
        
        if not args.verbose:
            print("💡 Tip: Use -v for more verbose output")
    
    print(f"{'=' * 60}")
    
    return result.returncode


def run_specific_test_suites():
    """Run predefined test suites for different scenarios."""
    suites = {
        'smoke': {
            'description': 'Quick smoke tests',
            'cmd': ['python', '-m', 'pytest', 'tests/unit/test_core_config.py', 
                   'tests/api/test_auth_endpoints.py::TestUserLogin::test_login_success', '-v']
        },
        'security': {
            'description': 'Security-related tests',
            'cmd': ['python', '-m', 'pytest', 'tests/unit/test_core_security.py', 
                   'tests/api/test_auth_endpoints.py', '-v']
        },
        'database': {
            'description': 'Database and model tests',
            'cmd': ['python', '-m', 'pytest', 'tests/unit/test_models_users.py', 
                   'tests/integration/test_database_operations.py', '-v']
        },
        'api': {
            'description': 'API endpoint tests',
            'cmd': ['python', '-m', 'pytest', 'tests/api/', '-v']
        },
        'performance': {
            'description': 'Performance and load tests',
            'cmd': ['python', '-m', 'pytest', 'tests/performance/', '-v', '-s']
        },
        'ci': {
            'description': 'CI/CD pipeline tests (fast, no slow tests)',
            'cmd': ['python', '-m', 'pytest', 'tests/unit/', 'tests/integration/', 
                   'tests/api/', '-m', 'not slow', '--maxfail=5', '--tb=short']
        }
    }
    
    if len(sys.argv) > 1 and sys.argv[1] in suites:
        suite_name = sys.argv[1]
        suite = suites[suite_name]
        
        exit_code = run_command(suite['cmd'], suite['description'])
        sys.exit(exit_code)


if __name__ == '__main__':
    # Check for predefined suites first
    run_specific_test_suites()
    
    # Otherwise run main argument parser
    sys.exit(main())
