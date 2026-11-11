import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import SimulateTelemetryModal from "../src/components/SimulateTelemetryModal";
import type { TelemetryRecord } from "../src/services/sensorService";

const mocks = vi.hoisted(() => ({
  recordTelemetry: vi.fn(),
}));

vi.mock("../src/services/sensorService", () => ({
  recordTelemetry: mocks.recordTelemetry,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.name !== undefined) return `${key}:${options.name}`;
      return key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

const mockMultiContainers = [
  { id: "ctr-uuid-sim-1", code: "CTR-ALPHA" },
  { id: "ctr-uuid-sim-2", code: "CTR-BETA" },
];

const mockSavedRecord: TelemetryRecord = {
  id: "telem-sim-rec-1",
  containerId: "CTR-CENTRAL-SIM",
  distanceCm: 24.5,
  fillLevelPercent: 78,
  recordedAt: "2026-10-20T22:00:00.000Z",
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.recordTelemetry.mockReset();
  mocks.recordTelemetry.mockResolvedValue(mockSavedRecord);
});

describe("SimulateTelemetryModal component", () => {
  test("renders accessible dialog, fields, and default values", () => {
    render(
      <SimulateTelemetryModal
        isOpen={true}
        onClose={vi.fn()}
        containerId="CTR-CENTRAL-SIM"
        containerName="CTR-CENTRAL-SIM"
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    expect(screen.getByText("sensors.simulateModalTitle")).toBeTruthy();
    expect(screen.getByTestId("selected-container-name").textContent).toBe("CTR-CENTRAL-SIM");
    expect(screen.getByTestId("selected-container-uuid").textContent).toContain("CTR-CENTRAL-SIM");

    const fillInput = screen.getByRole("spinbutton", { name: "sensors.simulateFillLevel" });
    expect(fillInput).toBeTruthy();
    expect((fillInput as HTMLInputElement).value).toBe("75");

    const distanceInput = screen.getByRole("spinbutton", { name: "sensors.simulateDistance" });
    expect(distanceInput).toBeTruthy();
    expect((distanceInput as HTMLInputElement).value).toBe("25");

    expect(screen.getByRole("button", { name: "sensors.simulateSubmit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "sensors.simulateCancel" })).toBeTruthy();
  });

  test("does not render when isOpen is false", () => {
    const { container } = render(
      <SimulateTelemetryModal
        isOpen={false}
        onClose={vi.fn()}
        containerId="CTR-CENTRAL-SIM"
        containerName="CTR-CENTRAL-SIM"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("submits telemetry successfully and triggers onTelemetryRecorded and onClose", async () => {
    const handleRecorded = vi.fn();
    const handleClose = vi.fn();

    render(
      <SimulateTelemetryModal
        isOpen={true}
        onClose={handleClose}
        containerId="CTR-CENTRAL-SIM"
        containerName="CTR-CENTRAL-SIM"
        onTelemetryRecorded={handleRecorded}
      />,
    );

    const fillInput = screen.getByRole("spinbutton", { name: "sensors.simulateFillLevel" });
    fireEvent.change(fillInput, { target: { value: "82" } });

    const distanceInput = screen.getByRole("spinbutton", { name: "sensors.simulateDistance" });
    fireEvent.change(distanceInput, { target: { value: "24.5" } });

    const submitBtn = screen.getByRole("button", { name: "sensors.simulateSubmit" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mocks.recordTelemetry).toHaveBeenCalledTimes(1);
    });

    expect(mocks.recordTelemetry).toHaveBeenCalledWith({
      containerId: "CTR-CENTRAL-SIM",
      fillPercentage: 82,
      distanceCm: 24.5,
    });

    expect(handleRecorded).toHaveBeenCalledWith(mockSavedRecord);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test("supports container selection when containers array is provided", async () => {
    const handleRecorded = vi.fn();
    const handleClose = vi.fn();

    render(
      <SimulateTelemetryModal
        isOpen={true}
        onClose={handleClose}
        containers={mockMultiContainers}
        onTelemetryRecorded={handleRecorded}
      />,
    );

    const select = screen.getByRole("combobox", { name: "sensors.simulateContainer" });
    expect(select).toBeTruthy();

    fireEvent.change(select, { target: { value: "CTR-BETA" } });

    expect(screen.getByTestId("selected-container-uuid").textContent).toContain("CTR-BETA");

    const submitBtn = screen.getByRole("button", { name: "sensors.simulateSubmit" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mocks.recordTelemetry).toHaveBeenCalledTimes(1);
    });

    expect(mocks.recordTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        containerId: "CTR-BETA",
      }),
    );
  });

  test("invokes onClose when clicking cancel button, close button, or pressing Escape", () => {
    const handleClose = vi.fn();

    render(
      <SimulateTelemetryModal
        isOpen={true}
        onClose={handleClose}
        containerId="CTR-CENTRAL-SIM"
      />,
    );

    // Cancel button in footer
    const cancelBtn = screen.getByRole("button", { name: "sensors.simulateCancel" });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Close button in header
    const closeBtn = screen.getByRole("button", { name: "sensors.simulateClose" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Escape key
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  test("displays error alert when recordTelemetry rejects and keeps modal open", async () => {
    mocks.recordTelemetry.mockRejectedValueOnce(new Error("Supabase insert error"));
    const handleClose = vi.fn();

    render(
      <SimulateTelemetryModal
        isOpen={true}
        onClose={handleClose}
        containerId="CTR-CENTRAL-SIM"
      />,
    );

    const submitBtn = screen.getByRole("button", { name: "sensors.simulateSubmit" });
    fireEvent.click(submitBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain("Supabase insert error");
    expect(handleClose).not.toHaveBeenCalled();
  });
});

