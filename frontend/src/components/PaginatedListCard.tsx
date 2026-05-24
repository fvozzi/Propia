import type { ReactNode } from 'react';

type PaginatedListCardProps = {
  title: string;
  page: number;
  totalPages: number;
  pageLabel: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
};

export function PaginatedListCard({
  title,
  page,
  totalPages,
  pageLabel,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  children,
}: PaginatedListCardProps) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={onPrevious}>
          {previousLabel}
        </button>
        <span>
          {pageLabel} {page} / {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
