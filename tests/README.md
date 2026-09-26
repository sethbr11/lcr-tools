# Test Suite Architecture - LCR Tools Extension

This directory contains the automated test suite for the modern cross-browser LCR Tools extension. Tests run via **Vitest** with **JSDOM** and **@testing-library/dom**, providing fast, native TypeScript execution.

---

## 🚀 Quick Start

```bash
# Run all test suites
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with V8 coverage report
npm run test:coverage

# Run specific suite
npm test tests/actions/processAttendance.test.ts
```

---

## 📂 Test Directory Structure

```
tests/
├── setup.ts                    # Global mocks for browser/chrome APIs and JSDOM polyfills
├── README.md                   # Test suite overview (this file)
├── TESTING_GUIDE.md            # Patterns, mocking techniques, and best practices
├── actions/                    # Functional action tests (attendance, trip planning, boundary audit)
├── utils/                      # Unit tests for shared utilities (core, file, table, security)
├── entrypoints/                # Entrypoint integration tests (popup, passive background)
├── popup.test.ts               # Action popup UI testing
├── popupAliases.test.ts        # Action alias matching tests
├── popupApiKeys.test.ts        # Encrypted API key storage UI tests
└── popupPin.test.ts            # PIN dialog and hashing tests
```

---

## 🛠 Testing Guidelines

- **Strict TypeScript & Zero-`any`**: All test files must strictly declare types for test variables and return values.
- **Strict 400-Line Limit**: Every test file must remain at or below 400 lines (domain-split suites when needed).
- **100% Synthetic Fixtures**: Zero real Church member names, unit numbers, addresses, or session tokens may be used in any test file.

For detailed patterns, see [TESTING_GUIDE.md](TESTING_GUIDE.md).
