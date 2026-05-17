import { describe, expect, it, vi } from 'vitest';
import { paginate } from './pagination';

describe('paginate', () => {
  it('uses page and limit to page a query builder', async () => {
    const queryBuilder = {
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[{ id: 1 }, { id: 2 }], 21]),
    };

    const result = await paginate(queryBuilder as never, {
      page: 2,
      limit: 5,
    });

    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      meta: {
        page: 2,
        limit: 5,
        total: 21,
        totalPages: 5,
      },
    });
  });

  it('keeps at least one page even when there are no results', async () => {
    const queryBuilder = {
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
    };

    const result = await paginate(queryBuilder as never, {});

    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });
  });
});
