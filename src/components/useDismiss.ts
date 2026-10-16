import { RefObject, useEffect, useRef } from "react";

/**
 * Closes a popover on Escape or on a pointer press outside `ref`.
 * `ignore` is a selector for elements (such as the popover's own trigger) that should not count as outside.
 * On Escape, focus returns to whatever was focused when the popover opened.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void, ignore?: string) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dismiss.current();
      opener?.focus();
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || ref.current?.contains(target) || (ignore && target.closest(ignore))) return;
      dismiss.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [ref, ignore]);
}
