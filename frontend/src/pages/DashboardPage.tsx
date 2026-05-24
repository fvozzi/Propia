import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { DashboardData } from '../types';

export function DashboardPage() {
  const { formatDateTime, t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<DashboardData>('/dashboard/today')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p>{t('common.loading')}</p>;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h2>{t('dashboard.title')}</h2>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>{t('dashboard.dueToday')}</span>
          <strong>{data?.followUpsDueToday.length ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{t('dashboard.overdue')}</span>
          <strong>{data?.overdueFollowUps.length ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{t('dashboard.visitsToday')}</span>
          <strong>{data?.visitsToday.length ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{t('dashboard.activeProperties')}</span>
          <strong>{data?.activePropertiesCount ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{t('dashboard.activeRequirements')}</span>
          <strong>{data?.activeSearchRequirementsCount ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{t('dashboard.pendingBuyerShares')}</span>
          <strong>{data?.pendingBuyerPropertySharesCount ?? 0}</strong>
        </article>
      </section>

      <div className="two-column">
        <section className="card">
          <h3>{t('dashboard.dueToday')}</h3>
          {(data?.followUpsDueToday ?? []).map((activity) => (
            <div key={activity.id} className="list-item">
              <strong>{activity.title}</strong>
              <span>{activity.contact?.displayName ?? t('common.noContact')}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h3>{t('dashboard.overdue')}</h3>
          {(data?.overdueFollowUps ?? []).map((activity) => (
            <div key={activity.id} className="list-item">
              <strong>{activity.title}</strong>
              <span>{activity.contact?.displayName ?? t('common.noContact')}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="card">
        <h3>{t('dashboard.visitsToday')}</h3>
        {(data?.visitsToday ?? []).map((visit) => (
          <div key={visit.id} className="list-item">
            <strong>{visit.property?.title ?? t('dashboard.propertyFallback')}</strong>
            <span>
              {visit.contact?.displayName ?? t('common.noContact')} · {formatDateTime(visit.scheduledAt)}
            </span>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>{t('dashboard.pendingBuyerSharesList')}</h3>
        {(data?.pendingBuyerPropertyShares ?? []).map((activity) => (
          <div key={activity.id} className="list-item">
            <strong>{activity.title}</strong>
            <span>{activity.contact?.displayName ?? t('common.noContact')}</span>
            {activity.contactId ? (
              <Link to={`/contacts/${activity.contactId}`} className="agenda-link">
                {t('calendar.openContact')}
              </Link>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
