import { useEffect } from "react";
import { CircleCheck, X } from "lucide-react";

type SuccessToastProps = {
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
  duration?: number;
};

function SuccessToast({
  title,
  description,
  closeLabel,
  onClose,
  duration = 4000,
}: SuccessToastProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, duration);

    return () => window.clearTimeout(timeoutId);
  }, [duration, onClose]);

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] items-start gap-3 rounded-2xl border border-ecoplaza-primary/35 bg-ecoplaza-surface p-4 text-ecoplaza-text shadow-lg"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary/15 text-ecoplaza-primary">
        <CircleCheck size={20} strokeWidth={2.2} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-ecoplaza-text-muted">
          {description}
        </span>
      </span>

      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
      >
        <X size={17} strokeWidth={2} aria-hidden="true" />
      </button>
    </aside>
  );
}

export default SuccessToast;
