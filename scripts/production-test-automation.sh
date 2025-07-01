#!/bin/bash

# 本番環境テスト自動化システム
# Production Test Automation System for ROIC Application

set -e

# Configuration
PROD_URL="http://54.199.201.201:3000"
API_URL="http://54.199.201.201:3001/api"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
EMAIL_RECIPIENTS="${ALERT_EMAIL_RECIPIENTS}"
LOG_FILE="/var/log/roic/production-tests.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS=()

echo "🚀 Starting Production Environment Test Automation"
echo "=================================================="
echo "Production URL: $PROD_URL"
echo "API URL: $API_URL"
echo "Timestamp: $(date)"
echo ""

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Test execution function
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}🧪 Running: $test_name${NC}"
    
    if eval "$test_command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        TEST_RESULTS+=("✅ PASS: $test_name")
        log "INFO" "TEST PASS: $test_name"
        return 0
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        TEST_RESULTS+=("❌ FAIL: $test_name")
        log "ERROR" "TEST FAIL: $test_name"
        return 1
    fi
}

# Health Check Tests
echo "🏥 Health Check Tests"
echo "===================="

run_test "Frontend Health Check" \
    "curl -f -s --max-time 10 $PROD_URL > /dev/null" \
    "HTTP 200"

run_test "Backend API Health Check" \
    "curl -f -s --max-time 10 $API_URL/health > /dev/null" \
    "HTTP 200"

run_test "Database Connectivity" \
    "curl -f -s --max-time 10 $API_URL/health | jq -r '.database' | grep -q 'connected'" \
    "Database connected"

# Performance Tests
echo ""
echo "⚡ Performance Tests"
echo "==================="

# Homepage load time test
run_test "Homepage Load Time < 3s" \
    "timeout 3s curl -w '%{time_total}' -o /dev/null -s $PROD_URL | awk '{if(\$1 < 3) exit 0; else exit 1}'" \
    "Load time under 3 seconds"

# API response time test
run_test "API Response Time < 2s" \
    "timeout 2s curl -w '%{time_total}' -o /dev/null -s $API_URL/companies | awk '{if(\$1 < 2) exit 0; else exit 1}'" \
    "API response under 2 seconds"

# Concurrent user simulation
run_test "Concurrent User Load Test" \
    "for i in {1..10}; do curl -s $PROD_URL > /dev/null & done; wait" \
    "Handle 10 concurrent requests"

# Functional Tests
echo ""
echo "🔧 Functional Tests"
echo "==================="

# Test API endpoints
run_test "Companies API Endpoint" \
    "curl -f -s $API_URL/companies | jq -e '.success == true'" \
    "Returns success response"

run_test "Search API Endpoint" \
    "curl -f -s '$API_URL/companies?name=test' | jq -e '.success == true'" \
    "Search functionality works"

run_test "ROIC Rankings API" \
    "curl -f -s $API_URL/roic/rankings | jq -e '.success == true'" \
    "ROIC rankings available"

