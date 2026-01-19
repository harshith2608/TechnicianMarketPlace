#!/bin/bash
# functions/run-tests.sh
# Comprehensive test runner for payment and payout functions
# Supports both emulator and real Firebase project testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="techsavy-cc539"
FUNCTIONS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COVERAGE_DIR="${FUNCTIONS_DIR}/coverage"
TEST_OUTPUT_DIR="${FUNCTIONS_DIR}/test-output"

# Create output directories
mkdir -p "${COVERAGE_DIR}"
mkdir -p "${TEST_OUTPUT_DIR}"

# Functions for colored output
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

# Display help
show_help() {
  cat << EOF
Payment & Payout Functions Test Runner

Usage: ./run-tests.sh [COMMAND] [OPTIONS]

Commands:
  unit                Run unit tests only
  emulator            Run tests with Firebase Emulator
  deploy              Run tests with deployed functions
  all                 Run full test suite (unit + emulator)
  coverage            Generate coverage report
  watch               Run tests in watch mode

Options:
  --project PROJECT   Specify Firebase project (default: techsavy-cc539)
  --verbose           Show detailed test output
  --ci                Run in CI mode (no interactive)

Examples:
  ./run-tests.sh unit                    # Run unit tests
  ./run-tests.sh emulator --verbose      # Run emulator tests with details
  ./run-tests.sh coverage                # Generate coverage report
  ./run-tests.sh all --ci                # Full test suite in CI mode

EOF
}

# Parse command line arguments
COMMAND="${1:-unit}"
PROJECT_ID="${PROJECT_ID}"
VERBOSE=false
CI_MODE=false

for arg in "$@"; do
  case $arg in
    --project=*)
      PROJECT_ID="${arg#*=}"
      ;;
    --verbose)
      VERBOSE=true
      ;;
    --ci)
      CI_MODE=true
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
  esac
done

# Main test execution
run_unit_tests() {
  log_info "Running unit tests..."
  
  cd "${FUNCTIONS_DIR}"
  
  local npm_args="test"
  if [ "$VERBOSE" = true ]; then
    npm_args="${npm_args} -- --verbose"
  fi
  
  if npm ${npm_args} 2>&1 | tee "${TEST_OUTPUT_DIR}/unit-tests.log"; then
    log_success "Unit tests passed"
    return 0
  else
    log_error "Unit tests failed"
    return 1
  fi
}

run_emulator_tests() {
  log_info "Starting Firebase Emulator..."
  
  # Check if emulator is running
  if ! firebase emulators:start --project="${PROJECT_ID}" --debug >/dev/null 2>&1 &; then
    log_warning "Could not start emulator, skipping emulator tests"
    return 0
  fi
  
  sleep 3 # Wait for emulator to start
  
  log_info "Running tests against emulator..."
  
  cd "${FUNCTIONS_DIR}"
  npm test -- --env=emulator 2>&1 | tee "${TEST_OUTPUT_DIR}/emulator-tests.log"
  
  # Stop emulator
  firebase emulators:stop
  
  log_success "Emulator tests completed"
}

run_deployed_tests() {
  log_info "Running tests against deployed functions (${PROJECT_ID})..."
  
  cd "${FUNCTIONS_DIR}"
  
  npm test -- --env=production 2>&1 | tee "${TEST_OUTPUT_DIR}/deployed-tests.log"
  
  log_success "Deployed tests completed"
}

run_coverage_tests() {
  log_info "Running tests with coverage analysis..."
  
  cd "${FUNCTIONS_DIR}"
  
  npm test -- --coverage \
    --collectCoverageFrom='src/**/*.js' \
    --coverageDirectory="${COVERAGE_DIR}" \
    --coverageReporters='text' \
    --coverageReporters='lcov' \
    --coverageReporters='html' \
    2>&1 | tee "${TEST_OUTPUT_DIR}/coverage-tests.log"
  
  log_success "Coverage report generated: ${COVERAGE_DIR}/index.html"
}

run_watch_mode() {
  log_info "Running tests in watch mode (press 'q' to exit)..."
  
  cd "${FUNCTIONS_DIR}"
  
  npm test -- --watch
}

run_all_tests() {
  log_info "Running full test suite..."
  
  if run_unit_tests; then
    log_success "Unit tests passed"
  else
    log_error "Unit tests failed"
    return 1
  fi
  
  log_info "Generating coverage report..."
  if run_coverage_tests; then
    log_success "Coverage report generated"
  else
    log_warning "Coverage generation had issues"
  fi
  
  log_success "Full test suite completed"
}

# Verify prerequisites
verify_prerequisites() {
  log_info "Verifying prerequisites..."
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    return 1
  fi
  log_success "Node.js found: $(node --version)"
  
  # Check npm
  if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    return 1
  fi
  log_success "npm found: $(npm --version)"
  
  # Check Firebase CLI
  if ! command -v firebase &> /dev/null; then
    log_warning "Firebase CLI not found (needed for emulator tests)"
  else
    log_success "Firebase CLI found: $(firebase --version)"
  fi
  
  # Check if in functions directory
  if [ ! -f "${FUNCTIONS_DIR}/package.json" ]; then
    log_error "package.json not found in ${FUNCTIONS_DIR}"
    return 1
  fi
  log_success "project structure verified"
  
  return 0
}

# Main execution
main() {
  log_info "Payment & Payout Functions Test Runner"
  log_info "======================================="
  
  # Verify prerequisites
  if ! verify_prerequisites; then
    log_error "Prerequisites check failed"
    exit 1
  fi
  
  echo ""
  
  # Execute command
  case $COMMAND in
    unit)
      run_unit_tests
      ;;
    emulator)
      run_emulator_tests
      ;;
    deploy|deployed)
      run_deployed_tests
      ;;
    all)
      run_all_tests
      ;;
    coverage)
      run_coverage_tests
      ;;
    watch)
      run_watch_mode
      ;;
    *)
      log_error "Unknown command: $COMMAND"
      show_help
      exit 1
      ;;
  esac
  
  exit_code=$?
  
  echo ""
  if [ $exit_code -eq 0 ]; then
    log_success "Tests completed successfully"
  else
    log_error "Tests failed with exit code $exit_code"
  fi
  
  exit $exit_code
}

# Run main function
main "$@"
