import { StatusPill } from './StatusPill';

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  description?: string | null;
  type: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function Timeline({
  title,
  emptyMessage,
  items,
}: {
  title: string;
  emptyMessage: string;
  items: TimelineItem[];
}) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {items.length === 0 ? <p className="muted">{emptyMessage}</p> : null}
      <div className="timeline">
        {items.map((item) => (
          <article key={item.id} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-card">
              <div className="timeline-header">
                <div>
                  <strong>{item.title}</strong>
                  {item.subtitle ? <p className="muted">{item.subtitle}</p> : null}
                </div>
                <div className="timeline-meta">
                  <StatusPill value={item.type} />
                  <span className="muted">{formatDate(item.date)}</span>
                </div>
              </div>
              {item.description ? <p className="timeline-description">{item.description}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
