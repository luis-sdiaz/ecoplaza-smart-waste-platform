import type { WasteCategory } from "./wasteService";

type Translate = (key: string) => string;

export function getCsvCategoryLabels(
  translate: Translate,
): Record<WasteCategory, string> {
  return {
    organic: translate("common.organic"),
    recyclable: translate("common.recyclable"),
    nonRecyclable: translate("common.nonRecyclable"),
  };
}
