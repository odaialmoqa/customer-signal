# CustomerSignal Testing Guide

This document provides comprehensive information about the testing strategy and implementation for CustomerSignal.

## Testing Strategy

CustomerSignal follows a comprehensive testing approach with multiple layers of testing to ensure reliability, performance, and accessibility.

### Test Pyramid

```
                    /\
                   /  \
                  /E2E \
                 /______\
                /        \
               /Integration\
              /__________\
             /            \
            /     Unit      \
           /________________\
```

- **Unit Tests (70%)**: Fast, isolated tests for individual components and functions
- **Integration Tests (20%)**: Tests for service interactions and API endpoints
- **End-to-End Tests (10%)**: Full user journey tests across the entire application

## Test Types

### 1. Unit Tests
Located in `src/test/unit/`

**Purpose**: Test individual components, functions, and services in isolation.

**Technologies**:
- Vitest for test runner
- React Testing Library for component testing
- Jest DOM for DOM assertions

**Coverage**: 
- React components
- Service functions
- Utility functions
- Hooks
- Type definitions

**Example**:
```bash
npm run test:unit
```

### 2. Integration Tests
Located in `src/test/integration/`

**Purpose**: Test interactions between different parts of the system.

**Coverage**:
- API endpoint integration
- Database operations
- External service integrations
- Data processing pipelines

**Example**:
```bash
npm run test:integration
```

### 3. API Tests
Located in `src/test/api/`

**Purpose**: Test all API endpoints comprehensively.

**Coverage**:
- All REST API endpoints
- Authentication flows
- Error handling
- Request/response validation

**Example**:
```bash
npm run test:api
```

### 4. End-to-End Tests
Located in `src/test/e2e/`

**Purpose**: Test complete user journeys and workflows.

**Technologies**:
- Vitest for simple E2E scenarios
- Playwright for browser-based testing

**Coverage**:
- User onboarding flow
- Keyword management
- Dashboard navigation
- Search and filtering
- Report generation

**Examples**:
```bash
# Vitest E2E tests
npm run test:e2e

# Playwright E2E tests
npm run test:e2e:playwright
```

### 5. Accessibility Tests
Located in `src/test/accessibility/`

**Purpose**: Ensure the application meets WCAG 2.1 AA standards.

**Technologies**:
- jest-axe for automated accessibility testing
- Playwright with axe-core for browser testing

**Coverage**:
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

**Examples**:
```bash
# Vitest accessibility tests
npm run test:accessibility

# Playwright accessibility tests
npm run test:accessibility:playwright
```

### 6. Performance Tests
Located in `src/test/performance/`

**Purpose**: Ensure the application performs well under various load conditions.

**Coverage**:
- High-load scenarios
- Memory usage
- Database query performance
- API response times
- Caching effectiveness

**Examples**:
```bash
# Performance tests
npm run test:performance

# Load tests
npm run test:load
```

### 7. Security Tests
Located in `src/test/security/`

**Purpose**: Identify security vulnerabilities and ensure compliance.

**Coverage**:
- Vulnerability assessment
- Authentication security
- Data protection
- GDPR compliance

**Example**:
```bash
npm run test:security
```

## Running Tests

### Individual Test Suites

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# API tests
npm run test:api

# E2E tests (Vitest)
npm run test:e2e

# E2E tests (Playwright)
npm run test:e2e:playwright

# Accessibility tests (Vitest)
npm run test:accessibility

# Accessibility tests (Playwright)
npm run test:accessibility:playwright

# Performance tests
npm run test:performance

# Security tests
npm run test:security
```

### All Tests

```bash
# Run all test suites
npm run test:all

# Run comprehensive test suite with reporting
node scripts/run-comprehensive-tests.js
```

### Watch Mode

```bash
# Watch unit tests
npm run test:watch

