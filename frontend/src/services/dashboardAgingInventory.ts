import type { Container } from "./containerService.ts";
import { calculateStorageAgeDays } from "./inventoryAge.ts";
import type { RemoteWasteRecord } from "./wasteService.ts";

export type AgingInventoryItem = {
  id: string;
  reference: string;
  category: RemoteWasteRecord["category"];
  weightKg: number;
  containerCode: string | null;
  ageDays: number;
};

export function selectOldestAvailableInventory(
  records: readonly RemoteWasteRecord[],
  containers: readonly Pick<Container, "id" | "code">[],
  now: Date = new Date(),
  limit = 5,
): AgingInventoryItem[] {
  if (!Number.isInteger(limit) || limit <= 0) return [];
  const containerCodes = new Map(containers.map((container) => [container.id, container.code]));

  return records
    .filter((record) => record.status === "available")
    .map((record) => ({ record, ageDays: calculateStorageAgeDays(record.registeredAt, now) }))
    .filter((entry): entry is { record: RemoteWasteRecord; ageDays: number } => entry.ageDays !== null)
    .sort((left, right) =>
      right.ageDays - left.ageDays ||
      Date.parse(left.record.registeredAt) - Date.parse(right.record.registeredAt) ||
      left.record.id.localeCompare(right.record.id),
    )
    .slice(0, limit)
    .map(({ record, ageDays }) => ({
      id: record.id,
      reference: `RES-${record.recordNumber.padStart(3, "0")}`,
      category: record.category,
      weightKg: record.weightKg,
      containerCode: containerCodes.get(record.containerId) ?? null,
      ageDays,
    }));
}
