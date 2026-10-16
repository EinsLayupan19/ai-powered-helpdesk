import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog. Moves focus to the first field (or first control), keeps Tab inside the dialog,
 * closes on Escape or a backdrop press, and returns focus to the element that opened it.
 * Rendered into the themed app root so it layers above sticky regions and keeps theme tokens.
 */
export function Dialog({ labelledBy, onClose, size, children }: { labelledBy: string; onClose: () => void; size?: "sm"; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = panel.current;
    (root?.querySelector<HTMLElement>("input,select,textarea") ?? root?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close.current(); return; }
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); if (opener?.isConnected) opener.focus(); };
  }, []);

  const host = document.querySelector(".app-shell, .auth-shell") ?? document.body;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={e => e.currentTarget === e.target && close.current()}>
      <div ref={panel} className={`dialog-panel ${size === "sm" ? "dialog-sm" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>
    </div>,
    host,
  );
}

/** Confirmation for destructive actions. Focus starts on Cancel. */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  const id = useId();
  return (
    <Dialog labelledBy={id} onClose={onCancel} size="sm">
      <div className="form-modal confirm-dialog">
        <h2 id={id} className="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button button-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </Dialog>
  );
}
