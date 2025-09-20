# Frontend Tests

This directory contains all testing files for the frontend application.

## Directory Structure

```
frontend/tests/
├── unit/           # Unit tests for individual components/functions
├── integration/    # Integration tests for component interactions
├── e2e/           # End-to-end tests for user workflows
├── components/    # Component-specific tests
├── pages/         # Page component tests
├── hooks/         # Custom React hooks tests
├── utils/         # Utility function tests
├── helpers/       # Test helper utilities and fixtures
├── fixtures/      # Test data and mock objects
└── __mocks__/     # Jest mocks for modules and components
```

## Test File Naming Conventions

- Component tests: `ComponentName.test.tsx` or `ComponentName.spec.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityFunction.test.ts`
- E2E tests: `feature.e2e.test.ts`
- Test directories: `__tests__/`

## Running Tests

```bash
# Run all tests
npm test

# Run specific test files
npm test ComponentName.test.tsx

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Testing Libraries

- **Jest**: Testing framework and test runner
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers
- **@testing-library/user-event**: User interaction simulation
- **MSW (Mock Service Worker)**: API mocking for tests
- **Playwright/Cypress**: E2E testing framework

## Testing Principles

- Test behavior, not implementation details
- Use semantic queries (getByRole, getByLabelText, etc.)
- Mock external dependencies and API calls
- Test user interactions and workflows
- Maintain accessibility standards in tests
- Follow the AAA pattern: Arrange, Act, Assert

## Environment

- Test files run in a separate test environment
- Use test-specific configurations
- Mock browser APIs when necessary
- Clean up after each test
- Use proper test isolation