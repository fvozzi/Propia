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
  const today = formatDateKey(new Date());

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

  const stats = [
    {
      label: t('dashboard.dueToday'),
      value: data?.followUpsDueToday.length ?? 0,
      to: '/activities?nextFollowUpStatus=DUE_TODAY',
    },
    {
      label: t('dashboard.overdue'),
      value: data?.overdueFollowUps.length ?? 0,
      to: '/activities?nextFollowUpStatus=OVERDUE',
    },
    {
      label: t('dashboard.visitsToday'),
      value: data?.visitsToday.length ?? 0,
      to: `/visits?date=${today}`,
    },
    {
      label: t('dashboard.activeProperties'),
      value: data?.activePropertiesCount ?? 0,
      to: '/properties?status=ACTIVE',
    },
    {
      label: t('dashboard.activeRequirements'),
      value: data?.activeSearchRequirementsCount ?? 0,
      to: '/requirements?status=ACTIVE',
    },
    {
      label: t('dashboard.pendingBuyerShares'),
      value: data?.pendingBuyerPropertySharesCount ?? 0,
      to: '/activities?activityType=PROPERTY_SEARCH&whatsappShareStatus=PENDING',
    },
  ];

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h2>{t('dashboard.title')}</h2>
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="stat-card dashboard-stat-link">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </Link>
        ))}
      </section>

      <section className="card">
        <div className="page-header">
          <h3>{t('dashboard.weeklyGoalsTitle')}</h3>
        </div>
        {(data?.weeklyActivityGoals ?? []).length === 0 ? (
          <p className="muted">{t('dashboard.weeklyGoalsEmpty')}</p>
        ) : (
          <div className="stats-grid dashboard-stats-grid">
            {(data?.weeklyActivityGoals ?? []).map((goal) => (
              <article key={goal.goalId} className="stat-card">
                <span>{translateEnum('activityType', goal.activityType)}</span>
                <strong>
                  {goal.completedCount}/{goal.targetCount}
                </strong>
                <small className="muted">
                  {t('dashboard.weeklyGoalsProgress')}: {goal.completedCount}
                </small>
                <small className="muted">
                  {goal.remainingCount > 0
                    ? `${t('dashboard.weeklyGoalsRemaining')}: ${goal.remainingCount}`
                    : t('dashboard.weeklyGoalsAchieved')}
                </small>
              </article>
            ))}
          </div>
        )}
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

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
