// Jest env setup — only environment variables go here (runs BEFORE Jest globals)
// jest.mock() calls belong in setupFilesAfterFramework (see jest.config.js) or
// inside individual test files that need them.
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
process.env.JWT_EXPIRY = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-placeholder';
process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
process.env.BREVO_API_KEY = 'xkeysib-test-key-placeholder';
process.env.BREVO_OTP_TEMPLATE_ID = '1';
