# Testing Strategy for LCR Tools Extension

## Overview

This document outlines the testing strategy for the LCR Tools Chrome extension, covering unit tests and integration tests.

## Testing Structure

### 1. Unit Tests

**Framework:** Jest or Vitest
**Target:** Core utility functions and business logic

**Test Files:**

```
__tests__/
├── popup.test.js               # Popup UI and script injection
├── actions.test.js             # URL pattern matching and action logic
└── utils.test.js               # Core utility functions
```

**Key Test Areas:**

- Popup UI functionality and script injection
- URL pattern matching for LCR sites
- Action determination logic
- Date parsing and name matching utilities
- CSV formatting and template replacement
- Chrome API interactions (tabs, scripting)

### 2. Integration Tests

**Framework:** Jest with jsdom
**Target:** Component interactions and DOM manipulation

**Test Files:**

```
tests/integration/
├── popup.test.js               # Popup UI functionality
├── actions.test.js             # Action routing & URL matching
├── tableProcessing.test.js     # Table extraction workflows
└── modalWorkflows.test.js      # Modal interactions
```

**Key Test Areas:**

- Popup action loading based on URL patterns
- Table selection and processing workflows
- Modal creation and user interactions
- File download triggers
- Chrome API integration (scripting, tabs)

## Recommended Tools

### Unit Testing

- **Jest** - Mature, well-supported, excellent mocking
- **Vitest** - Faster alternative with Vite integration
- **jsdom** - DOM simulation for browser APIs

### Integration Testing

- **Jest + jsdom** - For component integration tests
- **@testing-library/dom** - DOM interaction utilities

## Setup Commands

```bash
# Unit tests with Jest
npm install --save-dev jest jsdom @testing-library/jest-dom

# Alternative: Vitest for unit tests
npm install --save-dev vitest jsdom @vitest/ui
```

## Test Configuration

### Jest Config (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/js/$1",
  },
  testMatch: ["**/tests/unit/**/*.test.js"],
};
```

## Mocking Strategy

- **Chrome APIs:** Use `chrome-extension-mock` or custom mocks
- **DOM APIs:** jsdom handles most DOM simulation
- **File Downloads:** Mock `URL.createObjectURL` and `Blob`
- **Network Requests:** Mock fetch/XMLHttpRequest for LCR API calls

## Running Tests

### Unit Tests

```bash
npm test                  # Run all unit tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:ci           # Run tests in CI mode
```

## CI/CD Integration

- Run unit tests on every commit
- Run integration tests on PR creation
- Use GitHub Actions for automated testing

## Coverage Goals

- **Unit Tests:** 80%+ code coverage
- **Integration Tests:** Critical user flows

## Notes

- Extension uses Manifest V3 with content script injection
- Tests should cover LCR-specific URL patterns and table structures
- Mock LCR site responses for consistent testing
- Test both regular LCR and finance site variants
