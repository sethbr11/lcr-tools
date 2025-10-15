# Quick Test Reference Card

## 🚀 Common Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- tableUtils

# Watch mode (auto-rerun)
npm run test:watch

# Build for Chrome Store
npm run build
```

---

## ✅ What's Tested (High Coverage)

| What               | Coverage | File                 |
| ------------------ | -------- | -------------------- |
| Action logging     | 95%      | loggingUtils.test.js |
| Core utilities     | 93%      | utils.core.test.js   |
| Loading indicators | 73%      | uiUtils.test.js      |
| File downloads     | 46%      | fileUtils.test.js    |
| Date parsing       | 30%      | dataUtils.test.js    |
| Table extraction   | 22%      | tableUtils.test.js   |
| URL routing        | ~60%     | actions.real.test.js |

---

## 📝 Quick Test Template

```javascript
/**
 * Tests for myFile.js
 */

describe("My Feature", () => {
  beforeEach(() => {
    // Reset
    if (window.myFeature) delete window.myFeature;
    if (window.utils) delete window.utils;

    // Mock utils
    window.utils = {
      returnIfLoaded: jest.fn(() => false),
    };

    // Load real file
    jest.resetModules();
    require("../js/utils/myFile.js");
  });

  it("should do something", () => {
    const result = window.myFeature.doSomething("input");
    expect(result).toBe("output");
  });
});
```

---

## 🔧 Common Fixes

### "Cannot read property of undefined"

```javascript
// Add to beforeEach:
document.querySelector = Document.prototype.querySelector;
```

### "Module not loaded"

```javascript
// Mock utils properly:
window.utils = {
  returnIfLoaded: jest.fn(() => false),
  ensureLoaded: jest.fn(),
};
```

### Test timeouts

```javascript
// Increase timeout:
it("slow test", async () => {
  // test code
}, 10000); // 10 seconds
```

---

## 📂 File Locations

- Tests: `__tests__/*.test.js`
- Coverage: `coverage/index.html`
- Config: `jest.config.js`
- CI/CD: `.github/workflows/tests.yml`
- Build: `build.js`

---

## 🎯 Next Steps

1. Run `npm run test:coverage`
2. Open `coverage/index.html`
3. Click on files with low coverage
4. Add tests for red (uncovered) lines

---

## 📚 Full Docs

- **How to write tests:** `TESTING_GUIDE.md`
- **What we accomplished:** `TEST_SUMMARY.md`
- **Testing strategy:** `TESTING.md`

---

_Need help? Check TESTING_GUIDE.md for detailed examples!_
