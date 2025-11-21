/**
 * Jest setup file for Chrome extension testing
 * Sets up Chrome API mocks and testing utilities
 */

import "@testing-library/jest-dom";
import sinon from "sinon";

// Create a comprehensive Chrome API mock
const createChromeMock = () => ({
  runtime: {
    lastError: null,
    id: "test-extension-id",
  },
  tabs: {
    query: sinon.stub(),
    executeScript: sinon.stub(),
    sendMessage: sinon.stub(),
    onUpdated: sinon.stub(),
    onActivated: sinon.stub(),
  },
  scripting: {
    executeScript: sinon.stub(),
    insertCSS: sinon.stub(),
    removeCSS: sinon.stub(),
  },
});

// Global Chrome API mock
global.chrome = createChromeMock();

// Mock DOM APIs that might be used in tests
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  // Reset Chrome API stubs
  sinon.resetHistory();

  // Reset DOM mocks
  jest.clearAllMocks();

  // Clear any global state
  if (
    global.window &&
    global.window.lcrToolsShouldStopProcessing !== undefined
  ) {
    delete global.window.lcrToolsShouldStopProcessing;
  }
});

// Clean up after each test
afterEach(() => {
  sinon.restore();
});

// Mock window.location for URL-based tests
Object.defineProperty(window, "location", {
  value: {
    href: "https://lcr.churchofjesuschrist.org/test-page",
    pathname: "/test-page",
    search: "",
    hash: "",
  },
  writable: true,
});

// Mock document methods - but preserve createElement for actual DOM creation
global.document.querySelector = jest.fn();
global.document.querySelectorAll = jest.fn(() => []);

// Don't mock createElement - let jsdom handle it naturally
// global.document.createElement should work properly in jsdom

// Ensure document.body is available
if (!global.document.body) {
  global.document.body = global.document.createElement("body");
}
