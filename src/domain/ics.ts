import type { BillingCycle } from './types';
import { addDays, isIsoDate } from './dates';
import { cycleDays, cycleMonths } from './billing';

/**
 * iCalendar (RFC 5545) generation for renewal reminders.
 *
 * Each reminder is its own all-day event so it shows up in every calendar app,
 * including Google Calendar, which ignores alarms inside imported files.
 * Each event also carries a 9:00 am alarm for apps that honour VALARM
 * (Apple Calendar, Outlook). The calendar app sends the notification —
 * UNSUBSCRIBE never does.
 */

export const REMINDER_OPTIONS = [
  { days: 7, label: '7 days before' },
  { days: 3, label: '3 days before' },
  { days: 1, label: '1 day before' },
  { days: 0, label: 'On the renewal date' },
] as const;

export interface ReminderInput {
  /** Stable id of the subscription, used to build UIDs. */
  id: string;
  name: string;
  /** Formatted amount, e.g. "₹649". */
  amountLabel: string;
  renewalDate: string;
  cycle: BillingCycle;
  offsets: number[];
  manageUrl?: string;
}

export function rrule(cycle: BillingCycle): string | null {
  const months = cycleMonths(cycle);
  if (months !== null) {
    return months % 12 === 0
      ? `FREQ=YEARLY;INTERVAL=${months / 12}`
      : `FREQ=MONTHLY;INTERVAL=${months}`;
  }
  const days = cycleDays(cycle);
  if (days !== null) return `FREQ=DAILY;INTERVAL=${days}`;
  return null;
}

/** RFC 5545 text escaping. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1), never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      out.push(current);
      current = ch;
      bytes = n;
      limit = 74; // continuation lines start with a space
    } else {
      current += ch;
      bytes += n;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

const compact = (iso: string) => iso.replace(/-/g, '');

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function reminderTitle(name: string, amountLabel: string, offset: number): string {
  if (offset === 0) return `${name} renews today (${amountLabel})`;
  if (offset === 1) return `${name} renews tomorrow (${amountLabel})`;
  return `${name} renews in ${offset} days (${amountLabel})`;
}

export function buildEvents(input: ReminderInput, now: Date = new Date()): string[] {
  if (!isIsoDate(input.renewalDate)) return [];
  const rule = rrule(input.cycle);
  const offsets = [...new Set(input.offsets)].filter((o) => Number.isInteger(o) && o >= 0).sort((a, b) => b - a);
  return offsets.map((offset) => {
    const date = addDays(input.renewalDate, -offset);
    const end = addDays(date, 1);
    const title = reminderTitle(input.name, input.amountLabel, offset);
    const description = [
      `${input.name} is due to renew on ${input.renewalDate} for ${input.amountLabel}.`,
      'Still using it? If not, cancel before the renewal date.',
      input.manageUrl ? `Manage: ${input.manageUrl}` : '',
      'Reminder created with UNSUBSCRIBE. Your calendar app sends this alert.',
    ]
      .filter(Boolean)
      .join('\n');
    const lines = [
      'BEGIN:VEVENT',
      `UID:${input.id}-${offset}d@unsubscribe`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compact(date)}`,
      `DTEND;VALUE=DATE:${compact(end)}`,
      ...(rule ? [`RRULE:${rule}`] : []),
      `SUMMARY:${escapeText(title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(title)}`,
      // All-day events start at midnight; PT9H fires at 9:00 am on the reminder day.
      'TRIGGER;RELATED=START:PT9H',
      'END:VALARM',
      'END:VEVENT',
    ];
    return lines.map(foldLine).join('\r\n');
  });
}

export function buildCalendar(inputs: ReminderInput[], now: Date = new Date()): string {
  const events = inputs.flatMap((i) => buildEvents(i, now));
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UNSUBSCRIBE//Renewal reminders//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Subscription renewals',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'
  );
}

/** Google Calendar "add event" link for the renewal date itself (opens Google in a new tab). */
export function googleCalendarUrl(input: Omit<ReminderInput, 'offsets'>): string | null {
  if (!isIsoDate(input.renewalDate)) return null;
  const rule = rrule(input.cycle);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${input.name} renews (${input.amountLabel})`,
    dates: `${compact(input.renewalDate)}/${compact(addDays(input.renewalDate, 1))}`,
    details: `${input.name} renews for ${input.amountLabel}. Still using it? Cancel before the renewal date if not.`,
  });
  if (rule) params.set('recur', `RRULE:${rule}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function slugForFile(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'subscription';
}
