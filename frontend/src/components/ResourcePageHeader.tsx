import type { ReactNode } from 'react';

type ResourcePageHeaderProps = {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
};

export function ResourcePageHeader({ eyebrow, title, actions }: ResourcePageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {actions ? <div className="toolbar toolbar-wrap">{actions}</div> : null}
    </section>
  );
}
