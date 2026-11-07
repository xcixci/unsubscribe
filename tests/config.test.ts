import { describe, expect, it } from 'vitest';
import { readConfig, supportConfigured } from '../src/config/site';
import shipped from '../src/config/site.config.json';

const base = structuredClone(shipped);

describe('site configuration', () => {
  it('ships with every founder feature switched off (no invented details)', () => {
    const c = readConfig(shipped);
    expect(c.googleFormUrl).toBeNull();
    expect(c.whatsappUrl).toBeNull();
    expect(c.support.upiId).toBeNull();
    expect(c.support.upiLink).toBeNull();
    expect(supportConfigured(c)).toBe(false);
  });

  it('accepts Google Form and WhatsApp links only from their real hosts', () => {
    const ok = readConfig({ ...base, newsletter: { googleFormUrl: 'https://forms.gle/abc123' }, whatsapp: { communityInviteUrl: 'https://chat.whatsapp.com/XYZ' } });
    expect(ok.googleFormUrl).toBe('https://forms.gle/abc123');
    expect(ok.whatsappUrl).toBe('https://chat.whatsapp.com/XYZ');
    const bad = readConfig({ ...base, newsletter: { googleFormUrl: 'https://evil.example/form' }, whatsapp: { communityInviteUrl: 'http://chat.whatsapp.com/XYZ' } });
    expect(bad.googleFormUrl).toBeNull();
    expect(bad.whatsappUrl).toBeNull();
  });

  it('builds a UPI link only with a valid UPI ID and payee name', () => {
    const c = readConfig({ ...base, support: { ...base.support, upiId: 'founder@okaxis', payeeName: 'UNSUBSCRIBE' } });
    expect(c.support.upiLink).toBe('upi://pay?pa=founder%40okaxis&pn=UNSUBSCRIBE&cu=INR');
    expect(supportConfigured(c)).toBe(true);
    expect(readConfig({ ...base, support: { ...base.support, upiId: 'not a upi', payeeName: 'X' } }).support.upiLink).toBeNull();
    expect(readConfig({ ...base, support: { ...base.support, upiId: 'a@okaxis', payeeName: '' } }).support.upiLink).toBeNull();
  });
});
