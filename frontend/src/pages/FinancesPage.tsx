import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { apiRequest } from '../lib/api';
import { expenseCategoryOptions, useI18n } from '../lib/i18n';
import type {
  Activity,
  CommercialOpportunity,
  ExpenseCategory,
  FinanceConfig,
  FinancialEntry,
  FinancialEntryType,
  Paginated,
  SearchRequirement,
} from '../types';

type EntryFormState = {
  entryType: FinancialEntryType;
  entryDate: string;
  currency: 'USD' | 'ARS';
  expenseCategory: ExpenseCategory;
  activityId: string;
  commercialOpportunityId: string;
  amount: string;
  operationAmount: string;
  commissionPercent: string;
  agentParticipationPercent: string;
  franchisePercent: string;
  notes: string;
};

type OpportunitySummary = {
  key: string;
  opportunity: CommercialOpportunity | null;
  requirement: SearchRequirement | null;
  currency: FinancialEntry['currency'];
  expenses: number;
  income: number;
};

const defaultFinanceConfig: FinanceConfig = {
  id: 0,
  teamId: 0,
  franchisePercent: 55,
  saleCommissionPercent: 3,
  purchaseCommissionPercent: 4,
  createdAt: '',
  updatedAt: '',
};

function createInitialForm(config: FinanceConfig): EntryFormState {
  return {
    entryType: 'EXPENSE',
    entryDate: new Date().toISOString().slice(0, 10),
    currency: 'ARS',
    expenseCategory: 'PHOTOGRAPHY',
    activityId: '',
    commercialOpportunityId: '',
    amount: '',
    operationAmount: '',
    commissionPercent: String(config.saleCommissionPercent),
    agentParticipationPercent: '100',
    franchisePercent: String(config.franchisePercent),
    notes: '',
  };
}

