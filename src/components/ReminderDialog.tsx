import { useState } from 'react';
import type { UserSubscription } from '../domain/types';
import { REMINDER_OPTIONS, buildCalendar, googleCalendarUrl, slugForFile } from '../domain/ics';
import { formatDate, isIsoDate, nextRenewalOnOrAfter, relativeDays, todayIso } from '../domain/dates';
import { inrPrice } from '../domain/money';
import { describeSubscription } from '../domain/spending';
import { downloadText } from '../lib/download';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { useToast } from '../state/ToastContext';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

export const DEFAULT_OFFSETS = [3, 1];

export function ReminderDialog({ sub, onClose }: { sub: UserSubscription | null; onClose: () => void }) {
  return (
    <Sheet open={!!sub} onClose={onClose} variant="center" title="Renewal reminder" description="Your calendar app sends the reminder. UNSUBSCRIBE can’t notify you itself.">
      {sub && <Body key={sub.id} sub={sub} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ sub, onClose }: { sub: UserSubscription; onClose: () => void }) {
  const { index } = useCatalogue();
  const { update } = useSubscriptions();
  const { notify } = useToast();
  const { name, service } = describeSubscription(sub, index);
  const today = todayIso();
  const [date, setDate] = useState(sub.nextRenewal ?? '');
  const [offsets, setOffsets] = useState<number[]>(sub.reminderOffsets ?? DEFAULT_OFFSETS);
  const [error, setError] = useState('');

  const valid = isIsoDate(date);
  const next = valid ? nextRenewalOnOrAfter(date, sub.billing, today) : null;
  const amountLabel = inrPrice(sub.amount);

  function toggle(d: number) {
    setOffsets((o) => (o.includes(d) ? o.filter((x) => x !== d) : [...o, d]));
  }

  async function download() {
    if (!next) return setError('Enter the next renewal date first.');
    if (!offsets.length) return setError('Choose at least one reminder.');
    setError('');
    const ics = buildCalendar([{ id: sub.id, name, amountLabel, renewalDate: next, cycle: sub.billing, offsets, manageUrl: service?.websiteUrl }]);
    downloadText(`${slugForFile(name)}-renewal-reminders.ics`, ics, 'text/calendar;charset=utf-8');
    await update(sub.id, { nextRenewal: date, reminderOffsets: offsets });
    notify('Calendar file downloaded. Open it to add the reminders to your calendar.');
    onClose();
  }

  const google = next ? googleCalendarUrl({ id: sub.id, name, amountLabel, renewalDate: next, cycle: sub.billing }) : null;

  return (
    <>
      <div className="field">
        <label htmlFor="r-date">Next renewal of {name}</label>
        <input id="r-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!error && !valid} />
        {next && (
          <span className="field__hint">
            {next !== date ? `That date has passed, so reminders start from the next renewal: ` : 'Renews '}
            {formatDate(next)} ({relativeDays(today, next)}) for {amountLabel}.
          </span>
        )}
      </div>
      <fieldset>
        <legend>Remind me</legend>
        {REMINDER_OPTIONS.map((o) => (
          <label key={o.days} className="check">
            <input type="checkbox" checked={offsets.includes(o.days)} onChange={() => toggle(o.days)} />
            {o.label}
          </label>
        ))}
        <span className="field__hint">Reminders repeat every billing cycle, at 9 am on the day.</span>
      </fieldset>
      {error && <p className="field__error">{error}</p>}
      <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
        <button type="button" className="btn" onClick={download}>
          <Icon name="download" />
          Download calendar file (.ics)
        </button>
        <p className="small muted">Works with Apple Calendar, Outlook and Google Calendar (import the file in Google Calendar settings).</p>
        {google && (
          <a className="btn btn--ghost" href={google} target="_blank" rel="noopener noreferrer">
            <Icon name="calendar" />
            Add renewal date to Google Calendar
          </a>
        )}
        {google && <p className="small muted">Opens Google Calendar with the event filled in. Google then sees the event details.</p>}
      </div>
    </>
  );
}
