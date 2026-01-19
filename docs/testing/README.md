# Testing Documentation

Welcome to the centralized testing documentation for TechnicianMarketPlace.

## 📚 Main Reference

**→ [TESTING_CONSOLIDATED.md](TESTING_CONSOLIDATED.md)** - **START HERE**

Complete guide covering:
- All test files and coverage areas
- 336 passing tests across 13 test suites
- Quick start commands
- Test details for all features including:
  - Review Eligibility System (NEW)
  - Pull-to-Refresh Functionality (NEW)
  - BookingModal Service Name Display (NEW)
  - OTP & Authentication
  - User Registration & Login
  - Booking Workflows
  - Messaging System
  - Firebase Integration
- Best practices and troubleshooting

## 🚀 Quick Start

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage

# Specific test
npm test phoneValidation
npm test reviewEligibilityFlow
```

## 📊 Current Test Status

- ✅ **Test Suites:** 13 passed
- ✅ **Total Tests:** 336 passed  
- ✅ **Pass Rate:** 100%
- ⏱️ **Execution Time:** ~2.4 seconds

See [TESTING_CONSOLIDATED.md](TESTING_CONSOLIDATED.md) for complete details.# Watch mode (re-runs on file change)
npm test -- --watch

# Run specific test suite
npm test phoneValidation
npm test LoginScreen.simple

# Run with coverage report
npm test -- --coverage

# Verbose output
npm test -- --verbose

# CI/CD mode (exit when done)
npm test -- --forceExit
```

## 📞 Questions?

- **Quick answers:** Check [TEST_QUICK_REFERENCE.md](TEST_QUICK_REFERENCE.md) Troubleshooting section
- **Setup issues:** See [TESTING_SETUP_SUMMARY.md](TESTING_SETUP_SUMMARY.md)
- **Test details:** Review [COMPLETE_TEST_SUITE_INDEX.md](COMPLETE_TEST_SUITE_INDEX.md)
- **New tests:** Start with [TESTING_QUICK_START.md](TESTING_QUICK_START.md)

---

**Last Updated:** January 2026  
**Test Framework:** Jest with React Testing Library  
**Coverage:** 164 tests | 100% pass rate
