import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PersonalData, SubscriptionStatus, UserSubscription } from '../domain/types';
import { cycleLabel } from '../domain/billing';
import { daysBetween, formatDate, formatShortDate, isIsoDate, nextRenewalOnOrAfter, relativeDays, todayIso } from '../domain/dates';
import { inr, inrPrice } from '../domain/money';
import { buildCalendar } from '../domain/ics';
import { recommendationsFor } from '../domain/recommendations';
import { summarise, toLine, type SpendLine } from '../domain/spending';
import { validatePersonalData } from '../storage/validate';
import { downloadText, readFileText } from '../lib/download';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { useToast } from '../state/ToastContext';
import { CategoryBars } from '../components/CategoryBars';
import { Logo } from '../components/Logo';
import { Icon } from '../components/Icon';
import { STATUS_LABEL, StatusBadge } from '../components/Badges';
import { Sheet } from '../components/Sheet';
import { ServicePicker } from '../components/ServicePicker';
import { SubscriptionForm, type FormMode } from '../components/SubscriptionForm';
import { DEFAULT_OFFSETS, ReminderDialog } from '../components/ReminderDialog';
import { RecommendationItem } from '../components/Recommendations';

type Filter = 'all' | SubscriptionStatus;

export function Mine() {
  const { index } = useCatalogue();
  const subs = useSubscriptions();
  const [params, setParams] = useSearchParams();
  const [picking, setPicking] = useState(false);
  const [form, setForm] = useState<FormMode | null>(null);
  const [remind, setRemind] = useState<UserSubscription | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const today = todayIso();

  useEffect(() => {
    if (params.get('add') === '1') {
      setPicking(true);
      const next = new URLSearchParams(params);
      next.delete('add');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const summary = useMemo(() => summarise(subs.subscriptions, index), [subs.subscriptions, index]);
  const allLines = useMemo(() => {
    const order: Record<SubscriptionStatus, number> = { active: 0, considering: 0, cancelled: 1 };
    return subs.subscriptions
      .map((s) => toLine(s, index))
      .sort((a, b) => order[a.sub.status] - order[b.sub.status] || b.annual - a.annual);
  }, [subs.subscriptions, index]);
  const shown = allLines.filter((l) => filter === 'all' || l.sub.status === filter);

  const upcoming = useMemo(
    () =>
      summary.lines
        .filter((l) => isIsoDate(l.sub.nextRenewal))
        .map((l) => ({ l, next: nextRenewalOnOrAfter(l.sub.nextRenewal!, l.sub.billing, today) }))
        .filter((x) => daysBetween(today, x.next) <= 30)
        .sort((a, b) => a.next.localeCompare(b.next)),
    [summary, today],
  );

  const pick = (serviceId: string) => {
    setPicking(false);
    setForm({ kind: 'add', serviceId });
  };

  if (!subs.ready) {
    return (
      <div className="container page" aria-busy="true">
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    );
  }

  const empty = subs.subscriptions.length === 0;

  return (
    <div className="container page">
      <header className="page-head page-head--row">
        <div>
          <h1>
            My subscriptions<span className="dot">.</span>
          </h1>
          <p>{empty ? 'Tap the services you pay for, then enter what you actually pay.' : 'What you pay, worked out per month and per year. Based on the amounts you entered.'}</p>
        </div>
        {!empty && (
          <button type="button" className="btn" onClick={() => setPicking(true)}>
            <Icon name="plus" />
            Add subscription
          </button>
        )}
      </header>

      {!subs.persistent && (
        <div className="notice notice--warn" style={{ marginBottom: 'var(--s-5)' }} role="alert">
          <Icon name="alert" />
          <span>Your browser is blocking storage, so this list will be lost when you close the tab. Export a backup before leaving.</span>
        </div>
      )}

      {empty ? (
        <div className="mine-empty">
          <ServicePicker onPick={pick} onCustom={() => setForm({ kind: 'add', serviceId: null })} />
        </div>
      ) : (
        <>
          <section aria-label="Totals" className="kpis">
            <div className="kpi kpi--hero">
              <span className="kpi__label">You spend about</span>
              <span className="kpi__value">
                {inr(summary.monthly)}
                <span className="kpi__unit"> a month</span>
              </span>
              <span className="kpi__note">
                {summary.lines.length} {summary.lines.length === 1 ? 'subscription' : 'subscriptions'}
                {summary.cancelledCount ? `, not counting ${summary.cancelledCount} cancelled` : ''}
              </span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Per year</span>
              <span className="kpi__value">{inr(summary.annual)}</span>
              <span className="kpi__note">Estimate</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Over 5 years</span>
              <span className="kpi__value">{inr(summary.fiveYear)}</span>
              <span className="kpi__note">If prices stay the same</span>
            </div>
          </section>

          {summary.consideringCount > 0 && (
            <div className="callout">
              <p>
                Cancelling the {summary.consideringCount} {summary.consideringCount === 1 ? 'subscription' : 'subscriptions'} you’re unsure about would free up{' '}
                <strong className="num">{inr(summary.consideringAnnual)} a year</strong>.
              </p>
              <button type="button" className="btn btn--small" onClick={() => setFilter('considering')}>
                Show them
              </button>
            </div>
          )}

          <div className="mine-grid">
            <section className="panel" aria-labelledby="by-cat">
              <h2 id="by-cat" className="panel__title">
                Spending by category
              </h2>
              {summary.byCategory.length ? (
                <CategoryBars data={summary.byCategory} total={summary.annual} />
              ) : (
                <p className="muted">Everything in your list is marked cancelled.</p>
              )}
            </section>
            <section className="panel" aria-labelledby="upcoming">
              <h2 id="upcoming" className="panel__title">
                Renewing in the next 30 days
              </h2>
              {upcoming.length ? (
                <ul className="upcoming">
                  {upcoming.map(({ l, next }) => (
                    <li key={l.sub.id}>
                      <span className="upcoming__date num">
                        {formatShortDate(next)}
                        <small>{relativeDays(today, next)}</small>
                      </span>
                      <span className="upcoming__name">
                        {l.name}
                        <small className="num">{inrPrice(l.sub.amount)}</small>
                      </span>
                      <button type="button" className="icon-btn" aria-label={`Reminder for ${l.name}`} onClick={() => setRemind(l.sub)}>
                        <Icon name="calendar" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  {summary.lines.some((l) => l.sub.nextRenewal)
                    ? 'Nothing renews in the next 30 days.'
                    : 'Add renewal dates to see what’s coming up and download calendar reminders.'}
                </p>
              )}
            </section>
          </div>

          <section className="section" aria-labelledby="list-title" style={{ marginTop: 'var(--s-7)' }}>
            <div className="section-head">
              <h2 id="list-title">Your list</h2>
              <div className="chips" role="group" aria-label="Filter by status" style={{ paddingBottom: 0 }}>
                {(['all', 'active', 'considering', 'cancelled'] as Filter[]).map((f) => {
                  const n = f === 'all' ? subs.subscriptions.length : subs.subscriptions.filter((s) => s.status === f).length;
                  return (
                    <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'All' : STATUS_LABEL[f]}
                      <span className="chip__count">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {shown.length === 0 ? (
              <div className="state">
                <h3>Nothing marked “{filter === 'all' ? 'All' : STATUS_LABEL[filter]}”</h3>
                <button type="button" className="btn btn--ghost" onClick={() => setFilter('all')}>
                  Show all
                </button>
              </div>
            ) : (
              <ul className="sub-list">
                {shown.map((l) => (
                  <SubscriptionRow key={l.sub.id} line={l} onEdit={() => setForm({ kind: 'edit', sub: l.sub })} onRemind={() => setRemind(l.sub)} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <DataPanel empty={empty} />

      <Sheet open={picking} onClose={() => setPicking(false)} title="What do you pay for?" description="Pick a service, then enter what you pay.">
        {picking && <ServicePicker onPick={pick} onCustom={() => { setPicking(false); setForm({ kind: 'add', serviceId: null }); }} />}
      </Sheet>
      <SubscriptionForm mode={form} onClose={() => setForm(null)} />
      <ReminderDialog sub={remind} onClose={() => setRemind(null)} />
    </div>
  );
}

function SubscriptionRow({ line, onEdit, onRemind }: { line: SpendLine; onEdit: () => void; onRemind: () => void }) {
  const { catalogue, index } = useCatalogue();
  const [open, setOpen] = useState(false);
  const today = todayIso();
  const recs = useMemo(() => recommendationsFor(line.sub, index, catalogue.offers, catalogue.bundles, today), [line.sub, index, catalogue, today]);
  const saving = recs.filter((r) => (r.annualDifference ?? 0) > 0 && r.kind !== 'price_check').length;
  const next = line.sub.nextRenewal && isIsoDate(line.sub.nextRenewal) ? nextRenewalOnOrAfter(line.sub.nextRenewal, line.sub.billing, today) : null;
  const cancelled = line.sub.status === 'cancelled';
  const panelId = `recs-${line.sub.id}`;

  return (
    <li className={`sub-row${cancelled ? ' sub-row--cancelled' : ''}`}>
      <div className="sub-row__main">
        <Logo name={line.name} src={line.service?.logo} />
        <div className="sub-row__name">
          {line.service ? <Link to={`/explore/${line.service.id}`}>{line.name}</Link> : <span>{line.name}</span>}
          <small>{line.plan?.name ?? (line.service ? 'Plan not listed' : 'Custom subscription')}</small>
        </div>
        <div className="sub-row__amount">
          <span className="num">{inrPrice(line.sub.amount)}</span>
          <small>{cycleLabel(line.sub.billing)}</small>
        </div>
        <div className="sub-row__equiv">
          <span className="num">{inr(line.monthly)}/mo</span>
          <small className="num">{inr(line.annual)}/yr</small>
        </div>
        <div className="sub-row__renew">
          {next ? (
            <>
              <span>Renews {formatDate(next)}</span>
              <small>{relativeDays(today, next)}</small>
            </>
          ) : (
            <button type="button" className="link-btn small" onClick={onRemind}>
              Add renewal date
            </button>
          )}
        </div>
        <div className="sub-row__status">
          <StatusBadge status={line.sub.status} />
        </div>
        <div className="sub-row__actions">
          <button type="button" className="icon-btn" onClick={onRemind} aria-label={`Renewal reminder for ${line.name}`}>
            <Icon name="calendar" />
          </button>
          <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Edit ${line.name}`}>
            <Icon name="edit" />
          </button>
        </div>
      </div>
      {line.sub.notes && <p className="sub-row__notes small muted">{line.sub.notes}</p>}
      {recs.length > 0 && !cancelled && (
        <>
          <button type="button" className="sub-row__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
            <Icon name="chevron" className={open ? 'rot' : ''} />
            {saving > 0 ? `${saving} ${saving === 1 ? 'way' : 'ways'} to pay less` : `${recs.length} ${recs.length === 1 ? 'thing' : 'things'} to check`}
          </button>
          {open && (
            <ul id={panelId} className="rec-list rec-list--inset">
              {recs.slice(0, 6).map((r) => (
                <RecommendationItem key={r.id} rec={r} />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

function DataPanel({ empty }: { empty: boolean }) {
  const subs = useSubscriptions();
  const { index } = useCatalogue();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: PersonalData; warnings: string[] } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const today = todayIso();

  function exportBackup() {
    const data = subs.exportData();
    downloadText(`unsubscribe-backup-${today}.json`, JSON.stringify(data, null, 2), 'application/json');
    notify(`Backup downloaded with ${data.subscriptions.length} ${data.subscriptions.length === 1 ? 'subscription' : 'subscriptions'}.`);
  }

  function downloadAllReminders() {
    const withDates = summarise(subs.subscriptions, index).lines.filter((l) => isIsoDate(l.sub.nextRenewal));
    if (!withDates.length) {
      notify('Add a renewal date to at least one subscription first.', { tone: 'error' });
      return;
    }
    const ics = buildCalendar(
      withDates.map((l) => ({
        id: l.sub.id,
        name: l.name,
        amountLabel: inrPrice(l.sub.amount),
        renewalDate: nextRenewalOnOrAfter(l.sub.nextRenewal!, l.sub.billing, today),
        cycle: l.sub.billing,
        offsets: l.sub.reminderOffsets ?? DEFAULT_OFFSETS,
        manageUrl: l.service?.websiteUrl,
      })),
    );
    downloadText(`unsubscribe-renewals-${today}.ics`, ics, 'text/calendar;charset=utf-8');
    notify(`Calendar file downloaded with reminders for ${withDates.length} ${withDates.length === 1 ? 'subscription' : 'subscriptions'}.`);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readFileText(file);
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('That file isn’t valid JSON. Choose a backup exported from UNSUBSCRIBE.');
      }
      const result = validatePersonalData(json);
      if (!result.ok) throw new Error(result.error);
      if (subs.subscriptions.length === 0) {
        await subs.replaceAll(result.data, 'replace');
        notify(`Restored ${result.data.subscriptions.length} subscriptions from your backup.${result.warnings.length ? ' Some sensitive-looking notes were removed.' : ''}`);
      } else {
        setPending({ data: result.data, warnings: result.warnings });
      }
    } catch (err) {
      notify((err as Error).message, { tone: 'error' });
    }
  }

  async function applyImport(mode: 'replace' | 'merge') {
    if (!pending) return;
    await subs.replaceAll(pending.data, mode);
    notify(mode === 'replace' ? `Replaced your list with ${pending.data.subscriptions.length} subscriptions from the backup.` : `Merged ${pending.data.subscriptions.length} subscriptions from the backup.`);
    setPending(null);
  }

  return (
    <section className="section data-panel" aria-labelledby="data-title">
      <div className="data-panel__text">
        <h2 id="data-title">Your data</h2>
        <p>
          Your list is saved in this browser on this device only. It doesn’t sync to your phone or other browsers, and clearing your browser data
          deletes it. Nothing is sent to UNSUBSCRIBE or anyone else. Export a backup to move it or keep it safe.
        </p>
      </div>
      <div className="data-panel__actions">
        <button type="button" className="btn btn--ghost" onClick={exportBackup} disabled={empty}>
          <Icon name="download" />
          Export backup (.json)
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" />
          Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        <button type="button" className="btn btn--ghost" onClick={downloadAllReminders} disabled={empty}>
          <Icon name="calendar" />
          All reminders (.ics)
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setConfirmClear(true)} disabled={empty}>
          <Icon name="trash" />
          Delete all data
        </button>
      </div>

      <Sheet
        open={!!pending}
        onClose={() => setPending(null)}
        variant="center"
        title="Import this backup?"
        description={pending ? `The backup has ${pending.data.subscriptions.length} subscriptions${pending.data.updatedAt ? `, saved ${formatDate(pending.data.updatedAt.slice(0, 10))}` : ''}.` : undefined}
      >
        <p>You already have {subs.subscriptions.length} subscriptions in this browser.</p>
        {pending?.warnings.length ? <p className="small muted">{pending.warnings.join(' ')}</p> : null}
        <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
          <button type="button" className="btn" onClick={() => applyImport('merge')}>
            Merge with my list
          </button>
          <p className="small muted">Adds the backup’s subscriptions. Items that exist in both are replaced by the backup’s version.</p>
          <button type="button" className="btn btn--ghost" onClick={() => applyImport('replace')}>
            Replace my list
          </button>
          <p className="small muted">Deletes your current list and uses only the backup.</p>
        </div>
      </Sheet>

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} variant="center" title="Delete all your data?" description="This removes every subscription from this browser. It can’t be undone.">
        <p>If you might want this list later, export a backup first.</p>
        <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--ghost" onClick={exportBackup}>
            <Icon name="download" />
            Export backup
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              await subs.clearAll();
              setConfirmClear(false);
              notify('All your data was deleted from this browser.');
            }}
          >
            Delete everything
          </button>
        </div>
      </Sheet>
    </section>
  );
}
