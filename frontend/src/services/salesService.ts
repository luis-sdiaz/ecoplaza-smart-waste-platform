import { supabase } from "../lib/supabase";
import { listBuyers, type Buyer } from "./buyerService";
import { listContainers, type Container } from "./containerService";
import {
  listAvailableWasteRecords,
  WASTE_CATEGORIES,
  type RemoteWasteRecord,
  type WasteCategory,
} from "./wasteService";

export type Sale = {
  id: string;
  buyerId: string;
  wasteRecordId: string;
  weightKg: number;
  unitPrice: number;
  totalValue: number;
  soldAt: string;
};

export type SaleHistoryItem = Sale & {
  buyerName: string;
  wasteRecordNumber: string;
  category: WasteCategory;
};

export type SaleFormData = {
  buyers: Buyer[];
  wasteRecords: RemoteWasteRecord[];
  containers: Container[];
};

export type CreateSaleInput = {
  buyerId: string;
  wasteRecordId: string;
  unitPrice: number;
};

export type SalesErrorCode =
  | "unauthorized"
  | "invalid_buyer"
  | "invalid_waste_record"
  | "invalid_unit_price"
  | "buyer_not_available"
  | "waste_not_available"
  | "request_in_progress"
  | "confirmation_unknown"
  | "network_error"
  | "permission_denied"
  | "constraint_violation"
  | "database_error";

export type SalesServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: SalesErrorCode; retryable: boolean } };

type SaleRow = {
  id: string;
  owner_id: string;
  buyer_id: string;
  waste_record_id: string;
  weight_kg: number | string;
  unit_price: number | string;
  total_value: number | string;
  sold_at: string;
};

type SaleHistoryRow = SaleRow & {
  buyer: { name: string } | Array<{ name: string }> | null;
  waste_record: {
    record_number: number | string;
    category: string;
  } | Array<{
    record_number: number | string;
    category: string;
  }> | null;
};

const SALES_PAGE_SIZE = 1000;
const PERMISSION_DENIED_CODE = "42501";
const UNIQUE_VIOLATION_CODE = "23505";
const CHECK_VIOLATION_CODE = "23514";
const INVALID_PARAMETER_CODE = "22023";
const NOT_FOUND_CODE = "P0002";
const SALE_STATE_CODE = "P0001";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICE_INPUT_PATTERN = /^(?:0|[1-9]\d{0,12})(?:[.,]\d{1,2})?$/;
const SALE_FIELDS = "id, owner_id, buyer_id, waste_record_id, weight_kg, unit_price, total_value, sold_at";
const SALE_HISTORY_FIELDS = `${SALE_FIELDS}, buyer:buyers!sales_owner_buyer_fkey(name), waste_record:waste_records!sales_owner_waste_record_fkey(record_number, category)`;
const pendingWasteRecordIds = new Set<string>();

export function parseUnitPrice(value: string): number | null {
  const normalizedValue = value.trim();
  if (!PRICE_INPUT_PATTERN.test(normalizedValue)) return null;

  const parsedValue = Number(normalizedValue.replace(",", "."));
  const cents = Math.round(parsedValue * 100);

  return Number.isFinite(parsedValue) &&
    parsedValue > 0 &&
    Number.isSafeInteger(cents)
    ? parsedValue
    : null;
}

function isValidUnitPrice(value: number): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;

  const normalizedValue = String(value);
  return parseUnitPrice(normalizedValue) !== null;
}

function isWasteCategory(value: string): value is WasteCategory {
  return WASTE_CATEGORIES.some((category) => category === value);
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== "object" || error === null || !("message" in error)) return false;

  const message = error.message;
  return typeof message === "string" && /fetch|network|timeout|connection/i.test(message);
}

function readErrorProperty(error: unknown, property: "code" | "status" | "message"): unknown {
  return typeof error === "object" && error !== null && property in error
    ? (error as Record<string, unknown>)[property]
    : undefined;
}

