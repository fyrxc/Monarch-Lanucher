export interface PageResult<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): PageResult<T> {
  if (!Number.isFinite(pageSize) || pageSize <= 0) {
    throw new Error("pageSize must be greater than zero");
  }

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Number.isFinite(page) ? Math.trunc(page) : 1;
  const safePage = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
  };
}
