#!/bin/bash

# OTP Test Runner Script
# Runs all OTP tests with proper setup

echo "🧪 OTP Test Suite Runner"
echo "=========================="
echo ""

# Check if Firebase Emulator is running
echo "🔍 Checking Firebase Emulator..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Firestore Emulator is running"
else
    echo "⚠️  Firestore Emulator not running"
    echo "   Starting: firebase emulators:start --only firestore"
    firebase emulators:start --only firestore &
    EMULATOR_PID=$!
    echo "   Waiting for emulator to start (8 seconds)..."
    sleep 8
fi

echo ""
echo "Running Test Suites..."
echo "======================"
echo ""

# Test 1: Redux Unit Tests
echo "1️⃣  Redux Unit Tests (16 tests)"
echo "   File: src/__tests__/unit/serviceCompletionRedux.test.js"
npm test -- src/__tests__/unit/serviceCompletionRedux.test.js
TEST1_RESULT=$?
echo ""

# Test 2: Component Tests
echo "2️⃣  Component Tests (23 tests)"
echo "   File: src/__tests__/components/OTPScreens.test.js"
npm test -- src/__tests__/components/OTPScreens.test.js
TEST2_RESULT=$?
echo ""

# Test 3: Integration Tests
echo "3️⃣  Integration Tests (45+ tests)"
echo "   File: src/__tests__/integration/OTPNewArchitecture.test.js"
npm test -- src/__tests__/integration/OTPNewArchitecture.test.js
TEST3_RESULT=$?
echo ""

# Test 4: Utility Tests
echo "4️⃣  Utility Tests (42 tests)"
echo "   File: src/__tests__/integration/otpServiceCompletion.test.js"
npm test -- src/__tests__/integration/otpServiceCompletion.test.js
TEST4_RESULT=$?
echo ""

# Summary
echo "=========================="
echo "📊 Test Summary"
echo "=========================="

PASSED=0
FAILED=0

if [ $TEST1_RESULT -eq 0 ]; then
    echo "✅ Redux Unit Tests: PASSED"
    ((PASSED++))
else
    echo "❌ Redux Unit Tests: FAILED"
    ((FAILED++))
fi

if [ $TEST2_RESULT -eq 0 ]; then
    echo "✅ Component Tests: PASSED"
    ((PASSED++))
else
    echo "❌ Component Tests: FAILED"
    ((FAILED++))
fi

if [ $TEST3_RESULT -eq 0 ]; then
    echo "✅ Integration Tests: PASSED"
    ((PASSED++))
else
    echo "❌ Integration Tests: FAILED"
    ((FAILED++))
fi

if [ $TEST4_RESULT -eq 0 ]; then
    echo "✅ Utility Tests: PASSED"
    ((PASSED++))
else
    echo "❌ Utility Tests: FAILED"
    ((FAILED++))
fi

echo ""
echo "Total: $PASSED passed, $FAILED failed"

# Cleanup
if [ ! -z "$EMULATOR_PID" ]; then
    echo ""
    echo "Stopping emulator..."
    kill $EMULATOR_PID 2>/dev/null
fi

echo ""
echo "✅ Test run complete!"
