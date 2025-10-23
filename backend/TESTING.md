# Testing Guide

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up test environment variables in `.env.test`:
```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/whatsapp_integration_test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-jwt-secret
UNIPILE_WEBHOOK_SECRET=test-unipile-webhook-secret
MICROSOFT_WEBHOOK_SECRET=test-microsoft-webhook-secret
GMAIL_WEBHOOK_SECRET=test-gmail-webhook-secret
```

3. Run tests:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `src/__tests__/setup.ts` - Test setup and mocks
- `src/__tests__/emailSafety.test.ts` - Email safety system tests
- `src/__tests__/webhookAuth.test.ts` - Webhook authentication tests
- `src/__tests__/outlookController.test.ts` - Outlook controller tests
- `src/__tests__/usageController.test.ts` - Usage controller tests

## Code Quality

### Linting
```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix
```

### Formatting
```bash
# Format code with Prettier
npm run format
```

## Coverage

The test suite covers:
- ✅ Email safety system (rate limits, attachment validation)
- ✅ Webhook authentication (HMAC-SHA256 verification)
- ✅ Controller error handling
- ✅ Database operations
- ✅ Usage tracking

## Running Tests

### Individual Test Files
```bash
# Test specific file
npm test emailSafety.test.ts

# Test with pattern
npm test -- --testNamePattern="should allow valid email requests"
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Mock Strategy

- **Database**: Mocked with jest.fn() for query operations
- **Redis**: Mocked with custom implementation
- **BullMQ**: Mocked queue and worker operations
- **External APIs**: Mocked HTTP responses

## Test Data

Tests use realistic but safe test data:
- Test email addresses: `test@example.com`
- Test user IDs: `test-user`
- Test account IDs: `1`, `2`, etc.
- Mock timestamps and signatures
