import { useI18n } from '../lib/i18n';

type BuyerSearchWorkflowProps = {
  currentStep?: 1 | 2 | 3 | null;
  completedThrough?: 0 | 1 | 2 | 3;
  stopped?: boolean;
  compact?: boolean;
};

export function BuyerSearchWorkflow({
  currentStep,
  completedThrough = 0,
  stopped = false,
  compact = false,
}: BuyerSearchWorkflowProps) {
  const { t } = useI18n();
  const steps = [
    {
      number: 1 as const,
      title: t('requirements.workflowSearchTitle'),
      description: t('requirements.workflowSearchDescription'),
      condition: t('requirements.workflowSearchCondition'),
    },
    {
      number: 2 as const,
      title: t('requirements.workflowManageTitle'),
      description: t('requirements.workflowManageDescription'),
      condition: t('requirements.workflowManageCondition'),
    },
    {
      number: 3 as const,
      title: t('requirements.workflowVisitTitle'),
      description: t('requirements.workflowVisitDescription'),
      condition: t('requirements.workflowVisitCondition'),
    },
  ];

  return (
    <div className={`buyer-search-workflow${compact ? ' compact' : ''}`}>
      {!compact ? (
        <div className="buyer-search-workflow-heading">
          <strong>{t('requirements.workflowTitle')}</strong>
          <span className="muted">{t('requirements.workflowIntro')}</span>
        </div>
      ) : null}
      <div className="buyer-search-workflow-steps">
        {steps.map((step) => {
          const state =
            step.number <= completedThrough
              ? 'completed'
              : currentStep === step.number
                ? 'current'
                : stopped
                  ? 'stopped'
                  : 'upcoming';
          const stateLabel =
            state === 'completed'
              ? t('requirements.workflowStateDone')
              : state === 'current'
                ? t('requirements.workflowStateCurrent')
                : state === 'stopped'
                  ? t('requirements.workflowStateStopped')
                  : t('requirements.workflowStateNext');

          return (
            <div key={step.number} className={`buyer-search-workflow-step ${state}`}>
              <span className="buyer-search-workflow-number">{step.number}</span>
              <div>
                <strong>{step.title}</strong>
                {!compact ? <p>{step.description}</p> : null}
                <small>{step.condition}</small>
              </div>
              {currentStep !== undefined ? (
                <span className="buyer-search-workflow-state">{stateLabel}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