function failure(
  error: unknown,
  operation: "read" | "create",
): Extract<SalesServiceResult<never>, { ok: false }> {
  const code = readErrorProperty(error, "code");
  const status = readErrorProperty(error, "status");
  const message = readErrorProperty(error, "message");

  if (isNetworkError(error)) {
    return operation === "create"
      ? { ok: false, error: { code: "confirmation_unknown", retryable: false } }
      : { ok: false, error: { code: "network_error", retryable: true } };
  }
  if (operation === "create" && typeof status === "number" && status >= 500) {
    return { ok: false, error: { code: "confirmation_unknown", retryable: false } };
  }
  if (code === PERMISSION_DENIED_CODE || status === 403) {
    if (message === "authentication_required" || status === 401) {
      return { ok: false, error: { code: "unauthorized", retryable: false } };
    }
    return { ok: false, error: { code: "permission_denied", retryable: false } };
  }
  if (status === 401) {
    return { ok: false, error: { code: "unauthorized", retryable: false } };
  }
  if (code === NOT_FOUND_CODE && message === "buyer_not_available") {
    return { ok: false, error: { code: "buyer_not_available", retryable: false } };
  }
  if (
    (code === NOT_FOUND_CODE || code === SALE_STATE_CODE) &&
    message === "waste_record_not_available"
  ) {
    return { ok: false, error: { code: "waste_not_available", retryable: false } };
  }
  if (code === UNIQUE_VIOLATION_CODE) {
    return { ok: false, error: { code: "waste_not_available", retryable: false } };
  }
  if (code === INVALID_PARAMETER_CODE && message === "invalid_unit_price") {
    return { ok: false, error: { code: "invalid_unit_price", retryable: false } };
  }
  if (code === CHECK_VIOLATION_CODE || code === INVALID_PARAMETER_CODE) {
    return { ok: false, error: { code: "constraint_violation", retryable: false } };
  }

  return { ok: false, error: { code: "database_error", retryable: false } };
}

async function getAuthenticatedUserId(): Promise<SalesServiceResult<string>> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return isNetworkError(error)
        ? failure(error, "read")
        : { ok: false, error: { code: "unauthorized", retryable: false } };
    }
    if (!data.user || !UUID_PATTERN.test(data.user.id)) {
      return { ok: false, error: { code: "unauthorized", retryable: false } };
    }

    return { ok: true, data: data.user.id };
  } catch (error) {
    return isNetworkError(error)
      ? failure(error, "read")
      : { ok: false, error: { code: "unauthorized", retryable: false } };
  }
}

function toPositiveNumber(value: number | string): number | null {
  const parsedValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function toRecordNumber(value: number | string): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }
  return /^[1-9]\d*$/.test(value) ? value : null;
}

function toSale(row: SaleRow, ownerId: string): Sale | null {
  const weightKg = toPositiveNumber(row.weight_kg);
  const unitPrice = toPositiveNumber(row.unit_price);
  const totalValue = toPositiveNumber(row.total_value);
  const soldAt = new Date(row.sold_at);

  if (
    row.owner_id !== ownerId ||
    !UUID_PATTERN.test(row.id) ||
    !UUID_PATTERN.test(row.buyer_id) ||
    !UUID_PATTERN.test(row.waste_record_id) ||
    weightKg === null ||
    unitPrice === null ||
    totalValue === null ||
    Number.isNaN(soldAt.getTime())
  ) {
    return null;
  }

  return {
    id: row.id,
    buyerId: row.buyer_id,
    wasteRecordId: row.waste_record_id,
    weightKg,
    unitPrice,
    totalValue,
    soldAt: soldAt.toISOString(),
  };
}

function readRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value.length === 1 ? value[0] : null;
  return value;
}

function toSaleHistoryItem(row: SaleHistoryRow, ownerId: string): SaleHistoryItem | null {
  const sale = toSale(row, ownerId);
  const buyer = readRelation(row.buyer);
  const wasteRecord = readRelation(row.waste_record);
  const recordNumber = wasteRecord ? toRecordNumber(wasteRecord.record_number) : null;

  if (
    sale === null ||
    buyer === null ||
    typeof buyer.name !== "string" ||
    buyer.name.trim() === "" ||
    wasteRecord === null ||
    recordNumber === null ||
    !isWasteCategory(wasteRecord.category)
  ) {
    return null;
  }

  return {
    ...sale,
    buyerName: buyer.name.trim(),
    wasteRecordNumber: recordNumber,
    category: wasteRecord.category,
  };
}