# Watch performance tests
npm run test:performance:watch
```

## Test Configuration

### Vitest Configuration
- Main config: `vitest.config.ts`
- Performance config: `vitest.performance.config.ts`
- Setup file: `src/test/setup.ts`

### Playwright Configuration
- E2E config: `playwright.config.ts`
- Accessibility config: `playwright-a11y.config.ts`

### Coverage Configuration
Coverage is configured in `vitest.config.ts` with the following thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Continuous Integration

The CI/CD pipeline runs all test suites automatically:

1. **Lint and Format Check**
2. **Unit Tests** with coverage reporting
3. **Integration Tests** with database setup
4. **Performance Tests**
5. **Accessibility Tests**
6. **End-to-End Tests**
7. **Security Scan**

### GitHub Actions Workflow
Located in `.github/workflows/ci-cd.yml`

The workflow includes:
- Parallel test execution
- Test result reporting
- Coverage reporting to Codecov
- Artifact uploads for failed tests
- Slack notifications

## Test Data Management

### Mocking Strategy
- **Supabase Client**: Mocked in test setup
- **External APIs**: Mocked using Vitest mocks
- **File System**: Mocked for file upload tests
- **Time**: Mocked for consistent test results

### Test Database
- Uses Supabase local development setup
- Migrations run automatically in CI
- Test data is isolated per test run

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should describe the expected behavior
3. **Test Behavior, Not Implementation**: Focus on what the code does, not how
4. **Keep Tests Independent**: Each test should be able to run in isolation
5. **Use Page Object Model**: For E2E tests, use page objects for maintainability

### Test Organization

1. **Group Related Tests**: Use `describe` blocks to group related tests
2. **Use Setup and Teardown**: Use `beforeEach`/`afterEach` for common setup
3. **Mock External Dependencies**: Keep tests fast and reliable
4. **Test Edge Cases**: Include error conditions and boundary cases

### Performance Considerations

1. **Parallel Execution**: Tests run in parallel where possible
2. **Selective Testing**: Use test patterns to run specific test suites
3. **Resource Cleanup**: Ensure tests clean up after themselves
4. **Timeout Configuration**: Set appropriate timeouts for different test types

## Debugging Tests

### Local Debugging

```bash
# Run tests with debug output
DEBUG=* npm run test:unit

# Run specific test file
npm run test -- src/test/unit/specific-test.test.ts

# Run tests in watch mode with UI
npm run test:watch
```

### Playwright Debugging

```bash
# Run Playwright tests in headed mode
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Test Reports

### Coverage Reports
- HTML report: `coverage/index.html`
- LCOV report: `coverage/lcov.info`
- JSON report: `coverage/coverage-final.json`

### Test Results
- Comprehensive report: `test-results/comprehensive-test-report.html`
- JSON results: `test-results/comprehensive-test-report.json`
- Performance results: `test-results/performance-results.json`

### Viewing Reports

```bash
# Open coverage report
open coverage/index.html

# Open comprehensive test report
open test-results/comprehensive-test-report.html
```

## Troubleshooting

### Common Issues

1. **Tests Timing Out**
   - Increase timeout in test configuration
   - Check for infinite loops or hanging promises

2. **Flaky Tests**
   - Add proper wait conditions
   - Mock time-dependent functionality
   - Ensure proper cleanup

3. **Memory Issues**
   - Check for memory leaks in tests
   - Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`

4. **Database Connection Issues**
   - Ensure Supabase is running locally
   - Check database connection strings
   - Verify migrations are applied

### Getting Help

1. Check test logs for detailed error messages
2. Run tests individually to isolate issues
3. Use debug mode for step-by-step execution
4. Review test setup and configuration files

## Contributing

When adding new features:

1. **Write Tests First**: Follow TDD approach where possible
2. **Maintain Coverage**: Ensure new code meets coverage thresholds
3. **Update Documentation**: Update this guide for new test types
4. **Run Full Suite**: Ensure all tests pass before submitting PR

### Test Checklist

- [ ] Unit tests for new components/functions
- [ ] Integration tests for new API endpoints
- [ ] E2E tests for new user workflows
- [ ] Accessibility tests for new UI components
- [ ] Performance tests for new heavy operations
- [ ] Security tests for new authentication/authorization
- [ ] Documentation updated
- [ ] All tests passing in CI

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)