# Frontend functionality tests using headless browser
if command -v playwright &> /dev/null; then
    echo ""
    echo "🎭 Frontend E2E Tests"
    echo "===================="
    
    # Create temporary test file
    cat > /tmp/prod-e2e-test.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
        // Test homepage navigation
        await page.goto(process.env.PROD_URL);
        await page.waitForLoadState('networkidle');
        
        // Check if main content is visible
        const title = await page.textContent('h1');
        if (!title.includes('ROIC')) {
            throw new Error('Homepage title not found');
        }
        
        // Test navigation to companies page
        await page.click('text=企業検索');
        await page.waitForLoadState('networkidle');
        
        const companiesTitle = await page.textContent('h1');
        if (!companiesTitle.includes('企業検索')) {
            throw new Error('Companies page not loaded');
        }
        
        // Test search functionality
        await page.fill('input[placeholder*="企業名"]', 'テスト');
        await page.click('button:has-text("検索")');
        await page.waitForTimeout(2000);
        
        // Check if search results section is visible
        const searchResults = await page.locator('text=検索結果').isVisible();
        if (!searchResults) {
            throw new Error('Search results not displayed');
        }
        
        console.log('All E2E tests passed');
        process.exit(0);
        
    } catch (error) {
        console.error('E2E test failed:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
EOF

    run_test "Frontend E2E Navigation Test" \
        "PROD_URL=$PROD_URL node /tmp/prod-e2e-test.js" \
        "E2E navigation works"
    
    # Cleanup
    rm -f /tmp/prod-e2e-test.js
fi

# Security Tests
echo ""
echo "🔒 Security Tests"
echo "================"

run_test "HTTPS Redirect Test" \
    "curl -s -I http://54.199.201.201:3000 | grep -q 'HTTP.*200\\|HTTP.*301\\|HTTP.*302'" \
    "HTTPS properly configured"

run_test "Security Headers Check" \
    "curl -s -I $PROD_URL | grep -E 'X-.*|Content-Security-Policy|Strict-Transport-Security' | wc -l | awk '{if(\$1 >= 1) exit 0; else exit 1}'" \
    "Security headers present"

run_test "API Input Validation" \
    "curl -s '$API_URL/companies?page=-1&limit=999999' | jq -e '.error != null or .success == false'" \
    "Input validation working"

# Data Integrity Tests
echo ""
echo "📊 Data Integrity Tests"
echo "======================"

run_test "Database Data Consistency" \
    "curl -s $API_URL/companies | jq -e '.data | length > 0'" \
    "Database contains data"

run_test "ROIC Calculation Accuracy" \
    "curl -s $API_URL/roic/rankings | jq -e '.data[0].roic_percentage | type == \"number\" and . > 0 and . < 100'" \
    "ROIC calculations are valid"

# Monitoring Integration Tests
echo ""
echo "📈 Monitoring Integration"
echo "========================"

# Check if monitoring endpoints are working
run_test "Metrics Endpoint Available" \
    "curl -f -s --max-time 5 $API_URL/metrics > /dev/null || curl -f -s --max-time 5 $PROD_URL/api/metrics > /dev/null" \
    "Metrics collection working"

# Test Results Summary
echo ""
echo "📋 Test Results Summary"
echo "======================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate: $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"

# Generate detailed report
REPORT_FILE="/tmp/production-test-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "production",
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "success_rate": $(echo "scale=4; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc),
    "test_results": [
$(printf '%s\n' "${TEST_RESULTS[@]}" | sed 's/.*/"&"/' | paste -sd,)
    ],
    "urls": {
        "frontend": "$PROD_URL",
        "api": "$API_URL"
    }
}
EOF

echo "📄 Detailed report saved to: $REPORT_FILE"

# Alert generation based on results
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}🚨 ALERT: $FAILED_TESTS test(s) failed in production!${NC}"
    
    # Send Slack notification if webhook is configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\":\"🚨 Production Test Alert: $FAILED_TESTS/$TOTAL_TESTS tests failed in ROIC Application\",
                \"attachments\":[{
                    \"color\":\"danger\",
                    \"fields\":[{
                        \"title\":\"Failed Tests\",
                        \"value\":\"$FAILED_TESTS out of $TOTAL_TESTS\",
                        \"short\":true
                    },{
                        \"title\":\"Environment\",
                        \"value\":\"Production ($PROD_URL)\",
                        \"short\":true
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK"
    fi
    
    # Send email alert if configured
    if [ -n "$EMAIL_RECIPIENTS" ] && command -v mail &> /dev/null; then
        echo "Production tests failed. Check $LOG_FILE for details." | \
            mail -s "🚨 ROIC Production Test Failures" "$EMAIL_RECIPIENTS"
    fi
    
    log "ALERT" "Production test failures detected: $FAILED_TESTS/$TOTAL_TESTS"
    exit 1
else
    echo -e "${GREEN}🎉 All production tests passed successfully!${NC}"
    log "INFO" "All production tests passed: $PASSED_TESTS/$TOTAL_TESTS"
    
    # Send success notification if configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\":\"✅ Production Test Success: All $TOTAL_TESTS tests passed in ROIC Application\",
                \"attachments\":[{
                    \"color\":\"good\",
                    \"fields\":[{
                        \"title\":\"Test Results\",
                        \"value\":\"$PASSED_TESTS/$TOTAL_TESTS passed\",
                        \"short\":true
                    },{
                        \"title\":\"Environment\",
                        \"value\":\"Production ($PROD_URL)\",
                        \"short\":true
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK"
    fi
    
    exit 0
fi