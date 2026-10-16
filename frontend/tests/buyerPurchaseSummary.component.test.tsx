import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: "en" } }),
}));
vi.mock("../src/services/buyerPurchaseCsv", () => ({ saveBuyerPurchaseCsv: vi.fn() }));

import BuyerPurchaseHistoryModal from "../src/components/BuyerPurchaseHistoryModal";

afterEach(cleanup);

describe("buyer commercial summary", () => {
  test("renders purchase count, total weight, and total revenue from loaded sales", () => {
    render(
      <BuyerPurchaseHistoryModal
        buyer={{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Buyer", email: null, phone: null, createdAt: "2026-10-01", updatedAt: "2026-10-01" }}
        sales={[
          { id: "sale-1", buyerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", wasteRecordId: "waste-1", weightKg: 1.25, unitPrice: 1000, totalValue: 1250, soldAt: "2026-10-15T12:00:00.000Z", buyerName: "Buyer", wasteRecordNumber: "1", category: "organic" },
          { id: "sale-2", buyerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", wasteRecordId: "waste-2", weightKg: 2.5, unitPrice: 1000, totalValue: 2500, soldAt: "2026-10-14T12:00:00.000Z", buyerName: "Buyer", wasteRecordNumber: "2", category: "recyclable" },
        ]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("buyers.purchaseCount")).toBeTruthy();
    expect(screen.getByText("buyers.totalPurchasedWeight")).toBeTruthy();
    expect(screen.getByText("buyers.totalPurchasedValue")).toBeTruthy();
    expect(screen.getByText("3.75 common.kg")).toBeTruthy();
    expect(screen.getByText(/3,750/)).toBeTruthy();
  }, 15_000);
});
