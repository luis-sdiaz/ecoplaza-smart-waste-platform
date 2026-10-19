import type { Buyer } from "./buyerService";

export type BuyerSortOption = "updated_desc" | "name_asc" | "name_desc";
export type BuyerContactFilter = "all" | "email" | "phone";
export type BuyerActivityFilter = "all" | "with_purchases" | "without_purchases";

export interface BuyerActivitySummary {
  totalCount: number;
  withPurchasesCount: number;
  withoutPurchasesCount: number;
  withoutPurchasesPercentage: number;
}

export function calculateBuyerActivitySummary(
  buyers: readonly (Buyer & { purchaseCount?: number })[],
): BuyerActivitySummary {
  const totalCount = buyers.length;
  if (totalCount === 0) {
    return {
      totalCount: 0,
      withPurchasesCount: 0,
      withoutPurchasesCount: 0,
      withoutPurchasesPercentage: 0,
    };
  }

  let withPurchasesCount = 0;
  for (const buyer of buyers) {
    if ((buyer.purchaseCount ?? 0) > 0) {
      withPurchasesCount += 1;
    }
  }

  const withoutPurchasesCount = totalCount - withPurchasesCount;
  const rawPercentage = (withoutPurchasesCount / totalCount) * 100;
  const withoutPurchasesPercentage = Math.round(rawPercentage * 10) / 10;

  return {
    totalCount,
    withPurchasesCount,
    withoutPurchasesCount,
    withoutPurchasesPercentage,
  };
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function filterAndSortBuyers(
  buyers: ReadonlyArray<Buyer & { purchaseCount?: number }>,
  searchQuery: string,
  sortOption: BuyerSortOption,
  locale: string,
  contactFilter: BuyerContactFilter = "all",
  activityFilter: BuyerActivityFilter = "all",
): (Buyer & { purchaseCount?: number })[] {
  const normalizedQuery = normalizeSearchValue(searchQuery);
  const normalizedPhoneQuery = normalizePhoneNumber(searchQuery);
  const filtered = normalizedQuery === ""
    ? [...buyers]
    : buyers.filter((buyer) =>
      normalizeSearchValue(buyer.name).includes(normalizedQuery) ||
      (buyer.email !== null && normalizeSearchValue(buyer.email).includes(normalizedQuery)) ||
      (normalizedPhoneQuery !== "" && buyer.phone !== null &&
        normalizePhoneNumber(buyer.phone).includes(normalizedPhoneQuery)),
    );
  const withRequestedContact = filtered.filter((buyer) =>
    contactFilter === "all" ||
    (contactFilter === "email" && buyer.email !== null) ||
    (contactFilter === "phone" && buyer.phone !== null)
  );
  const withRequestedActivity = withRequestedContact.filter((buyer) => {
    if (activityFilter === "all") return true;
    const count = buyer.purchaseCount ?? 0;
    if (activityFilter === "with_purchases") return count > 0;
    return count === 0;
  });

  return withRequestedActivity.sort((left, right) => {
    if (sortOption === "updated_desc") {
      const dateDifference = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      if (dateDifference !== 0) return dateDifference;
    } else {
      const direction = sortOption === "name_asc" ? 1 : -1;
      const nameDifference = left.name.localeCompare(right.name, locale, { sensitivity: "base" });
      if (nameDifference !== 0) return nameDifference * direction;
    }

    return left.id.localeCompare(right.id);
  });
}
