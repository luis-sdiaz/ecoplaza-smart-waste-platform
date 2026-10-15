import { useEffect, useLayoutEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => (
      element.tabIndex >= 0
      && !element.hasAttribute("hidden")
      && element.getAttribute("aria-hidden") !== "true"
    ));
}

export function useDialogFocus(
  onClose: () => void,
  canClose = true,
) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    const previousFocus = document.activeElement;
    const initialFocus = getFocusableElements(dialog)[0] ?? dialog;
    initialFocus.focus({ preventScroll: true });

    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const dialog = dialogRef.current;
      if (dialog === null) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (canClose) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsOutside = !(activeElement instanceof Node)
        || !dialog.contains(activeElement);

      if (event.shiftKey && (activeElement === firstElement || focusIsOutside)) {
        event.preventDefault();
        lastElement.focus({ preventScroll: true });
      } else if (!event.shiftKey && (activeElement === lastElement || focusIsOutside)) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canClose]);

  return dialogRef;
}
