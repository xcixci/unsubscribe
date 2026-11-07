import { describe, expect, it } from 'vitest';
import { buildCalendar, buildEvents, escapeText, foldLine, googleCalendarUrl, rrule } from '../src/domain/ics';

const now = new Date('2026-11-07T06:30:00Z');
const base = { id: 'abc', name: 'Netflix', amountLabel: '₹649', renewalDate: '2026-12-01', cycle: { frequency: 'monthly' as const } };

describe('calendar reminders (.ics)', () => {
  it('creates one all-day event per reminder, dated before the renewal', () => {
    const events = buildEvents({ ...base, offsets: [7, 3, 1, 0] }, now);
    expect(events).toHaveLength(4);
    expect(events[0]).toContain('DTSTART;VALUE=DATE:20261124');
    expect(events[1]).toContain('DTSTART;VALUE=DATE:20261128');
    expect(events[2]).toContain('DTSTART;VALUE=DATE:20261130');
    expect(events[3]).toContain('DTSTART;VALUE=DATE:20261201');
    expect(events[3]).toContain('DTEND;VALUE=DATE:20261202');
    expect(events[0]).toContain('SUMMARY:Netflix renews in 7 days (₹649)');
    expect(events[2]).toContain('SUMMARY:Netflix renews tomorrow (₹649)');
    expect(events[3]).toContain('SUMMARY:Netflix renews today (₹649)');
  });

  it('repeats on the billing cycle and alarms at 9 am', () => {
    const [e] = buildEvents({ ...base, offsets: [3] }, now);
    expect(e).toContain('RRULE:FREQ=MONTHLY;INTERVAL=1');
    expect(e).toContain('TRIGGER;RELATED=START:PT9H');
    expect(e).toContain('UID:abc-3d@unsubscribe');
    expect(e).toContain('DTSTAMP:20261107T063000Z');
  });

  it('maps every billing cycle to a recurrence rule', () => {
    expect(rrule({ frequency: 'quarterly' })).toBe('FREQ=MONTHLY;INTERVAL=3');
    expect(rrule({ frequency: 'half_yearly' })).toBe('FREQ=MONTHLY;INTERVAL=6');
    expect(rrule({ frequency: 'annual' })).toBe('FREQ=YEARLY;INTERVAL=1');
    expect(rrule({ frequency: 'custom', interval: { unit: 'days', count: 84 } })).toBe('FREQ=DAILY;INTERVAL=84');
    expect(rrule({ frequency: 'custom', interval: { unit: 'months', count: 24 } })).toBe('FREQ=YEARLY;INTERVAL=2');
  });

  it('wraps events in a valid calendar with CRLF line endings', () => {
    const cal = buildCalendar([{ ...base, offsets: [1] }], now);
    expect(cal.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(cal.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(cal).not.toMatch(/[^\r]\n/);
    expect(cal.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(cal.match(/BEGIN:VALARM/g)).toHaveLength(1);
  });

  it('ignores duplicate or invalid offsets and invalid dates', () => {
    expect(buildEvents({ ...base, offsets: [1, 1, -2] }, now)).toHaveLength(1);
    expect(buildEvents({ ...base, renewalDate: 'soon', offsets: [1] }, now)).toHaveLength(0);
  });

  it('escapes special characters', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('folds long lines at 75 octets without splitting multi-byte characters', () => {
    const line = 'DESCRIPTION:' + '₹'.repeat(40);
    const folded = foldLine(line);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n ').join('')).toBe(line);
  });

  it('builds a Google Calendar link with recurrence', () => {
    const url = new URL(googleCalendarUrl(base)!);
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261201/20261202');
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=MONTHLY;INTERVAL=1');
  });
});
