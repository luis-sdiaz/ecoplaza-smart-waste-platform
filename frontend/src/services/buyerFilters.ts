import type { Buyer } from "./buyerService";

export type BuyerSortOption = "updated_desc" | "name_asc" | "name_desc";

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export function filterAndSortBuyers(
  buyers: ReadonlyArray<Buyer>,
  searchQuery: string,
  sortOption: BuyerSortOption,
  locale: string,
): Buyer[] {
  const normalizedQuery = normalizeSearchValue(searchQuery);
  const filtered = normalizedQuery === ""
    ? [...buyers]
    : buyers.filter((buyer) =>
      normalizeSearchValue(buyer.name).includes(normalizedQuery) ||
      (buyer.email !== null && normalizeSearchValue(buyer.email).includes(normalizedQuery)),
    );

  return filtered.sort((left, right) => {
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
