module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/js/$1",
  },
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(sinon)/)"],
  collectCoverageFrom: [
    "js/**/*.js",
    "!js/vendor/**",
    "!**/node_modules/**",
    "!js/background.js", // Don't collect coverage for non-existent file
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 10000,
  verbose: true,
};