function mapDependencyError(
  code: string,
  retryable: boolean,
): Extract<SalesServiceResult<never>, { ok: false }> {
  if (code === "unauthorized") {
    return { ok: false, error: { code: "unauthorized", retryable: false } };
  }
  if (code === "network_error") {
    return { ok: false, error: { code: "network_error", retryable: true } };
  }
  if (code === "permission_denied") {
    return { ok: false, error: { code: "permission_denied", retryable: false } };
  }
  return { ok: false, error: { code: "database_error", retryable } };
}

export async function getSaleFormData(): Promise<SalesServiceResult<SaleFormData>> {
  const [buyersResult, wasteResult, containersResult] = await Promise.all([
    listBuyers(),
    listAvailableWasteRecords(),
    listContainers(),
  ]);

  if (!buyersResult.ok) {
    return mapDependencyError(buyersResult.error.code, buyersResult.error.retryable);
  }
  if (!wasteResult.ok) {
    return mapDependencyError(wasteResult.error.code, wasteResult.error.retryable);
  }
  if (!containersResult.ok) {
    return mapDependencyError(containersResult.error.code, containersResult.error.retryable);
  }

  return {
    ok: true,
    data: {
      buyers: buyersResult.data,
      wasteRecords: wasteResult.data,
      containers: containersResult.data,
    },
  };
}

export async function listSales(): Promise<SalesServiceResult<SaleHistoryItem[]>> {
  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const rows: SaleHistoryRow[] = [];

    for (let page = 0; ; page += 1) {
      const from = page * SALES_PAGE_SIZE;
      const { data, error } = await supabase
        .from("sales")
        .select(SALE_HISTORY_FIELDS)
        .eq("owner_id", userResult.data)
        .order("sold_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + SALES_PAGE_SIZE - 1)
        .returns<SaleHistoryRow[]>();

      if (error) return failure(error, "read");
      if (!Array.isArray(data)) {
        return { ok: false, error: { code: "database_error", retryable: true } };
      }

      rows.push(...data);
      if (data.length < SALES_PAGE_SIZE) break;
    }

    const sales = rows.map((row) => toSaleHistoryItem(row, userResult.data));
    if (sales.some((sale) => sale === null)) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    return { ok: true, data: sales as SaleHistoryItem[] };
  } catch (error) {
    return failure(error, "read");
  }
}

export async function createSale(input: CreateSaleInput): Promise<SalesServiceResult<Sale>> {
  if (!UUID_PATTERN.test(input.buyerId)) {
    return { ok: false, error: { code: "invalid_buyer", retryable: false } };
  }
  if (!UUID_PATTERN.test(input.wasteRecordId)) {
    return { ok: false, error: { code: "invalid_waste_record", retryable: false } };
  }
  if (!isValidUnitPrice(input.unitPrice)) {
    return { ok: false, error: { code: "invalid_unit_price", retryable: false } };
  }
  if (pendingWasteRecordIds.has(input.wasteRecordId)) {
    return { ok: false, error: { code: "request_in_progress", retryable: false } };
  }

  pendingWasteRecordIds.add(input.wasteRecordId);

  try {
    const userResult = await getAuthenticatedUserId();
    if (!userResult.ok) return userResult;

    const { data, error } = await supabase.rpc("create_sale", {
      p_buyer_id: input.buyerId,
      p_waste_record_id: input.wasteRecordId,
      p_unit_price: input.unitPrice,
    });

    if (error) return failure(error, "create");

    const row = Array.isArray(data) ? data[0] : data;
    if (typeof row !== "object" || row === null) {
      return { ok: false, error: { code: "confirmation_unknown", retryable: false } };
    }

    const sale = toSale(row as SaleRow, userResult.data);
    return sale === null
      ? { ok: false, error: { code: "confirmation_unknown", retryable: false } }
      : { ok: true, data: sale };
  } catch (error) {
    return failure(error, "create");
  } finally {
    pendingWasteRecordIds.delete(input.wasteRecordId);
  }
}
