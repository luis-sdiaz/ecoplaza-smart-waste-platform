import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const purchaseCsvMocks = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: "en" } }),
}));
vi.mock("../src/services/buyerPurchaseCsv", () => ({ saveBuyerPurchaseCsv: purchaseCsvMocks.save }));

import BuyerPurchaseHistoryModal from "../src/components/BuyerPurchaseHistoryModal";

afterEach(cleanup);
beforeEach(() => {
  purchaseCsvMocks.save.mockReset();
  purchaseCsvMocks.save.mockResolvedValue("saved");
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
});
