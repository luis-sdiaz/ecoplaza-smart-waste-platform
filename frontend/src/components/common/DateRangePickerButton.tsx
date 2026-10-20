import { useEffect, useRef, useState, type FormEvent } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReportDateRange } from "../../services/reportDateRange";
import { formatColombianDateRange } from "../../services/colombianDate";

export interface DateRangePickerButtonProps {
  startDate: string;
  endDate: string;
  activeRange: ReportDateRange | null;
  error?: boolean;
  disabled?: boolean;
  namespace?: "waste" | "sales";
  onApply: (start: string, end: string) => boolean;
  onClear: () => void;
}

export default function DateRangePickerButton({
  startDate,
  endDate,
  activeRange,
  error = false,
  disabled = false,
  namespace = "waste",
  onApply,
  onClear,
}: DateRangePickerButtonProps) {
  const { t } = useTranslation();
  const ns = namespace;
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Handle clicking outside and Escape key
  useEffect(() => {
    if (!isDatePopoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDatePopoverOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDatePopoverOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDatePopoverOpen]);

  const handleTogglePopover = () => {
    setIsDatePopoverOpen((prev) => {
      const next = !prev;
      if (next) {
        setDraftStart(startDate);
        setDraftEnd(endDate);
      }
      return next;
    });
  };

  const handleApply = (event?: FormEvent | React.MouseEvent) => {
    if (event) event.preventDefault();
    const success = onApply(draftStart, draftEnd);
    if (success) {
      setIsDatePopoverOpen(false);
    }
  };

  const handleClear = () => {
    setDraftStart("");
    setDraftEnd("");
    onClear();
    setIsDatePopoverOpen(false);
  };

  const displayText = activeRange
    ? formatColombianDateRange(activeRange.startDate, activeRange.endDate)
    : t(`${ns}.allDates`, "Todas las fechas");

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Botón Gatillo */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleTogglePopover}
        aria-expanded={isDatePopoverOpen}
        aria-haspopup="dialog"
        aria-label={displayText}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-ecoplaza-surface px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-50 ${
          activeRange
            ? "border-ecoplaza-primary/60 font-medium text-ecoplaza-text shadow-xs"
            : "border-ecoplaza-border text-ecoplaza-text hover:bg-ecoplaza-border/20"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <Calendar
            size={16}
            className={`shrink-0 ${activeRange ? "text-ecoplaza-primary" : "text-ecoplaza-text-muted"}`}
            aria-hidden="true"
          />
          <span className="truncate">{displayText}</span>
        </div>
        <ChevronDown
          size={15}
          className={`shrink-0 text-ecoplaza-text-muted transition-transform duration-200 ${
            isDatePopoverOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover flotante */}
      {isDatePopoverOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(`${ns}.dateRange`, "Rango de fechas")}
          className="absolute left-0 top-full z-50 mt-2 flex w-72 flex-col gap-3 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface p-4 shadow-lg sm:w-80"
        >
          <div className="flex items-center justify-between border-b border-ecoplaza-border/60 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
              {t(`${ns}.dateRange`, "Rango de fechas")}
            </span>
            <button
              type="button"
              onClick={() => setIsDatePopoverOpen(false)}
              aria-label={t("common.close", "Cerrar")}
              className="rounded-lg p-1 text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-border/30 hover:text-ecoplaza-text"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleApply} className="flex flex-col gap-3">
            {/* Input Fecha Inicial */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                {t(`${ns}.startDate`)}
              </span>
              <input
                type="date"
                value={draftStart}
                max={draftEnd || undefined}
                onChange={(event) => setDraftStart(event.target.value)}
                aria-label={t(`${ns}.startDate`)}
                className="h-10 w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              />
            </label>

            {/* Input Fecha Final */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ecoplaza-text/70">
                {t(`${ns}.endDate`)}
              </span>
              <input
                type="date"
                value={draftEnd}
                min={draftStart || undefined}
                onChange={(event) => setDraftEnd(event.target.value)}
                aria-label={t(`${ns}.endDate`)}
                className="h-10 w-full rounded-lg border border-ecoplaza-border bg-ecoplaza-background px-3 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              />
            </label>

            {error && (
              <p role="alert" className="text-xs text-ecoplaza-danger">
                {t(`${ns}.invalidDateRange`)}
              </p>
            )}

            {/* Acciones del Popover */}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-ecoplaza-border/60 pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-ecoplaza-text-muted transition-colors hover:text-ecoplaza-danger hover:underline"
              >
                {t(`${ns}.clearDates`, "Limpiar fechas")}
              </button>
              <button
                type="submit"
                onClick={handleApply}
                disabled={disabled}
                className="rounded-lg bg-ecoplaza-primary px-3.5 py-2 text-xs font-semibold text-ecoplaza-on-primary shadow-xs transition-colors hover:bg-ecoplaza-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(`${ns}.applyDateRange`)}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
