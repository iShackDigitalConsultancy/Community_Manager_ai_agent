/**
 * Units Service — regression tests specifically targeting the SQL parameter
 * index bug discovered in the `update()` method.
 *
 * BUG: In units.service.ts update(), values are pushed as:
 *   [field1, field2, ..., schemeId, unitId]
 *
 * But the WHERE clause used $${i-2} and $${i-1} which are WRONG after the
 * loop incremented `i` past the last field value. The correct indices are
 * $${i} and $${i+1} (positions after all field values).
 *
 * This test suite would catch that regression.
 */

import { pool } from '../config/database';

// We need to test the dynamic SQL generation logic without a real DB.
// We do this by inspecting what query() was called with.
const mockPool = pool as jest.Mocked<typeof pool>;

describe('UnitsService - SQL parameter bug regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'unit-1' }] });
  });

  it('should call UPDATE with correct parameter indices when 1 field is updated', async () => {
    // Dynamically import AFTER mocks are set
    const { UnitsService } = await import('../modules/units/units.service');
    const service = new UnitsService();

    await service.update('scheme-abc', 'unit-001', { owner_name: 'John Doe' });

    const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
    const sql: string = callArgs[0];
    const params: any[] = callArgs[1];

    // With 1 field, i starts at 1, increments to 2.
    // Values = ['John Doe', 'scheme-abc', 'unit-001']
    // WHERE clause should reference $2 and $3
    expect(sql).toContain('$2');  // schemeId at index 2
    expect(sql).toContain('$3');  // unitId at index 3
    expect(params[0]).toBe('John Doe');
    expect(params[1]).toBe('scheme-abc');
    expect(params[2]).toBe('unit-001');
  });

  it('should call UPDATE with correct parameter indices when 3 fields are updated', async () => {
    const { UnitsService } = await import('../modules/units/units.service');
    const service = new UnitsService();

    await service.update('scheme-abc', 'unit-001', {
      owner_name: 'Jane',
      owner_email: 'jane@example.com',
      tenant_name: 'Bob',
    });

    const callArgs = (mockPool.query as jest.Mock).mock.calls[0];
    const sql: string = callArgs[0];
    const params: any[] = callArgs[1];

    // 3 fields → i goes to 4 → WHERE uses $4 and $5
    expect(sql).toContain('$4');
    expect(sql).toContain('$5');
    expect(params[0]).toBe('Jane');
    expect(params[1]).toBe('jane@example.com');
    expect(params[2]).toBe('Bob');
    expect(params[3]).toBe('scheme-abc');
    expect(params[4]).toBe('unit-001');
  });

  it('should return null when no valid fields are provided', async () => {
    const { UnitsService } = await import('../modules/units/units.service');
    const service = new UnitsService();
    const result = await service.update('scheme-abc', 'unit-001', {});
    expect(result).toBeNull();
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
