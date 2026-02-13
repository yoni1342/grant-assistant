# Testing Patterns

**Analysis Date:** 2026-02-13

## Test Framework

**Runner:**
- Not configured
- No Jest, Vitest, or other test runner installed in `package.json`
- Only ESLint linting tool present

**Assertion Library:**
- Not configured

**Run Commands:**
- No test commands defined in `package.json`
- Available scripts: `dev`, `build`, `start`, `lint`
- To run tests: Not applicable (no testing framework installed)

## Test File Organization

**Location:**
- No test files present in application source code
- One test file exists in `.claude/get-shit-done/bin/gsd-tools.test.js` (external tooling, not part of app)

**Naming:**
- Not applicable; no test files in source

**Structure:**
- Not applicable; no test files in source

## Test Structure

**Suite Organization:**
- Not applicable; testing framework not implemented

**Patterns:**
- Not applicable; no tests present

## Mocking

**Framework:**
- Not configured

**Patterns:**
- Not applicable

**What to Mock:**
- Not applicable

**What NOT to Mock:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- Not applicable

**Location:**
- Not applicable

## Coverage

**Requirements:**
- No coverage requirements enforced
- No coverage tools configured (Jest/Vitest)

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- Not implemented
- Recommendation: When implementing, test utility functions and React component rendering

**Integration Tests:**
- Not implemented
- Recommendation: Test Next.js API routes and page routes as integration once app grows

**E2E Tests:**
- Not implemented
- Candidates: Playwright or Cypress for testing page navigation and user flows

## Current Testing Gaps

**Coverage Status:**
- Zero test coverage on application code
- Files without tests: `app/layout.tsx`, `app/page.tsx`, `next.config.ts`

**Recommendation Priority:**
- High: Before adding business logic, establish testing infrastructure
- Consider: Jest with React Testing Library for component tests, or Vitest for faster feedback
- Consider: Playwright for E2E testing if user-facing workflows become complex

## Future Testing Setup Guidance

**When establishing testing:**

1. **Framework Choice:**
   - Jest + React Testing Library (familiar with Next.js, good component testing)
   - OR Vitest (faster, modern alternative)

2. **Configuration:**
   - Create `jest.config.js` or `vitest.config.ts`
   - Configure TypeScript support
   - Set up module path aliases to match `tsconfig.json` (e.g., `@/*`)

3. **Test Location:**
   - Co-locate tests with source: `component.tsx` + `component.test.tsx`
   - OR use `__tests__` directory per component

4. **Linting:**
   - Add ESLint plugin: `eslint-plugin-testing-library` if using React Testing Library
   - Add ESLint plugin: `eslint-plugin-jest` for Jest-specific rules

5. **Watch Mode:**
   - Include npm script: `"test": "jest --watch"` or `"test": "vitest"`

## Dependencies to Add When Testing

```json
{
  "devDependencies": {
    "jest": "^29",
    "@testing-library/react": "^14",
    "@testing-library/jest-dom": "^6",
    "@types/jest": "^29",
    "ts-jest": "^29"
  }
}
```

OR for Vitest:

```json
{
  "devDependencies": {
    "vitest": "^1",
    "@vitest/ui": "^1",
    "@testing-library/react": "^14",
    "@testing-library/vitest": "^0.1"
  }
}
```

---

*Testing analysis: 2026-02-13*
