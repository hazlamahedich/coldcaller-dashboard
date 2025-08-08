# Testing Guide - Cold Calling Dashboard

## Overview

This project includes comprehensive automated testing with Jest and React Testing Library. All tests run automatically and ensure code quality.

## Test Structure

```
frontend/src/
├── components/__tests__/        # Unit tests for components
│   ├── DialPad.test.js
│   ├── AudioClipPlayer.test.js
│   ├── ScriptDisplay.test.js
│   └── LeadPanel.test.js
├── __tests__/                   # Integration and E2E tests
│   ├── App.integration.test.js # Integration tests
│   └── workflows.e2e.test.js   # End-to-end workflow tests
├── utils/
│   └── testUtils.js            # Testing utilities and helpers
└── setupTests.js               # Test configuration
```

## Running Tests

### Basic Commands

```bash
# Run all tests in watch mode (interactive)
npm test

# Run all tests once with coverage
npm run test:coverage

# Run tests in CI mode (no watch, with coverage)
npm run test:ci

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only E2E tests
npm run test:e2e

# Watch mode for continuous testing
npm run test:watch
```

### Test Coverage

Current coverage thresholds (minimum 70%):
- **Lines**: 70%
- **Statements**: 70%
- **Functions**: 70%
- **Branches**: 70%

View coverage report:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## Test Categories

### 1. Unit Tests (components/__tests__/)

Test individual components in isolation:

**DialPad.test.js** - 12 tests
- Renders all elements
- Number button functionality
- Phone number formatting
- Call/hang up states
- Delete functionality
- Input validation

**AudioClipPlayer.test.js** - 11 tests
- Category switching
- Play/pause functionality
- Auto-stop timer
- Clip duration display
- UI state changes

**ScriptDisplay.test.js** - 10 tests
- Script selection
- Color coding
- Copy to clipboard
- Expand/collapse
- Tips display

**LeadPanel.test.js** - 14 tests
- Lead navigation
- Note editing
- Status badges
- Quick actions
- Data display

### 2. Integration Tests (App.integration.test.js)

Test component interactions:
- Complete dashboard rendering
- Multi-component workflows
- State synchronization
- User interactions across components
- Layout and styling

### 3. End-to-End Tests (workflows.e2e.test.js)

Test complete user workflows:
- **Complete Sales Call**: Full calling process from lead selection to notes
- **Lead Management**: Navigate and update all leads
- **Script Preparation**: Review and copy all scripts
- **Audio Testing**: Test all audio categories
- **Multi-Lead Session**: Call multiple leads in sequence
- **Error Recovery**: Handle mistakes and cancellations

## Testing Best Practices

### Writing New Tests

1. **Follow AAA Pattern**:
```javascript
test('should do something', () => {
  // Arrange - Set up test data
  const data = { ... };
  
  // Act - Perform the action
  const result = doSomething(data);
  
  // Assert - Check the result
  expect(result).toBe(expected);
});
```

2. **Use Descriptive Names**:
```javascript
// Good
test('clicking call button starts a call and shows hang up button', () => {});

// Bad
test('test call', () => {});
```

3. **Test User Behavior, Not Implementation**:
```javascript
// Good - Tests what user sees
expect(screen.getByText('Call in progress')).toBeInTheDocument();

// Bad - Tests implementation details
expect(component.state.isCalling).toBe(true);
```

### Using Test Utilities

Import helpful utilities from `testUtils.js`:

```javascript
import {
  setupUser,
  generateMockLead,
  mockConsole,
  fillInput
} from '../utils/testUtils';

test('example test', async () => {
  const user = setupUser();
  const lead = generateMockLead({ name: 'Test User' });
  const { logSpy } = mockConsole();
  
  // Your test code here
});
```

## Automated Testing

### GitHub Actions CI/CD

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

The CI pipeline:
1. Runs on Node.js 18.x and 20.x
2. Executes all test suites
3. Generates coverage reports
4. Comments results on PRs
5. Uploads coverage to Codecov

### Pre-commit Hooks

Tests run before every commit:
1. Unit tests execute automatically
2. Coverage check (optional)
3. Commit blocked if tests fail

Setup pre-commit hooks:
```bash
cd frontend
npx husky install
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- DialPad.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="navigation"
```

### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "${workspaceFolder}/frontend/node_modules/.bin/react-scripts",
  "args": ["test", "--runInBand", "--no-cache"],
  "cwd": "${workspaceFolder}/frontend",
  "console": "integratedTerminal"
}
```

## Common Testing Patterns

### Testing Async Operations
```javascript
test('async operation', async () => {
  const user = userEvent.setup();
  
  // Always use await for user events
  await user.click(button);
  
  // Wait for async updates
  await waitFor(() => {
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
```

### Testing with Timers
```javascript
test('auto-stop after timeout', async () => {
  jest.useFakeTimers();
  
  // Trigger timer
  fireEvent.click(playButton);
  
  // Fast-forward time
  jest.advanceTimersByTime(3000);
  
  // Check result
  await waitFor(() => {
    expect(screen.queryByText('Playing')).not.toBeInTheDocument();
  });
  
  jest.useRealTimers();
});
```

### Mocking External Dependencies
```javascript
// Mock clipboard API
navigator.clipboard = {
  writeText: jest.fn()
};

// Mock console
const consoleSpy = jest.spyOn(console, 'log');

// Mock alert
global.alert = jest.fn();
```

## Test Metrics

### Current Test Statistics
- **Total Tests**: 47+ test cases
- **Components Tested**: 4 main components + App
- **Coverage**: >70% across all metrics
- **Execution Time**: ~5-10 seconds

### Performance Benchmarks
- Unit tests: <2 seconds
- Integration tests: <3 seconds
- E2E tests: <5 seconds
- Full suite: <10 seconds

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Cannot find module"
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Coverage not generating
```bash
# Solution: Run with explicit coverage flag
npm test -- --coverage --watchAll=false
```

**Issue**: Tests timeout
```javascript
// Solution: Increase timeout for slow tests
test('slow test', async () => {
  // Test code
}, 10000); // 10 second timeout
```

## Continuous Improvement

### Adding New Tests

When adding features:
1. Write tests first (TDD approach)
2. Ensure >70% coverage
3. Test happy path and edge cases
4. Add integration tests for workflows
5. Update this documentation

### Review Checklist

Before committing:
- [ ] All tests pass
- [ ] Coverage meets thresholds
- [ ] No console errors/warnings
- [ ] Tests are descriptive
- [ ] No skipped tests (.skip)
- [ ] Mocks are cleaned up

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Coverage Reports](./coverage/index.html) (after running tests)

---

## Quick Test Check

Run this to verify everything works:
```bash
cd frontend
npm run test:ci
```

You should see:
- ✅ All tests passing
- 📊 Coverage above 70%
- 🎉 Ready to develop with confidence!