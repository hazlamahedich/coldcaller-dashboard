#!/bin/bash

# Test Runner Script for Cold Calling Dashboard
# Usage: ./test-runner.sh [option]

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Cold Calling Dashboard Test Runner"
echo "====================================="

case "$1" in
  "smoke")
    echo -e "${YELLOW}Running smoke tests...${NC}"
    npm test -- --testPathPattern=smoke --watchAll=false
    ;;
    
  "unit")
    echo -e "${YELLOW}Running unit tests...${NC}"
    npm run test:unit -- --watchAll=false
    ;;
    
  "integration")
    echo -e "${YELLOW}Running integration tests...${NC}"
    npm run test:integration -- --watchAll=false
    ;;
    
  "e2e")
    echo -e "${YELLOW}Running E2E tests...${NC}"
    npm run test:e2e -- --watchAll=false
    ;;
    
  "coverage")
    echo -e "${YELLOW}Running all tests with coverage...${NC}"
    npm run test:coverage
    echo -e "${GREEN}Coverage report generated in coverage/index.html${NC}"
    ;;
    
  "ci")
    echo -e "${YELLOW}Running CI test suite...${NC}"
    npm run test:ci
    ;;
    
  "watch")
    echo -e "${YELLOW}Starting test watcher...${NC}"
    npm test
    ;;
    
  "quick")
    echo -e "${YELLOW}Running quick smoke tests...${NC}"
    npm test -- --testPathPattern=smoke --watchAll=false --silent
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ All smoke tests passed!${NC}"
    else
      echo -e "${RED}❌ Some tests failed${NC}"
    fi
    ;;
    
  *)
    echo "Usage: ./test-runner.sh [option]"
    echo ""
    echo "Options:"
    echo "  smoke       - Run smoke tests only"
    echo "  unit        - Run unit tests"
    echo "  integration - Run integration tests"
    echo "  e2e         - Run end-to-end tests"
    echo "  coverage    - Run all tests with coverage report"
    echo "  ci          - Run CI test suite"
    echo "  watch       - Start test watcher (interactive)"
    echo "  quick       - Quick smoke test check"
    echo ""
    echo "Example: ./test-runner.sh smoke"
    ;;
esac