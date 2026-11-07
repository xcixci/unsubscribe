import { useRef, useState } from 'react';
import type { CategorySpend } from '../domain/spending';
import { categoryLabel } from '../domain/categories';
import { inr, percent } from '../domain/money';

/**
 * Ranked horizontal bars, one per category, largest first, one hue.
 * Every figure is also printed as text, so the list doubles as the table view.
 */
export function CategoryBars({ data, total }: { data: CategorySpend[]; total: number }) {
  const max = data.reduce((m, d) => Math.max(m, d.annual), 0);
  const listRef = useRef<HTMLUListElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; d: CategorySpend } | null>(null);

  const show = (e: React.PointerEvent | React.FocusEvent, d: CategorySpend) => {
    const host = listRef.current?.getBoundingClientRect();
    const track = (e.currentTarget as HTMLElement).querySelector('.bar__track')?.getBoundingClientRect();
    if (!host || !track) return;
    const fillWidth = max > 0 ? (d.annual / max) * track.width : 0;
    setTip({ x: track.left - host.left + Math.max(fillWidth, 16) / 2, y: track.top - host.top, d });
  };

  return (
    <ul className="bars" ref={listRef} aria-label="Spending by category, largest first" onPointerLeave={() => setTip(null)}>
      {data.map((d) => (
        <li
          key={d.category}
          className="bar"
          data-hover={tip?.d.category === d.category}
          onPointerEnter={(e) => show(e, d)}
          tabIndex={0}
          onFocus={(e) => show(e, d)}
          onBlur={() => setTip(null)}
          aria-label={`${categoryLabel(d.category)}: ${inr(d.monthly)} a month, ${inr(d.annual)} a year, ${percent(d.annual, total)} of your spending`}
        >
          <span className="bar__label">
            {categoryLabel(d.category)}
            <small>
              {d.count} {d.count === 1 ? 'subscription' : 'subscriptions'}
            </small>
          </span>
          <span className="bar__track" aria-hidden="true">
            <span className="bar__fill" style={{ width: `${max > 0 ? (d.annual / max) * 100 : 0}%` }} />
          </span>
          <span className="bar__value" aria-hidden="true">
            {inr(d.monthly)}/mo
            <small>{percent(d.annual, total)} of total</small>
          </span>
        </li>
      ))}
      {tip && (
        <li className="bars__tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          <strong>{categoryLabel(tip.d.category)}</strong>
          {inr(tip.d.monthly)} a month, {inr(tip.d.annual)} a year
          <br />
          {percent(tip.d.annual, total)} of what you spend
        </li>
      )}
    </ul>
  );
}
