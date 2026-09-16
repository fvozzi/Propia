import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/api';
import { CalendarPage } from './CalendarPage';
import type { Activity } from '../types';

vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/i18n')>(),
  useI18n: () => ({ locale: 'es', t: (key: string) => key, translateEnum: (_: string, value: string) => value }),
}));

describe('calendar activity editing', () => {
  let container: HTMLDivElement;
  let root: Root;
  let activity: Activity;
  let failSave: boolean;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 16, 6));
    activity = {
      id: 42,
      activityType: 'VISIT',
      title: 'Muestra original',
      description: 'Notas originales',
      contactId: null,
      propertyId: null,
      activityDate: new Date(2026, 8, 16, 7).toISOString(),
      nextFollowUpDate: new Date(2026, 8, 17, 10).toISOString(),
    } as Activity;
    failSave = false;
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/activities/42/sync-calendar') {
        if (failSave) throw new Error('No se pudo reintentar');
        activity = { ...activity, googleSyncStatus: 'SYNCED', googleSyncError: null, googleEventId: 'google-42' };
        return activity;
      }
      if (options?.method === 'PATCH' || options?.method === 'POST') {
        if (failSave) throw new Error('No se pudo guardar');
        activity = { ...activity, ...JSON.parse(options.body as string) };
        return activity;
      }
      if (path.startsWith('/activities?')) return { items: [activity] };
      if (path.startsWith('/calendar/agenda?')) {
        return { birthdays: [], googleEvents: [], googleCalendarConnected: false, googleCalendarPermissionGranted: false };
      }
      return { items: [] };
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(MemoryRouter, null, createElement(CalendarPage)));
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function clickButton(text: string, parent: ParentNode = container) {
    const button = Array.from(parent.querySelectorAll('button')).find((item) => item.textContent === text);
    expect(button).toBeDefined();
    await act(async () => button!.click());
  }

  function field(label: string) {
    const element = Array.from(container.querySelectorAll('.modal-card label'))
      .find((item) => item.textContent?.startsWith(label));
    const input = element?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
    expect(input).toBeTruthy();
    return input;
  }

  async function changeField(label: string, value: string) {
    const input = field(label);
    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async function submit() {
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  it('edits the existing activity, preserves local time and refreshes the agenda', async () => {
    await clickButton('activities.editActivity', container.querySelector('.agenda-item')!);
    expect(field('common.title').value).toBe('Muestra original');
    expect(field('activities.activityDate').value).toBe('2026-09-16T07:00');
    expect(field('activities.nextFollowUp').value).toBe('2026-09-17T10:00');
    await changeField('common.title', 'Muestra editada');
    await changeField('common.description', '');
    await changeField('activities.nextFollowUp', '');
    await submit();

    const writes = vi.mocked(apiRequest).mock.calls.filter(([, options]) => options?.method);
    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe('/activities/42');
    expect(writes[0][1]?.method).toBe('PATCH');
    expect(JSON.parse(writes[0][1]!.body as string)).toMatchObject({
      title: 'Muestra editada',
      description: null,
      nextFollowUpDate: null,
      activityDate: new Date(2026, 8, 16, 7).toISOString(),
    });
    expect(container.querySelector('.modal-card')).toBeNull();
    expect(container.querySelector('.agenda-item')?.textContent).toContain('Muestra editada');
  });

  it('shows a deed sync error and retries the existing activity without creating another', async () => {
    activity.activityType = 'SALE_DEED';
    activity.googleSyncStatus = 'ERROR';
    activity.googleSyncError = 'Google unavailable';
    // Refresh the agenda by moving away from and back to the visible month.
    await clickButton('common.next');
    await clickButton('common.previous');
    const day = container.querySelector('button.calendar-day[aria-label*="16"]') as HTMLButtonElement;
    await act(async () => day.click());
    expect(container.querySelector('.agenda-item')?.textContent).toContain('Google unavailable');
    await clickButton('calendar.retryGoogleSync');
    expect(apiRequest).toHaveBeenCalledWith('/activities/42/sync-calendar', { method: 'POST' });
    expect(container.querySelector('.agenda-item')?.textContent).toContain('calendar.googleSynced');
    expect(container.querySelector('.agenda-item')?.textContent).not.toContain('Google unavailable');
    expect(vi.mocked(apiRequest).mock.calls.filter(([, options]) => options?.method)).toHaveLength(1);
  });

  it('opens upcoming activities and follows a reschedule to another month', async () => {
    await clickButton('activities.editActivity', container.querySelector('.mini-agenda-item')!);
    await changeField('activities.activityDate', '2026-10-20T15:30');
    await submit();
    expect(container.querySelector('.calendar-month-title')?.textContent).toContain('octubre');
    expect(container.querySelector('.calendar-selected-header')?.textContent).toContain('20');
    expect(container.querySelector('.agenda-item')?.textContent).toContain('Muestra original');
    expect(activity.activityDate).toBe(new Date(2026, 9, 20, 15, 30).toISOString());
  });

  it('keeps the draft on failure and creates a new activity after closing the editor', async () => {
    await clickButton('activities.editActivity');
    await changeField('common.title', 'Borrador');
    failSave = true;
    await submit();
    expect(container.querySelector('.modal-card [role="alert"]')?.textContent).toBe('No se pudo guardar');
    expect(field('common.title').value).toBe('Borrador');
    await clickButton('calendar.closeComposer');
    await clickButton('calendar.addTask');
    expect(field('common.title').value).toBe('');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await changeField('common.title', 'Nueva muestra');
    failSave = false;
    await submit();
    expect(apiRequest).toHaveBeenLastCalledWith(expect.stringContaining('/calendar/agenda?'));
    expect(apiRequest).toHaveBeenCalledWith('/activities', expect.objectContaining({ method: 'POST' }));
  });
});
