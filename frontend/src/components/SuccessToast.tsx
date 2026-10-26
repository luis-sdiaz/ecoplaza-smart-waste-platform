import { useEffect } from "react";
import { AlertTriangle, CircleCheck, X } from "lucide-react";

export type SuccessToastProps = {
  title?: string;
  description?: string;
  message?: string | boolean | null;
  closeLabel?: string;
  onClose: () => void;
  duration?: number;
  variant?: "success" | "error";
  show?: boolean;
  isOpen?: boolean;
};

function SuccessToast({
  title,
  description,
  message,
  closeLabel = "Cerrar notificación",
  onClose,
  duration = 4000,
  variant = "success",
  show = true,
  isOpen = true,
}: SuccessToastProps) {
  const displayMessage =
    typeof message === "string" && message.trim().length > 0
      ? message
      : undefined;
  const displayTitle = title || displayMessage;
  const hasContent = Boolean(
    displayTitle || (description && description.trim().length > 0),
  );
  const isInactive =
    !hasContent || message === false || show === false || isOpen === false;

  useEffect(() => {
    if (isInactive) return;

    const timeoutId = window.setTimeout(onClose, duration);

    return () => window.clearTimeout(timeoutId);
  }, [duration, onClose, isInactive]);

  if (isInactive) {
    return null;
  }

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={`fixed top-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] items-start gap-3 rounded-2xl border bg-ecoplaza-surface p-4 text-ecoplaza-text shadow-lg ${
        variant === "error" ? "border-red-500/35" : "border-ecoplaza-primary/35"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          variant === "error"
            ? "bg-red-500/15 text-red-500"
            : "bg-ecoplaza-primary/15 text-ecoplaza-primary"
        }`}
      >
        {variant === "error" ? (
          <AlertTriangle size={20} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <CircleCheck size={20} strokeWidth={2.2} aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        {displayTitle && (
          <span className="block text-sm font-semibold">{displayTitle}</span>
        )}
        {description && (
          <span className="mt-1 block text-xs leading-5 text-ecoplaza-text-muted">
            {description}
          </span>
        )}
      </span>

      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 ${
          variant === "error" ? "focus-visible:outline-red-500" : "focus-visible:outline-ecoplaza-primary"
        }`}
      >
        <X size={17} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

export default SuccessToast;
