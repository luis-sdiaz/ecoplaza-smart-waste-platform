import { useState } from "react";
import { Activity, AlertTriangle, LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { recordTelemetry, type TelemetryRecord } from "../services/sensorService";

export interface SimulateTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId?: string;
  containerName?: string;
  containers?: Array<{ id: string; code: string }>;
  onTelemetryRecorded?: (record: TelemetryRecord) => void;
}

function SimulateTelemetryModal({
  isOpen,
  onClose,
  containerId,
  containerName,
  containers,
  onTelemetryRecorded,
}: SimulateTelemetryModalProps) {
  const { t } = useTranslation();
  const dialogRef = useDialogFocus(onClose, isOpen);

  const fallbackContainerId = containerId ?? containers?.[0]?.id ?? "";
  const [selectedIdOverride, setSelectedIdOverride] = useState<string | null>(null);
  const selectedContainerId = selectedIdOverride ?? fallbackContainerId;

  const [fillLevel, setFillLevel] = useState<number>(75);
  const [batteryLevel, setBatteryLevel] = useState<number>(95);
  const [temperature, setTemperature] = useState<string>("22");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentContainer = containers?.find((c) => c.id === selectedContainerId);
  const currentContainerName = containerName ?? currentContainer?.code ?? selectedContainerId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainerId.trim()) {
      setError(t("sensors.simulateErrorNoContainer"));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const parsedTemp =
        temperature.trim() !== "" ? Number(temperature) : null;

      const record = await recordTelemetry({
        containerId: selectedContainerId,
        fillLevel: Number(fillLevel),
        batteryLevel: Number(batteryLevel),
        temperature: parsedTemp,
      });

      onTelemetryRecorded?.(record);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("sensors.simulateError"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulate-telemetry-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6 shadow-2xl"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 border-b border-ecoplaza-border pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary/10 text-ecoplaza-primary">
                <Activity size={17} strokeWidth={2} aria-hidden="true" />
              </span>
              <h2
                id="simulate-telemetry-title"
                className="truncate text-lg font-semibold text-ecoplaza-text"
              >
                {t("sensors.simulateModalTitle")}
              </h2>
            </div>
            <p className="mt-1 truncate text-xs text-ecoplaza-text-muted">
              {t("sensors.simulateModalSubtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-border/30 hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:opacity-50"
            aria-label={t("sensors.simulateClose")}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Identificación del Contenedor */}
          <div>
            <label
              htmlFor={containers && containers.length > 1 ? "simulate-container-select" : undefined}
              className="block text-xs font-semibold text-ecoplaza-text"
            >
              {t("sensors.simulateContainer")}
            </label>

            {containers && containers.length > 1 ? (
              <select
                id="simulate-container-select"
                value={selectedContainerId}
                onChange={(e) => setSelectedIdOverride(e.target.value)}
                disabled={isSaving}
                className="mt-1.5 block w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 py-2 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              >
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-ecoplaza-border bg-ecoplaza-surface/70 px-3 py-2 text-sm">
              <span className="font-semibold text-ecoplaza-text" data-testid="selected-container-name">
                {currentContainerName}
              </span>
              <span className="font-mono text-xs text-ecoplaza-text-muted" data-testid="selected-container-uuid">
                UUID: {selectedContainerId}
              </span>
            </div>
          </div>

          {/* Nivel de llenado (%) */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="simulate-fill-level"
                className="text-xs font-semibold text-ecoplaza-text"
              >
                {t("sensors.simulateFillLevel")}
              </label>
              <span className="text-xs font-bold text-ecoplaza-primary">
                {fillLevel}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                id="simulate-fill-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={fillLevel}
                onChange={(e) => setFillLevel(Number(e.target.value))}
                disabled={isSaving}
                aria-label={t("sensors.simulateFillLevel")}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-ecoplaza-border accent-ecoplaza-primary"
              />
              <input
                id="simulate-fill-level"
                name="fillLevel"
                type="number"
                min={0}
                max={100}
                step={1}
                value={fillLevel}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) setFillLevel(val);
                }}
                disabled={isSaving}
                className="w-20 rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-2.5 py-1.5 text-center text-sm font-medium text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              />
            </div>
          </div>

          {/* Nivel de batería (%) */}
          <div>
            <label
              htmlFor="simulate-battery-level"
              className="block text-xs font-semibold text-ecoplaza-text"
            >
              {t("sensors.simulateBatteryLevel")}
            </label>
            <input
              id="simulate-battery-level"
              name="batteryLevel"
              type="number"
              min={0}
              max={100}
              step={1}
              value={batteryLevel}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isNaN(val)) setBatteryLevel(val);
              }}
              disabled={isSaving}
              required
              className="mt-1.5 block w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 py-2 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            />
          </div>

          {/* Temperatura (°C) */}
          <div>
            <label
              htmlFor="simulate-temperature"
              className="block text-xs font-semibold text-ecoplaza-text"
            >
              {t("sensors.simulateTemperature")}
            </label>
            <input
              id="simulate-temperature"
              name="temperature"
              type="number"
              step={0.1}
              min={-50}
              max={100}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder={t("sensors.simulateTemperaturePlaceholder")}
              disabled={isSaving}
              className="mt-1.5 block w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-3 py-2 text-sm text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            />
          </div>

          {/* Alerta de error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-ecoplaza-danger/30 bg-ecoplaza-danger/10 p-3 text-xs font-medium text-ecoplaza-danger"
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-ecoplaza-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="cursor-pointer rounded-xl border border-ecoplaza-border bg-ecoplaza-surface px-4 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:bg-ecoplaza-border/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:opacity-50"
            >
              {t("sensors.simulateCancel")}
            </button>

            <button
              type="submit"
              disabled={isSaving || !selectedContainerId.trim()}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-ecoplaza-primary px-4 py-2 text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                  <span>{t("sensors.simulating")}</span>
                </>
              ) : (
                <>
                  <Activity size={16} aria-hidden="true" />
                  <span>{t("sensors.simulateSubmit")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SimulateTelemetryModal;
