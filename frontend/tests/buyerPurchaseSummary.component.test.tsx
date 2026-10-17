import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const purchaseCsvMocks = vi.hoisted(() => ({ save: vi.fn() }));
const purchaseExcelMocks = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: "en" } }),
}));
vi.mock("../src/services/buyerPurchaseCsv", () => ({ saveBuyerPurchaseCsv: purchaseCsvMocks.save }));
vi.mock("../src/services/buyerPurchaseExcelService", () => ({ saveBuyerPurchaseExcel: purchaseExcelMocks.save }));

import BuyerPurchaseHistoryModal from "../src/components/BuyerPurchaseHistoryModal";

afterEach(cleanup);
beforeEach(() => {
  purchaseCsvMocks.save.mockReset();
  purchaseCsvMocks.save.mockResolvedValue("saved");
  purchaseExcelMocks.save.mockReset();
  purchaseExcelMocks.save.mockResolvedValue("saved");
});

const buyer = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Buyer", email: null, phone: null, createdAt: "2026-10-01", updatedAt: "2026-10-01" };
const purchases = [
  { id: "sale-1", buyerId: buyer.id, wasteRecordId: "waste-1", weightKg: 1.25, unitPrice: 1000, totalValue: 1250, soldAt: "2026-10-15T12:00:00.000Z", buyerName: "Buyer", wasteRecordNumber: "1", category: "organic" as const },
  { id: "sale-2", buyerId: buyer.id, wasteRecordId: "waste-2", weightKg: 2.5, unitPrice: 1000, totalValue: 2500, soldAt: "2026-10-14T12:00:00.000Z", buyerName: "Buyer", wasteRecordNumber: "2", category: "recyclable" as const },
];

function renderHistory() {
  return render(
    <BuyerPurchaseHistoryModal
      buyer={buyer}
      sales={purchases}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("buyer commercial summary", () => {
  test("renders purchase count, total weight, and total revenue from loaded sales", () => {
    renderHistory();

    expect(screen.getByText("buyers.purchaseCount")).toBeTruthy();
    expect(screen.getByText("buyers.totalPurchasedWeight")).toBeTruthy();
    expect(screen.getByText("buyers.totalPurchasedValue")).toBeTruthy();
    expect(screen.getByText("3.75 common.kg")).toBeTruthy();
    expect(screen.getByText(/3,750/)).toBeTruthy();
  }, 15_000);

  test("keeps table, summary, and CSV aligned with the inclusive date filter", async () => {
    renderHistory();

    fireEvent.change(screen.getByLabelText("buyers.purchaseStartDate"), { target: { value: "2026-10-15" } });
    fireEvent.change(screen.getByLabelText("buyers.purchaseEndDate"), { target: { value: "2026-10-15" } });

    expect(screen.getAllByText("1.25 common.kg")).toHaveLength(2);
    expect(screen.queryByText("2.5 common.kg")).toBeNull();
    expect(screen.getAllByText(/1,250/)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "buyers.exportPurchases" }));
    await waitFor(() => expect(purchaseCsvMocks.save).toHaveBeenCalledTimes(1));
    expect(purchaseCsvMocks.save.mock.calls[0][0].map((sale: { id: string }) => sale.id)).toEqual(["sale-1"]);
  });

  test("shows invalid and empty interval states and can clear the dates", () => {
    renderHistory();

    const startInput = screen.getByLabelText("buyers.purchaseStartDate") as HTMLInputElement;
    const endInput = screen.getByLabelText("buyers.purchaseEndDate") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "2026-10-16" } });
    fireEvent.change(endInput, { target: { value: "2026-10-15" } });
    expect(screen.getByText("buyers.invalidPurchaseDateRange")).toBeTruthy();

    fireEvent.change(startInput, { target: { value: "2026-09-01" } });
    fireEvent.change(endInput, { target: { value: "2026-09-30" } });
    expect(screen.getByText("buyers.noFilteredPurchasesTitle")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "buyers.clearPurchaseDates" }));
    expect(startInput.value).toBe("");
    expect(endInput.value).toBe("");
    expect(screen.getByText("3.75 common.kg")).toBeTruthy();
  });

  test("sorts the filtered purchase table and preserves that order in CSV", async () => {
    renderHistory();

    fireEvent.change(screen.getByLabelText("buyers.purchaseStartDate"), { target: { value: "2026-10-14" } });
    fireEvent.change(screen.getByLabelText("buyers.purchaseEndDate"), { target: { value: "2026-10-15" } });
    fireEvent.change(screen.getByLabelText("buyers.purchaseSortLabel"), { target: { value: "valueAsc" } });

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].textContent).toContain("common.organic");
    expect(rows[1].textContent).toContain("common.recyclable");

    fireEvent.click(screen.getByRole("button", { name: "buyers.exportPurchases" }));
    await waitFor(() => expect(purchaseCsvMocks.save).toHaveBeenCalledTimes(1));
    expect(purchaseCsvMocks.save.mock.calls[0][0].map((sale: { id: string }) => sale.id)).toEqual(["sale-1", "sale-2"]);
    expect(purchases.map(({ id }) => id)).toEqual(["sale-1", "sale-2"]);

    fireEvent.click(screen.getByRole("button", { name: "buyers.exportPurchasesExcel" }));
    await waitFor(() => expect(purchaseExcelMocks.save).toHaveBeenCalledTimes(1));
    expect(purchaseExcelMocks.save.mock.calls[0][0].map((sale: { id: string }) => sale.id)).toEqual(["sale-1", "sale-2"]);
    expect(purchaseExcelMocks.save.mock.calls[0][1]).toBe(buyer.id);
  });

  test("handles Excel cancellation and write failures without false success", async () => {
    purchaseExcelMocks.save.mockResolvedValueOnce("cancelled");
    renderHistory();

    fireEvent.click(screen.getByRole("button", { name: "buyers.exportPurchasesExcel" }));
    await waitFor(() => expect(purchaseExcelMocks.save).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("buyers.purchaseExcelExportSuccess")).toBeNull();

    purchaseExcelMocks.save.mockRejectedValueOnce(new Error("write failed"));
    fireEvent.click(screen.getByRole("button", { name: "buyers.exportPurchasesExcel" }));
    expect(await screen.findByText("buyers.purchaseExportError")).toBeTruthy();
  });

  test("disables Excel export while loading, on errors, and for empty history", () => {
    const commonProps = { buyer, onRetry: vi.fn(), onClose: vi.fn() };
    const view = render(<BuyerPurchaseHistoryModal {...commonProps} sales={[]} isLoading error={null} />);
    expect((screen.getByRole("button", { name: "buyers.exportPurchasesExcel" }) as HTMLButtonElement).disabled).toBe(true);

    view.rerender(<BuyerPurchaseHistoryModal {...commonProps} sales={purchases} isLoading={false} error="buyers.purchaseHistoryError" />);
    expect((screen.getByRole("button", { name: "buyers.exportPurchasesExcel" }) as HTMLButtonElement).disabled).toBe(true);

    view.rerender(<BuyerPurchaseHistoryModal {...commonProps} sales={[]} isLoading={false} error={null} />);
    expect((screen.getByRole("button", { name: "buyers.exportPurchasesExcel" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
