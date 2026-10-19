import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useState } from "react";
import DateRangePickerButton from "../src/components/common/DateRangePickerButton";
import { formatColombianDate, formatColombianDateRange } from "../src/services/colombianDate";
import type { ReportDateRange } from "../src/services/reportDateRange";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValueOrOptions?: string | Record<string, unknown>) => {
      if (typeof defaultValueOrOptions === "string") return defaultValueOrOptions;
      if (key === "waste.allDates") return "Todas las fechas";
      if (key === "waste.clearDates") return "Limpiar fechas";
      if (key === "waste.dateRange") return "Rango de fechas";
      if (key === "waste.startDate") return "Fecha inicial";
      if (key === "waste.endDate") return "Fecha final";
      if (key === "waste.applyDateRange") return "Aplicar fechas";
      if (key === "waste.invalidDateRange") return "Selecciona un intervalo de fechas válido y completo.";
      return key;
    },
    i18n: { resolvedLanguage: "es" },
  }),
}));

const authState = vi.hoisted(() => ({
  current: {
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Operator User",
      email: "operator@ecoplaza.com",
      avatarUrl: null,
    },
  },
}));

const wasteMocks = vi.hoisted(() => ({
  listWaste: vi.fn(),
  listContainers: vi.fn(),
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => authState.current,
}));

vi.mock("../src/context/DemoVisibilityContext", () => ({
  useDemoVisibility: () => ({ showDemoData: false, setShowDemoData: vi.fn() }),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: wasteMocks.listContainers,
}));

vi.mock("../src/services/wasteService", () => ({
  listWasteRecords: wasteMocks.listWaste,
  createWasteRecord: vi.fn(),
  calculateWasteStatistics: () => ({
    totalWeightKg: 0,
    organicWeightKg: 0,
    recyclableWeightKg: 0,
    nonRecyclableWeightKg: 0,
    organicPercentage: 0,
    recyclablePercentage: 0,
    nonRecyclablePercentage: 0,
  }),
}));

import WastePage from "../src/pages/WastePage";

afterEach(cleanup);

describe("DateRangePickerButton popover component", () => {
  function TestWrapper({ initialRange = null }: { initialRange?: ReportDateRange | null }) {
    const [startDate, setStartDate] = useState(initialRange?.startDate ?? "");
    const [endDate, setEndDate] = useState(initialRange?.endDate ?? "");
    const [activeRange, setActiveRange] = useState<ReportDateRange | null>(initialRange);
    const [hasError, setHasError] = useState(false);

    return (
      <DateRangePickerButton
        startDate={startDate}
        endDate={endDate}
        activeRange={activeRange}
        error={hasError}
        onApply={(start, end) => {
          if (start > end) {
            setHasError(true);
            return false;
          }
          setHasError(false);
          setStartDate(start);
          setEndDate(end);
          setActiveRange({ startDate: start, endDate: end });
          return true;
        }}
        onClear={() => {
          setStartDate("");
          setEndDate("");
          setActiveRange(null);
          setHasError(false);
        }}
      />
    );
  }

  test("renders trigger button with 'Todas las fechas' when no range is selected", () => {
    render(<TestWrapper />);
    const trigger = screen.getByRole("button", { name: "Todas las fechas" });
    expect(trigger).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("opens popover on click and renders start date and end date inputs", () => {
    render(<TestWrapper />);
    const trigger = screen.getByRole("button", { name: "Todas las fechas" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByLabelText("Fecha inicial")).toBeDefined();
    expect(screen.getByLabelText("Fecha final")).toBeDefined();
  });

  test("formats Colombian date DD/MM/YYYY when range is applied", () => {
    render(<TestWrapper />);
    fireEvent.click(screen.getByRole("button", { name: "Todas las fechas" }));

    fireEvent.change(screen.getByLabelText("Fecha inicial"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-10-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar fechas" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "01/10/2026 - 15/10/2026" })).toBeDefined();
  });

  test("clears dates and restores 'Todas las fechas' text", () => {
    render(<TestWrapper initialRange={{ startDate: "2026-10-01", endDate: "2026-10-15" }} />);
    const trigger = screen.getByRole("button", { name: "01/10/2026 - 15/10/2026" });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar fechas" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Todas las fechas" })).toBeDefined();
  });

  test("closes popover when Escape key is pressed", () => {
    render(<TestWrapper />);
    fireEvent.click(screen.getByRole("button", { name: "Todas las fechas" }));
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("prevents closing and shows error when applied range is invalid", async () => {
    render(<TestWrapper />);
    fireEvent.click(screen.getByRole("button", { name: "Todas las fechas" }));

    fireEvent.change(screen.getByLabelText("Fecha inicial"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-10-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar fechas" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });
});

describe("Colombian date helpers", () => {
  test("formats ISO dates into DD/MM/YYYY format", () => {
    expect(formatColombianDate("2026-10-19")).toBe("19/10/2026");
    expect(formatColombianDate("2026-01-05")).toBe("05/01/2026");
    expect(formatColombianDate("")).toBe("");
  });

  test("formats range into DD/MM/YYYY - DD/MM/YYYY", () => {
    expect(formatColombianDateRange("2026-10-01", "2026-10-15")).toBe("01/10/2026 - 15/10/2026");
    expect(formatColombianDateRange("", "")).toBe("");
  });
});

describe("WastePage Date Range Popover integration", () => {
  beforeEach(() => {
    wasteMocks.listWaste.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "rec-1",
          recordNumber: "1",
          containerId: "cont-1",
          category: "organic",
          weightKg: 10,
          registeredAt: "2026-10-05T10:00:00.000Z",
          status: "available",
        },
        {
          id: "rec-2",
          recordNumber: "2",
          containerId: "cont-1",
          category: "recyclable",
          weightKg: 20,
          registeredAt: "2026-10-20T10:00:00.000Z",
          status: "available",
        },
      ],
    });
    wasteMocks.listContainers.mockResolvedValue({
      ok: true,
      data: [{ id: "cont-1", code: "CONT-01", registeredAt: "2026-10-01T00:00:00.000Z" }],
    });
  });

  test("interacts with DateRangePickerButton popover inside WastePage advanced filters", async () => {
    render(<WastePage />);
    // Wait for data load
    await screen.findByPlaceholderText("waste.recordSearchPlaceholder");

    // Open advanced filters
    fireEvent.click(screen.getByRole("button", { name: /waste\.advancedFilters/i }));

    // Verify trigger button shows "Todas las fechas"
    const trigger = screen.getByRole("button", { name: "Todas las fechas" });
    expect(trigger).toBeDefined();

    // Open popover
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeDefined();

    // Type date range in popover inputs
    fireEvent.change(screen.getByLabelText("Fecha inicial"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Fecha final"), {
      target: { value: "2026-10-10" },
    });

    // Apply
    fireEvent.click(screen.getByRole("button", { name: "Aplicar fechas" }));

    // Popover is closed and trigger displays Colombian formatted date
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByRole("button", { name: "01/10/2026 - 10/10/2026" })).toBeDefined();
    });
  });
});

