import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type {
  DashboardData,
  DashboardRequirementPipelineGroup,
  DashboardRequirementPipelineStep,
  OperationType,
} from '../types';

const operationDisplayOrder: OperationType[] = ['SALE', 'BUY', 'RENT'];

export function DashboardPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperationType, setSelectedOperationType] = useState<OperationType>('SALE');

  useEffect(() => {
    apiRequest<DashboardData>('/dashboard/today')
      .then((nextData) => {
        setData(nextData);

        const firstNonEmptyGroup = operationDisplayOrder.find((operationType) =>
          nextData.requirementPipelineGroups.some((group) => group.operationType === operationType && group.total > 0),
        );

        if (firstNonEmptyGroup) {
          setSelectedOperationType(firstNonEmptyGroup);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedRequirementGroup = useMemo(
    () => data?.requirementPipelineGroups.find((group) => group.operationType === selectedOperationType) ?? null,
    [data, selectedOperationType],
  );

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

      <section className="stats-grid dashboard-stats-grid">
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

      <section className="card">
        <div className="page-header">
          <h3>{t('dashboard.requirementsByType')}</h3>
        </div>
        {(data?.requirementPipelineGroups ?? []).every((group) => group.total === 0) ? (
          <p className="muted">{t('dashboard.requirementsEmpty')}</p>
        ) : (
          <>
            <div className="dashboard-operation-grid">
              {(data?.requirementPipelineGroups ?? []).map((group) => (
                <button
                  key={group.operationType}
                  type="button"
                  className={`dashboard-operation-card ${group.operationType === selectedOperationType ? 'active' : ''}`}
                  onClick={() => setSelectedOperationType(group.operationType)}
                >
                  <strong>{translateEnum('operationType', group.operationType)}</strong>
                  <span>{group.total}</span>
                  <small>
                    {group.fullyCompleted} {t('dashboard.requirementsCompleted')}
                  </small>
                </button>
              ))}
            </div>

            {selectedRequirementGroup ? (
              <div className="requirement-pipeline-list">
                {selectedRequirementGroup.items.map((item) => (
                  <article key={item.requirementId} className="list-item dashboard-pipeline-item">
                    <div className="dashboard-pipeline-header">
                      <div>
                        <strong>{item.contactDisplayName}</strong>
                        <p className="muted">
                          {translateEnum('propertyType', item.propertyType)}
                          {item.propertyTitle ? ` · ${item.propertyTitle}` : ''}
                        </p>
                      </div>
                      <div className="dashboard-pipeline-meta">
                        <span>
                          {item.completedStepsCount}/{item.totalStepsCount}
                        </span>
                        <Link to="/requirements" className="agenda-link">
                          {t('nav.requirements')}
                        </Link>
                      </div>
                    </div>
                    <div className="requirement-step-row">
                      {item.steps.map((step) => (
                        <div key={step.key} className={`requirement-step ${step.completed ? 'completed' : 'pending'}`}>
                          <span className="requirement-step-state">
                            {step.completed ? t('dashboard.requirementsCompleted') : t('dashboard.requirementsPending')}
                          </span>
                          <strong>{translateRequirementStep(step, t)}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        )}
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

function translateRequirementStep(step: DashboardRequirementPipelineStep, t: (path: string) => string) {
  switch (step.key) {
    case 'CONTACT_LINKED':
      return t('dashboard.stepContactLinked');
    case 'CRITERIA_DEFINED':
      return t('dashboard.stepCriteriaDefined');
    case 'PROPERTIES_SHARED':
      return t('dashboard.stepPropertiesShared');
    case 'PROPERTY_LINKED':
      return t('dashboard.stepPropertyLinked');
    case 'APPRAISAL_REQUEST_SENT':
      return t('dashboard.stepAppraisalRequestSent');
    case 'APPRAISAL_REQUEST_COMPLETED':
      return t('dashboard.stepAppraisalRequestCompleted');
    default:
      return step.key;
  }
}