export function FinancesPage() {
  const { t, translateEnum } = useI18n();
  const translateActivityType = (value: string) =>
    translateEnum('activityType', value);
  const translateOperationType = (value: string) =>
    translateEnum('operationType', value);
  const translateRequirementEnums = (
    group: 'operationType' | 'propertyType',
    value: string,
  ) => translateEnum(group, value);

  const [financeConfig, setFinanceConfig] = useState<FinanceConfig>(defaultFinanceConfig);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [opportunities, setOpportunities] = useState<CommercialOpportunity[]>([]);
  const [form, setForm] = useState<EntryFormState>(() =>
    createInitialForm(defaultFinanceConfig),
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void load();
  }, []);

  const deedActivities = useMemo(
    () =>
      activities.filter(
        (activity) =>
          activity.activityType === 'SALE_DEED' ||
          activity.activityType === 'PURCHASE_DEED',
      ),
    [activities],
  );

  const incomePreview = useMemo(() => {
    const operationAmount = Number(form.operationAmount || 0);
    const commissionPercent = Number(form.commissionPercent || 0);
    const agentParticipationPercent = Number(form.agentParticipationPercent || 0);
    const franchisePercent = Number(form.franchisePercent || 0);
    const commissionAmount = roundMoney(operationAmount * (commissionPercent / 100));
    const agentGrossAmount = roundMoney(
      commissionAmount * (agentParticipationPercent / 100),
    );
    const franchiseAmount = roundMoney(agentGrossAmount * (franchisePercent / 100));
    const netIncome = roundMoney(agentGrossAmount - franchiseAmount);

    return {
      commissionAmount,
      agentGrossAmount,
      franchiseAmount,
      netIncome,
    };
  }, [
    form.operationAmount,
    form.commissionPercent,
    form.agentParticipationPercent,
    form.franchisePercent,
  ]);

  const opportunitySummaries = useMemo(() => {
    const map = new Map<string, OpportunitySummary>();

    for (const entry of entries) {
      const linkedOpportunity = entry.commercialOpportunity ?? null;
      const linkedRequirement = entry.searchRequirement ?? null;
      const summaryKey = linkedOpportunity
        ? `opportunity:${linkedOpportunity.id}:${entry.currency}`
        : linkedRequirement
          ? `requirement:${linkedRequirement.id}:${entry.currency}`
          : null;

      if (!summaryKey) {
        continue;
      }

      const current = map.get(summaryKey) ?? {
        key: summaryKey,
        opportunity: linkedOpportunity,
        requirement: linkedRequirement,
        currency: entry.currency,
        expenses: 0,
        income: 0,
      };

      if (entry.entryType === 'EXPENSE') {
        current.expenses += entry.amount;
      } else {
        current.income += entry.netIncomeAmount ?? entry.amount;
      }

      map.set(summaryKey, current);
    }

    return Array.from(map.values()).sort((left, right) => {
      const leftBalance = left.income - left.expenses;
      const rightBalance = right.income - right.expenses;
      return rightBalance - leftBalance;
    });
  }, [entries]);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [configResponse, entriesResponse, activitiesResponse, opportunitiesResponse] =
        await Promise.all([
          apiRequest<FinanceConfig>('/finance-config'),
          apiRequest<FinancialEntry[]>('/financial-entries'),
          apiRequest<Paginated<Activity>>('/activities?page=1&limit=100'),
          apiRequest<Paginated<CommercialOpportunity>>(
            '/commercial-opportunities?page=1&limit=100',
          ),
        ]);

      setFinanceConfig(configResponse);
      setEntries(entriesResponse);
      setActivities(activitiesResponse.items);
      setOpportunities(opportunitiesResponse.items);
      setForm(createInitialForm(configResponse));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('finances.loadError'));
    } finally {
      setLoading(false);
    }
  }

  function updateForm(patch: Partial<EntryFormState>) {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleEntryTypeChange(entryType: FinancialEntryType) {
    setForm((current) => ({
      ...current,
      entryType,
      currency: entryType === 'EXPENSE' ? 'ARS' : current.currency,
      amount: entryType === 'EXPENSE' ? current.amount : '',
      operationAmount: entryType === 'INCOME' ? current.operationAmount : '',
      commissionPercent:
        entryType === 'INCOME'
          ? current.commissionPercent || String(financeConfig.saleCommissionPercent)
          : current.commissionPercent,
      agentParticipationPercent:
        entryType === 'INCOME'
          ? current.agentParticipationPercent || '100'
          : current.agentParticipationPercent,
      franchisePercent:
        entryType === 'INCOME'
          ? current.franchisePercent || String(financeConfig.franchisePercent)
          : current.franchisePercent,
      activityId:
        entryType === 'INCOME' && current.activityId
          ? current.activityId
          : entryType === 'EXPENSE'
            ? current.activityId
            : '',
    }));
  }

  function handleIncomeActivityChange(activityId: string) {
    const nextActivity = deedActivities.find((activity) => String(activity.id) === activityId);
    const nextCommissionPercent =
      nextActivity?.activityType === 'PURCHASE_DEED'
        ? financeConfig.purchaseCommissionPercent
        : financeConfig.saleCommissionPercent;

    setForm((current) => ({
      ...current,
      activityId,
      commercialOpportunityId:
        nextActivity?.commercialOpportunityId
          ? String(nextActivity.commercialOpportunityId)
          : current.commercialOpportunityId,
      commissionPercent: String(nextCommissionPercent),
      franchisePercent: String(financeConfig.franchisePercent),
    }));
  }

  function handleExpenseActivityChange(activityId: string) {
    const nextActivity = activities.find((activity) => String(activity.id) === activityId);

    setForm((current) => ({
      ...current,
      activityId,
      commercialOpportunityId:
        nextActivity?.commercialOpportunityId
          ? String(nextActivity.commercialOpportunityId)
          : current.commercialOpportunityId,
    }));
  }

  async function handleCreateEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      await apiRequest('/financial-entries', {
        method: 'POST',
        body: JSON.stringify({
          entryType: form.entryType,
          entryDate: form.entryDate,
          currency: form.currency,
          expenseCategory: form.entryType === 'EXPENSE' ? form.expenseCategory : undefined,
          activityId: form.activityId ? Number(form.activityId) : undefined,
          commercialOpportunityId: form.commercialOpportunityId
            ? Number(form.commercialOpportunityId)
            : undefined,
          amount: form.entryType === 'EXPENSE' ? Number(form.amount) : undefined,
          operationAmount:
            form.entryType === 'INCOME' ? Number(form.operationAmount) : undefined,
          commissionPercent:
            form.entryType === 'INCOME' ? Number(form.commissionPercent) : undefined,
          agentParticipationPercent:
            form.entryType === 'INCOME'
              ? Number(form.agentParticipationPercent)
              : undefined,
          franchisePercent:
            form.entryType === 'INCOME' ? Number(form.franchisePercent) : undefined,
          notes: form.notes || undefined,
        }),
      });

      setNotice(t('finances.entrySaved'));
      setForm(createInitialForm(financeConfig));
      setIsCreateOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('finances.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entryId: number) {
    if (!window.confirm(t('finances.confirmDelete'))) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await apiRequest(`/financial-entries/${entryId}`, {
        method: 'DELETE',
      });
      setNotice(t('finances.entryDeleted'));
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('finances.deleteError'));
    }
  }

  function handleCloseCreateForm() {
    setForm(createInitialForm(financeConfig));
    setIsCreateOpen(false);
  }

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('finances.eyebrow')}
        title={t('finances.title')}
        actions={
          <div className="candidate-actions">
            <Link to="/settings" className="ghost-button button-link">
              {t('nav.settings')}
            </Link>
            {isCreateOpen ? (
              <button
                type="button"
                className="ghost-button"
                onClick={handleCloseCreateForm}
              >
                {t('finances.closeForm')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setForm(createInitialForm(financeConfig));
                  setIsCreateOpen(true);
                }}
              >
                {t('finances.newEntry')}
              </button>
            )}
          </div>
        }
      />

      {error ? <div className="card">{error}</div> : null}
      {notice ? <div className="card">{notice}</div> : null}

      {isCreateOpen ? (
        <section className="card">
          <h3>{t('finances.newEntry')}</h3>
          <p className="muted">{t('finances.subtitle')}</p>

          <form className="form-grid" onSubmit={handleCreateEntry}>
            <label>
              {t('finances.entryType')}
              <select
                value={form.entryType}
                onChange={(event) =>
                  handleEntryTypeChange(event.target.value as FinancialEntryType)
                }
              >
                <option value="EXPENSE">{t('finances.expenseEntry')}</option>
                <option value="INCOME">{t('finances.incomeEntry')}</option>
              </select>
            </label>

            <label>
              {t('finances.entryDate')}
              <input
                type="date"
                value={form.entryDate}
                onChange={(event) => updateForm({ entryDate: event.target.value })}
                required
              />
            </label>

            <label>
              {t('common.currency')}
              <select
                value={form.currency}
                onChange={(event) =>
                  updateForm({ currency: event.target.value as 'USD' | 'ARS' })
                }
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </label>

            <label>
              {t('finances.opportunityOptional')}
              <select
                value={form.commercialOpportunityId}
                onChange={(event) =>
                  updateForm({ commercialOpportunityId: event.target.value })
                }
              >
                <option value="">{t('finances.noOpportunitySelected')}</option>
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {buildOpportunityLabel(opportunity, translateOperationType)}
                  </option>
                ))}
              </select>
            </label>

            {form.entryType === 'EXPENSE' ? (
              <>
                <label>
                  {t('finances.expenseCategory')}
                  <select
                    value={form.expenseCategory}
                    onChange={(event) =>
                      updateForm({
                        expenseCategory: event.target.value as ExpenseCategory,
                      })
                    }
                  >
                    {expenseCategoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {translateEnum('expenseCategory', option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {t('finances.activityOptional')}
                  <select
                    value={form.activityId}
                    onChange={(event) => handleExpenseActivityChange(event.target.value)}
                  >
                    <option value="">{t('finances.noActivitySelected')}</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {buildActivityLabel(activity, translateActivityType)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {t('common.amount')}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => updateForm({ amount: event.target.value })}
                    required
                  />
                </label>

                <p className="muted">{t('finances.amountHint')}</p>
              </>
            ) : (
              <>
                <label className="full-span">
                  {t('finances.deedActivity')}
                  <select
                    value={form.activityId}
                    onChange={(event) => handleIncomeActivityChange(event.target.value)}
                    required
                  >
                    <option value="">{t('finances.noActivitySelected')}</option>
                    {deedActivities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {buildActivityLabel(activity, translateActivityType)}
                      </option>
                    ))}
                  </select>
                </label>

                {!loading && deedActivities.length === 0 ? (
                  <div className="full-span">
                    <p className="muted">{t('finances.deedHint')}</p>
                    <Link to="/activities/new" className="button-link">
                      {t('finances.openActivities')}
                    </Link>
                  </div>
                ) : null}

                <label>
                  {t('finances.operationAmount')}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.operationAmount}
                    onChange={(event) =>
                      updateForm({ operationAmount: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  {t('finances.commissionPercent')}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.commissionPercent}
                    onChange={(event) =>
                      updateForm({ commissionPercent: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  {t('finances.agentParticipationPercent')}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.agentParticipationPercent}
                    onChange={(event) =>
                      updateForm({ agentParticipationPercent: event.target.value })
                    }
                    required
                  />
                  <span className="muted">{t('finances.agentParticipationHint')}</span>
                </label>

                <label>
                  {t('finances.franchisePercent')}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.franchisePercent}
                    onChange={(event) =>
                      updateForm({ franchisePercent: event.target.value })
                    }
                    required
                  />
                </label>

                <div className="list-item">
                  <strong>{t('finances.commissionAmount')}</strong>
                  <span>{formatMoney(incomePreview.commissionAmount, form.currency)}</span>
                </div>
                <div className="list-item">
                  <strong>{t('finances.agentGrossAmount')}</strong>
                  <span>{formatMoney(incomePreview.agentGrossAmount, form.currency)}</span>
                </div>
                <div className="list-item">
                  <strong>{t('finances.franchiseAmount')}</strong>
                  <span>{formatMoney(incomePreview.franchiseAmount, form.currency)}</span>
                </div>
                <div className="list-item">
                  <strong>{t('finances.netIncome')}</strong>
                  <span>{formatMoney(incomePreview.netIncome, form.currency)}</span>
                </div>
              </>
            )}

            <label className="full-span">
              {t('common.notes')}
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => updateForm({ notes: event.target.value })}
              />
            </label>

            <div className="full-span candidate-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? t('common.loading')
                  : form.entryType === 'EXPENSE'
                    ? t('finances.saveExpense')
                    : t('finances.saveIncome')}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleCloseCreateForm}
              >
                {t('finances.closeForm')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card">
        <h3>{t('finances.entriesTitle')}</h3>
        {loading ? <p className="muted">{t('common.loading')}</p> : null}
        {!loading && entries.length === 0 ? (
          <p className="muted">{t('finances.noEntries')}</p>
        ) : null}
        {!loading && entries.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('finances.entryDate')}</th>
                  <th>{t('finances.entryType')}</th>
                  <th>{t('finances.entryConcept')}</th>
                  <th>{t('finances.opportunityColumn')}</th>
                  <th>{t('finances.activityColumn')}</th>
                  <th>{t('finances.amountColumn')}</th>
                  <th>{t('common.notes')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.entryDate).toLocaleDateString('es-AR')}</td>
                    <td>
                      {entry.entryType === 'EXPENSE'
                        ? t('finances.expenseEntry')
                        : t('finances.incomeEntry')}
                    </td>
                    <td>
                      <div className="table-cell-stack">
                        <strong>
                          {entry.entryType === 'EXPENSE'
                            ? translateEnum('expenseCategory', entry.expenseCategory ?? 'OTHER')
                            : t('finances.incomeEntry')}
                        </strong>
                        {entry.entryType === 'INCOME' ? (
                          <span className="muted">
                            {t('finances.commissionAmount')}:{' '}
                            {formatMoney(entry.commissionAmount ?? 0, entry.currency)} |{' '}
                            {t('finances.agentGrossAmount')}:{' '}
                            {formatMoney(
                              entry.agentGrossAmount ?? entry.commissionAmount ?? 0,
                              entry.currency,
                            )}{' '}
                            ({entry.agentParticipationPercent ?? 100}%) |{' '}
                            {t('finances.franchiseAmount')}:{' '}
                            {formatMoney(entry.franchiseAmount ?? 0, entry.currency)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {buildEntryOpportunityLabel(
                        entry,
                        translateOperationType,
                        translateRequirementEnums,
                      )}
                    </td>
                    <td>
                      {entry.activity
                        ? buildActivityLabel(entry.activity, translateActivityType)
                        : '-'}
                    </td>
                    <td>
                      {formatMoney(
                        entry.entryType === 'INCOME'
                          ? entry.netIncomeAmount ?? entry.amount
                          : entry.amount,
                        entry.currency,
                      )}
                    </td>
                    <td>{entry.notes?.trim() ? entry.notes : '-'}</td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => void handleDeleteEntry(entry.id)}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h3>{t('finances.summaryTitle')}</h3>
        {!loading && opportunitySummaries.length === 0 ? (
          <p className="muted">{t('finances.noSummary')}</p>
        ) : null}
        <div className="stack-gap">
          {opportunitySummaries.map(
            ({ key, opportunity, requirement, currency, expenses, income }) => (
              <article key={key} className="list-item">
                <strong>
                  {buildSummaryLabel(
                    opportunity,
                    requirement,
                    translateOperationType,
                    translateRequirementEnums,
                  )}
                </strong>
                <span className="muted">{currency}</span>
                <p className="muted">
                  {t('finances.totalExpenses')}: {formatMoney(expenses, currency)}
                </p>
                <p className="muted">
                  {t('finances.totalIncome')}: {formatMoney(income, currency)}
                </p>
                <p className="muted">
                  {t('finances.balance')}: {formatMoney(income - expenses, currency)}
                </p>
              </article>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function buildActivityLabel(
  activity: Activity,
  translateActivityType: (value: string) => string,
) {
  return `${translateActivityType(activity.activityType)} - ${activity.title}`;
}

function buildRequirementLabel(
  requirement: SearchRequirement,
  translateRequirementEnums: (
    group: 'operationType' | 'propertyType',
    value: string,
  ) => string,
) {
  return [
    requirement.contact?.displayName ?? `#${requirement.id}`,
    translateRequirementEnums('operationType', requirement.operationType),
    translateRequirementEnums('propertyType', requirement.propertyType),
  ].join(' - ');
}

function buildOpportunityLabel(
  opportunity: CommercialOpportunity,
  translateOperationType: (value: string) => string,
) {
  return [
    opportunity.contact?.displayName ?? `#${opportunity.id}`,
    translateOperationType(opportunity.operationType),
    opportunity.property?.title ?? opportunity.title,
  ].join(' - ');
}

function buildEntryOpportunityLabel(
  entry: FinancialEntry,
  translateOperationType: (value: string) => string,
  translateRequirementEnums: (
    group: 'operationType' | 'propertyType',
    value: string,
  ) => string,
) {
  if (entry.commercialOpportunity) {
    return buildOpportunityLabel(entry.commercialOpportunity, translateOperationType);
  }

  if (entry.searchRequirement) {
    return buildRequirementLabel(entry.searchRequirement, translateRequirementEnums);
  }

  return '-';
}

function buildSummaryLabel(
  opportunity: CommercialOpportunity | null,
  requirement: SearchRequirement | null,
  translateOperationType: (value: string) => string,
  translateRequirementEnums: (
    group: 'operationType' | 'propertyType',
    value: string,
  ) => string,
) {
  if (opportunity) {
    return buildOpportunityLabel(opportunity, translateOperationType);
  }

  if (requirement) {
    return buildRequirementLabel(requirement, translateRequirementEnums);
  }

  return '-';
}

function formatMoney(value: number, currency: 'USD' | 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
