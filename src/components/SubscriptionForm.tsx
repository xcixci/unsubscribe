import { useMemo, useState, type FormEvent } from 'react';
import type { BillingCycle, BillingFrequency, CategoryId, PaymentMethod, SubscriptionStatus, UserSubscription } from '../domain/types';
import { FREQUENCIES, annualEquivalent, cycleLabel, monthlyEquivalent, validateCycle } from '../domain/billing';
import { CATEGORIES } from '../domain/categories';
import { inr, inrPrice, parseAmount } from '../domain/money';
import { activePlans, priceLabel } from '../domain/catalogueQueries';
import { MAX_AMOUNT, MAX_LABEL, MAX_NOTE, PAYMENT_METHODS, looksSensitive, safeUrl } from '../storage/validate';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { useToast } from '../state/ToastContext';
import { STATUS_LABEL, VerificationBadge } from './Badges';
import { Sheet } from './Sheet';
import { Logo } from './Logo';
import { Icon } from './Icon';

export type FormMode =
  | { kind: 'add'; serviceId: string | null; planId?: string | null }
  | { kind: 'edit'; sub: UserSubscription };

const SENSITIVE = 'This looks like a card, account or OTP number. Please don’t store those here.';

export function SubscriptionForm({ mode, onClose, onSaved }: { mode: FormMode | null; onClose: () => void; onSaved?: (s: UserSubscription) => void }) {
  return (
    <Sheet
      open={!!mode}
      onClose={onClose}
      title={mode?.kind === 'edit' ? 'Edit subscription' : 'Add a subscription'}
      description="Saved only in this browser."
    >
      {mode && <FormBody key={mode.kind === 'edit' ? mode.sub.id : `${mode.serviceId}-${mode.planId}`} mode={mode} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function FormBody({ mode, onClose, onSaved }: { mode: FormMode; onClose: () => void; onSaved?: (s: UserSubscription) => void }) {
  const { index } = useCatalogue();
  const { add, update, remove, restore, subscriptions } = useSubscriptions();
  const { notify } = useToast();

  const existing = mode.kind === 'edit' ? mode.sub : null;
  const serviceId = existing ? existing.serviceId : mode.kind === 'add' ? mode.serviceId : null;
  const service = serviceId ? index.services.get(serviceId) ?? null : null;
  const plans = useMemo(() => (serviceId ? activePlans(index, serviceId) : []), [index, serviceId]);

  const initialPlanId = existing?.planId ?? (mode.kind === 'add' ? mode.planId ?? null : null);
  const initialPlan = initialPlanId ? index.plans.get(initialPlanId) ?? null : null;

  const [planId, setPlanId] = useState<string>(initialPlan?.id ?? '');
  const [amount, setAmount] = useState<string>(
    existing ? String(existing.amount) : initialPlan?.price != null ? String(initialPlan.price) : '',
  );
  const [amountTouched, setAmountTouched] = useState(!!existing);
  const startCycle: BillingCycle = existing?.billing ?? initialPlan?.billing ?? { frequency: 'monthly' };
  const [frequency, setFrequency] = useState<BillingFrequency>(startCycle.frequency);
  const [customCount, setCustomCount] = useState<string>(String(startCycle.interval?.count ?? 28));
  const [customUnit, setCustomUnit] = useState<'days' | 'months'>(startCycle.interval?.unit ?? 'days');
  const [nextRenewal, setNextRenewal] = useState(existing?.nextRenewal ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(existing?.paymentMethod ?? '');
  const [paymentLabel, setPaymentLabel] = useState(existing?.paymentLabel ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [status, setStatus] = useState<SubscriptionStatus>(existing?.status ?? 'active');
  const [customName, setCustomName] = useState(existing?.custom?.name ?? '');
  const [customCategory, setCustomCategory] = useState<CategoryId>(existing?.custom?.category ?? 'other');
  const [customWebsite, setCustomWebsite] = useState(existing?.custom?.websiteUrl ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const cycle: BillingCycle =
    frequency === 'custom' ? { frequency, interval: { unit: customUnit, count: Number(customCount) } } : { frequency };
  const parsed = parseAmount(amount);
  const cycleError = validateCycle(cycle);
  const selectedPlan = planId ? index.plans.get(planId) ?? null : null;
  const alreadyListed = mode.kind === 'add' && serviceId ? subscriptions.filter((s) => s.serviceId === serviceId).length : 0;

  function choosePlan(id: string) {
    setPlanId(id);
    const p = id ? index.plans.get(id) : null;
    if (!p) return;
    setFrequency(p.billing.frequency);
    if (p.billing.interval) {
      setCustomCount(String(p.billing.interval.count));
      setCustomUnit(p.billing.interval.unit);
    }
    if (!amountTouched && p.price !== null) setAmount(String(p.price));
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!service) {
      if (!customName.trim()) e.customName = 'Enter the name of the service.';
      if (customWebsite.trim() && !safeUrl(customWebsite)) e.customWebsite = 'Enter a full web address starting with https://';
    }
    if (amount.trim() === '') e.amount = 'Enter what you pay each billing cycle.';
    else if (parsed === null) e.amount = 'Enter an amount in rupees, like 649 or 1,499.50.';
    else if (parsed > MAX_AMOUNT) e.amount = 'That amount is too large.';
    if (cycleError) e.cycle = cycleError;
    if (paymentLabel && looksSensitive(paymentLabel)) e.paymentLabel = SENSITIVE;
    if (notes && looksSensitive(notes)) e.notes = SENSITIVE;
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setSaving(true);
    const payload = {
      serviceId: service ? service.id : null,
      custom: service ? undefined : { name: customName.trim().slice(0, 80), category: customCategory, websiteUrl: safeUrl(customWebsite) },
      planId: selectedPlan ? selectedPlan.id : null,
      amount: Math.round(parsed! * 100) / 100,
      currency: 'INR' as const,
      billing: cycle,
      nextRenewal: nextRenewal || undefined,
      paymentMethod: paymentMethod || undefined,
      paymentLabel: paymentLabel.trim().slice(0, MAX_LABEL) || undefined,
      notes: notes.trim().slice(0, MAX_NOTE) || undefined,
      status,
      reminderOffsets: existing?.reminderOffsets,
    };
    const name = service?.name ?? payload.custom!.name;
    try {
      if (existing) {
        await update(existing.id, payload);
        notify(`Saved changes to ${name}.`);
        onSaved?.({ ...existing, ...payload });
      } else {
        const created = await add(payload);
        notify(`Added ${name} to your subscriptions.`);
        onSaved?.(created);
      }
      onClose();
    } catch (err) {
      notify((err as Error).message || 'Could not save. Try again.', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function onRemove() {
    if (!existing) return;
    const removed = await remove(existing.id);
    onClose();
    if (removed) notify(`Removed ${service?.name ?? existing.custom?.name ?? 'subscription'}.`, { action: { label: 'Undo', run: () => void restore(removed) } });
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      {service ? (
        <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
          <Logo name={service.name} src={service.logo} />
          <div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 'var(--step-1)' }}>{service.name}</div>
            <a className="small muted ext" href={service.websiteUrl} target="_blank" rel="noopener noreferrer">
              Official website
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="f-customName">Service name</label>
            <input id="f-customName" className="input" value={customName} maxLength={80} onChange={(e) => setCustomName(e.target.value)} aria-invalid={!!errors.customName} aria-describedby={errors.customName ? 'e-customName' : undefined} autoComplete="off" placeholder="e.g. Local newspaper app" />
            {errors.customName && <span id="e-customName" className="field__error">{errors.customName}</span>}
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="f-customCategory">Category</label>
              <select id="f-customCategory" className="select" value={customCategory} onChange={(e) => setCustomCategory(e.target.value as CategoryId)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-customWebsite">Website (optional)</label>
              <input id="f-customWebsite" className="input" type="url" inputMode="url" value={customWebsite} onChange={(e) => setCustomWebsite(e.target.value)} aria-invalid={!!errors.customWebsite} placeholder="https://" />
              {errors.customWebsite && <span className="field__error">{errors.customWebsite}</span>}
            </div>
          </div>
        </>
      )}

      {alreadyListed > 0 && (
        <div className="notice">
          <Icon name="info" />
          <span>
            {service?.name} is already in your list. Add it again only if you pay for a second account.
          </span>
        </div>
      )}

      {plans.length > 0 && (
        <fieldset>
          <legend>Your plan</legend>
          <div className="options">
            {plans.map((p) => (
              <label key={p.id} className="option">
                <input type="radio" name="plan" value={p.id} checked={planId === p.id} onChange={() => choosePlan(p.id)} />
                <span>
                  <span className="option__name">{p.name}</span>
                  <span className="option__meta" style={{ display: 'block' }}>
                    {p.price !== null ? (p.verification === 'verified' ? 'Listed price, verified' : 'Listed price, awaiting verification') : 'Price not listed'}
                  </span>
                </span>
                <span className="option__price">{p.price !== null ? priceLabel(p.price, p.billing) : '—'}</span>
              </label>
            ))}
            <label className="option">
              <input type="radio" name="plan" value="" checked={planId === ''} onChange={() => choosePlan('')} />
              <span>
                <span className="option__name">Something else</span>
                <span className="option__meta" style={{ display: 'block' }}>
                  An older plan, a bundle or a plan not listed here
                </span>
              </span>
              <span />
            </label>
          </div>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="f-amount">What you actually pay</label>
        <div className="input-money">
          <span aria-hidden="true">₹</span>
          <input
            id="f-amount"
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountTouched(true);
            }}
            aria-invalid={!!errors.amount}
            aria-describedby="h-amount"
            autoComplete="off"
            placeholder="0"
          />
        </div>
        <span id="h-amount" className="field__hint">
          Check your last bill or bank statement. Your amount is used for every calculation, even if the listed price differs.
        </span>
        {selectedPlan?.price != null && parsed !== null && Math.abs(parsed - selectedPlan.price) > 0.009 && (
          <span className="field__hint">
            Listed price: {inrPrice(selectedPlan.price)} <VerificationBadge status={selectedPlan.verification} date={selectedPlan.lastVerified} />
          </span>
        )}
        {errors.amount && <span className="field__error">{errors.amount}</span>}
      </div>

      <div className="field">
        <label htmlFor="f-cycle">How often you pay</label>
        <select id="f-cycle" className="select" value={frequency} onChange={(e) => setFrequency(e.target.value as BillingFrequency)}>
          {FREQUENCIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {frequency === 'custom' && (
          <div className="row">
            <div className="field">
              <label htmlFor="f-customCount" className="visually-hidden">
                Every how many
              </label>
              <input id="f-customCount" className="input" inputMode="numeric" value={customCount} onChange={(e) => setCustomCount(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.cycle} />
            </div>
            <div className="field">
              <label htmlFor="f-customUnit" className="visually-hidden">
                Unit
              </label>
              <select id="f-customUnit" className="select" value={customUnit} onChange={(e) => setCustomUnit(e.target.value as 'days' | 'months')}>
                <option value="days">days (e.g. 28 or 84-day packs)</option>
                <option value="months">months</option>
              </select>
            </div>
          </div>
        )}
        {errors.cycle && <span className="field__error">{errors.cycle}</span>}
      </div>

      {parsed !== null && !cycleError && (
        <div className="panel panel--flat" style={{ padding: 'var(--s-4)', display: 'flex', gap: 'var(--s-5)', flexWrap: 'wrap' }} aria-live="polite">
          <div>
            <div className="small muted">Works out to</div>
            <div className="num" style={{ fontSize: 'var(--step-2)', fontWeight: 700 }}>
              {inr(monthlyEquivalent(parsed, cycle))} a month
            </div>
          </div>
          <div>
            <div className="small muted">Over a year</div>
            <div className="num" style={{ fontSize: 'var(--step-2)', fontWeight: 700 }}>
              {inr(annualEquivalent(parsed, cycle))}
            </div>
          </div>
          <div className="small muted" style={{ flexBasis: '100%' }}>
            Estimate for {inrPrice(parsed)} {cycleLabel(cycle)}.
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="f-renewal">Next renewal date (optional)</label>
        <input id="f-renewal" className="input" type="date" value={nextRenewal} onChange={(e) => setNextRenewal(e.target.value)} />
        <span className="field__hint">Add it to download calendar reminders.</span>
      </div>

      <fieldset>
        <legend>Status</legend>
        <div className="segmented">
          {(['active', 'considering', 'cancelled'] as SubscriptionStatus[]).map((s) => (
            <label key={s}>
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} />
              {STATUS_LABEL[s]}
            </label>
          ))}
        </div>
        <span className="field__hint">Cancelled subscriptions stay in your list but are not counted in your totals.</span>
      </fieldset>

      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Payment method and notes (optional)</summary>
        <div style={{ display: 'grid', gap: 'var(--s-4)', marginTop: 'var(--s-4)' }}>
          <div className="row">
            <div className="field">
              <label htmlFor="f-paymentMethod">Paid with</label>
              <select id="f-paymentMethod" className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}>
                <option value="">Not set</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-paymentLabel">Label</label>
              <input id="f-paymentLabel" className="input" value={paymentLabel} maxLength={MAX_LABEL} onChange={(e) => setPaymentLabel(e.target.value)} placeholder="e.g. HDFC credit card" aria-invalid={!!errors.paymentLabel} autoComplete="off" />
            </div>
          </div>
          {errors.paymentLabel && <span className="field__error">{errors.paymentLabel}</span>}
          <span className="field__hint">Never enter card numbers, CVVs, OTPs or UPI PINs. UNSUBSCRIBE never needs them.</span>
          <div className="field">
            <label htmlFor="f-notes">Notes</label>
            <textarea id="f-notes" className="textarea" value={notes} maxLength={MAX_NOTE} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Shared with family. Ask about the student price." aria-invalid={!!errors.notes} />
            {errors.notes && <span className="field__error">{errors.notes}</span>}
          </div>
        </div>
      </details>

      <div className="sheet__foot" style={{ margin: 'calc(var(--s-5) * -1)', marginTop: 0, position: 'sticky', bottom: 'calc(var(--s-5) * -1)' }}>
        {existing && (
          <button type="button" className="btn btn--ghost" onClick={onRemove}>
            <Icon name="trash" />
            Remove
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={saving}>
          {existing ? 'Save changes' : 'Add to my list'}
        </button>
      </div>
    </form>
  );
}
