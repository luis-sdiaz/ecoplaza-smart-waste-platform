export type SalesEmptyState = {
  titleKey: string;
  descriptionKey: string;
};

export function getSalesEmptyState(
  hasBuyerFilter: boolean,
  hasDateFilter: boolean,
): SalesEmptyState {
  if (hasBuyerFilter && hasDateFilter) {
    return {
      titleKey: "sales.emptyBuyerPeriodTitle",
      descriptionKey: "sales.emptyBuyerPeriodDescription",
    };
  }
  if (hasBuyerFilter) {
    return {
      titleKey: "sales.emptyBuyerTitle",
      descriptionKey: "sales.emptyBuyerDescription",
    };
  }
  if (hasDateFilter) {
    return {
      titleKey: "sales.emptyPeriodTitle",
      descriptionKey: "sales.emptyPeriodDescription",
    };
  }
  return {
    titleKey: "sales.emptyTitle",
    descriptionKey: "sales.emptyDescription",
  };
}
