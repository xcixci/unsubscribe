import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Escape closes it, and the page behind becomes inert.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'side',
  leading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'side' | 'center';
  leading?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnFocus.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
      (returnFocus.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener('cancel', onCancel);
    return () => d.removeEventListener('cancel', onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`sheet${variant === 'center' ? ' sheet--center' : ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="sheet__head">
            {leading}
            <div style={{ display: 'grid', gap: 4 }}>
              <h2 id={titleId}>{title}</h2>
              {description && (
                <p id={descId} className="muted small">
                  {description}
                </p>
              )}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="sheet__body">{children}</div>
          {footer && <div className="sheet__foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
