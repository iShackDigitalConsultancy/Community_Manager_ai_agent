// setupAfterFramework.ts — Jest globals ARE available here.
// Registers global module mocks so every test suite automatically
// gets a mocked DB pool and S3 service.

jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

jest.mock('../shared/s3.service', () => ({
  s3Service: {
    uploadFile: jest.fn().mockResolvedValue('https://s3.example.com/test-file.pdf'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  },
}));
