import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type {
  Activity,
  ActivityType,
  DashboardData,
  DashboardOpportunityPipelineStep,
  OperationType,
} from '../types';

const operationDisplayOrder: OperationType[] = ['SALE', 'BUY', 'RENT'];

export function DashboardPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperationType, setSelectedOperationType] =
    useState<OperationType>('SALE');
  const today = formatDateKey(new Date());

  useEffect(() => {
    apiRequest<DashboardData>('/dashboard/today')
      .then((nextData) => {
        setData(nextData);

        const firstNonEmptyGroup = operationDisplayOrder.find((operationType) =>
          nextData.opportunityPipelineGroups.some(
            (group) => group.operationType === operationType && group.total > 0,
          ),
        );

        if (firstNonEmptyGroup) {
          setSelectedOperationType(firstNonEmptyGroup);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedOpportunityGroup = useMemo(
    () =>
      data?.opportunityPipelineGroups.find(
        (group) => group.operationType === selectedOperationType,
      ) ?? null,
    [data, selectedOperationType],
  );
  const dueTodayGroups = useMemo(
    () => groupActivitiesByType(data?.followUpsDueToday ?? []),
    [data?.followUpsDueToday],
  );
  const overdueGroups = useMemo(
    () => groupActivitiesByType(data?.overdueFollowUps ?? []),
    [data?.overdueFollowUps],
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
          <Link
            key={stat.label}
            to={stat.to}
            className="stat-card dashboard-stat-link"
          >
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
          <h3>{t('dashboard.opportunitiesByType')}</h3>
        </div>
        {(data?.opportunityPipelineGroups ?? []).every(
          (group) => group.total === 0,
        ) ? (
          <p className="muted">{t('dashboard.opportunitiesEmpty')}</p>
        ) : (
          <>
            <div className="dashboard-operation-grid">
              {(data?.opportunityPipelineGroups ?? []).map((group) => (
                <button
                  key={group.operationType}
                  type="button"
                  className={`dashboard-operation-card ${group.operationType === selectedOperationType ? 'active' : ''}`}
                  onClick={() => setSelectedOperationType(group.operationType)}
                >
                  <strong>{translateEnum('operationType', group.operationType)}</strong>
                  <span>{group.total}</span>
                  <small>
                    {group.wonCount} {t('dashboard.opportunitiesWon')}
                  </small>
                </button>
              ))}
            </div>

            {selectedOpportunityGroup ? (
              <div className="requirement-pipeline-list">
                {selectedOpportunityGroup.items.map((item) => (
                  <article
                    key={item.opportunityId}
                    className="list-item dashboard-pipeline-item"
                  >
                    <div className="dashboard-pipeline-header">
                      <div>
                        <strong>{item.title}</strong>
                        <p className="muted">
                          {item.contactDisplayName}
                          {item.propertyTitle ? ` · ${item.propertyTitle}` : ''}
                        </p>
                        <p className="muted">
                          {translateEnum('commercialOpportunityStage', item.stage)} ·{' '}
                          {translateEnum('commercialOpportunityStatus', item.status)}
                        </p>
                      </div>
                      <div className="dashboard-pipeline-meta">
                        <span>
                          {item.completedStepsCount}/{item.totalStepsCount}
                        </span>
                        <Link to="/opportunities" className="agenda-link">
                          {t('nav.commercialOpportunities')}
                        </Link>
                      </div>
                    </div>
                    <div className="requirement-step-row">
                      {item.steps.map((step) => (
                        <div
                          key={step.key}
                          className={`requirement-step ${step.completed ? 'completed' : 'pending'}`}
                        >
                          <span className="requirement-step-state">
                            {step.completed
                              ? t('dashboard.requirementsCompleted')
                              : t('dashboard.requirementsPending')}
                          </span>
                          <strong>{translateOpportunityStep(step, t)}</strong>
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
          <GroupedActivityList
            groups={dueTodayGroups}
            emptyLabel={t('dashboard.pendingActivitiesEmpty')}
            noContactLabel={t('common.noContact')}
            openContactLabel={t('calendar.openContact')}
            translateActivityType={(activityType) =>
              translateEnum('activityType', activityType)
            }
          />
        </section>

        <section className="card">
          <h3>{t('dashboard.overdue')}</h3>
          <GroupedActivityList
            groups={overdueGroups}
            emptyLabel={t('dashboard.pendingActivitiesEmpty')}
            noContactLabel={t('common.noContact')}
            openContactLabel={t('calendar.openContact')}
            translateActivityType={(activityType) =>
              translateEnum('activityType', activityType)
            }
          />
        </section>
      </div>

      <section className="card">
        <h3>{t('dashboard.visitsToday')}</h3>
        {(data?.visitsToday ?? []).map((visit) => (
          <div key={visit.id} className="list-item">
            <strong>
              {visit.property?.title ??
                visit.externalPropertyTitle ??
                t('dashboard.propertyFallback')}
            </strong>
            <span>
              {visit.contact?.displayName ?? t('common.noContact')} ·{' '}
              {formatDateTime(visit.scheduledAt)}
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

function GroupedActivityList({
  groups,
  emptyLabel,
  noContactLabel,
  openContactLabel,
  translateActivityType,
}: {
  groups: Array<{ activityType: ActivityType; items: Activity[] }>;
  emptyLabel: string;
  noContactLabel: string;
  openContactLabel: string;
  translateActivityType: (activityType: ActivityType) => string;
}) {
  if (groups.length === 0) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <div className="dashboard-activity-groups">
      {groups.map((group) => (
        <div key={group.activityType} className="dashboard-activity-group">
          <div className="dashboard-activity-group-header">
            <strong>{translateActivityType(group.activityType)}</strong>
            <span>{group.items.length}</span>
          </div>
          {group.items.map((activity) => (
            <div key={activity.id} className="list-item">
              <strong>{activity.title}</strong>
              <span>{activity.contact?.displayName ?? noContactLabel}</span>
              {activity.contactId ? (
                <Link to={`/contacts/${activity.contactId}`} className="agenda-link">
                  {openContactLabel}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupActivitiesByType(activities: Activity[]) {
  const groups = new Map<ActivityType, Activity[]>();

  for (const activity of activities) {
    const current = groups.get(activity.activityType) ?? [];
    current.push(activity);
    groups.set(activity.activityType, current);
  }

  return Array.from(groups.entries()).map(([activityType, items]) => ({
    activityType,
    items,
  }));
}

function translateOpportunityStep(
  step: DashboardOpportunityPipelineStep,
  t: (path: string) => string,
) {
  switch (step.key) {
    case 'CONTACT_LINKED':
      return t('dashboard.stepContactLinked');
    case 'REQUIREMENT_LINKED':
      return t('dashboard.stepRequirementLinked');
    case 'PROPERTIES_SHARED':
      return t('dashboard.stepPropertiesShared');
    case 'VISITS_COMPLETED':
      return t('dashboard.stepVisitsCompleted');
    case 'PRELISTING_SENT':
      return t('dashboard.stepPrelistingSent');
    case 'PRELISTING_COMPLETED':
      return t('dashboard.stepPrelistingCompleted');
    case 'PROPERTY_READY':
      return t('dashboard.stepPropertyReady');
    case 'NEGOTIATING':
      return t('dashboard.stepNegotiating');
    case 'RESERVED':
      return t('dashboard.stepReserved');
    case 'CLOSED_WON':
      return t('dashboard.stepClosedWon');
    default:
      return step.key;
  }
}
