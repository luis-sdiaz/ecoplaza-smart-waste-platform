import { supabase } from "../lib/supabase";
import { listContainers } from "./containerService";

export const WASTE_CATEGORIES = [
  "organic",
  "recyclable",
  "nonRecyclable",
] as const;

export const WASTE_STATUSES = ["available", "registered"] as const;

export type WasteCategory = (typeof WASTE_CATEGORIES)[number];
export type WasteStatus = (typeof WASTE_STATUSES)[number];

export type RemoteWasteRecord = {
  id: string;
  recordNumber: string;
  containerId: string;
  category: WasteCategory;
  weightKg: number;
  registeredAt: string;
  status: WasteStatus;
};

export type CreateWasteRecordInput = {
  containerId: string;
  category: WasteCategory;
  weightKg: number;
};

export type WasteStatistics = {
  recordCount: number;
  totalWeightKg: number;
  organicWeightKg: number;
  recyclableWeightKg: number;
  nonRecyclableWeightKg: number;
  organicPercentage: number;
  recyclablePercentage: number;
  nonRecyclablePercentage: number;
};

export type WasteErrorCode =
  | "unauthorized"
  | "invalid_container"
  | "container_not_found"
  | "invalid_category"
  | "invalid_weight"
  | "network_error"
  | "permission_denied"
  | "constraint_violation"
  | "database_error";

export type WasteServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: WasteErrorCode; retryable: boolean } };

type WasteRow = {
  id: string;
  record_number: number | string;
  owner_id: string;
  container_id: string;
  category: string;
  weight_kg: number | string;
  registered_at: string;
  status: string;
};

type WasteStatisticsRow = {
  owner_id: string;
  category: string;
  weight_kg: number | string;
};

const FOREIGN_KEY_VIOLATION_CODE = "23503";
const CHECK_VIOLATION_CODE = "23514";
const NOT_NULL_VIOLATION_CODE = "23502";
const UNIQUE_VIOLATION_CODE = "23505";
const NUMERIC_OUT_OF_RANGE_CODE = "22003";
const PERMISSION_DENIED_CODE = "42501";
const STATISTICS_PAGE_SIZE = 1000;
const WASTE_RECORDS_PAGE_SIZE = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isWasteCategory(value: string): value is WasteCategory {
  return WASTE_CATEGORIES.some((category) => category === value);
}

function isWasteStatus(value: string): value is WasteStatus {
  return WASTE_STATUSES.some((status) => status === value);
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== "object" || error === null || !("message" in error)) return false;

  const message = error.message;
  return typeof message === "string" && /fetch|network|timeout|connection/i.test(message);
}

function readErrorProperty(error: unknown, property: "code" | "status"): unknown {
  return typeof error === "object" && error !== null && property in error
    ? (error as Record<string, unknown>)[property]
    : undefined;
}

function failure(
  error: unknown,
  fallback: WasteErrorCode = "database_error",
): Extract<WasteServiceResult<never>, { ok: false }> {
  const code = readErrorProperty(error, "code");
  const status = readErrorProperty(error, "status");

  if (code === FOREIGN_KEY_VIOLATION_CODE) {
    return { ok: false, error: { code: "container_not_found", retryable: false } };
  }
  if (
    code === CHECK_VIOLATION_CODE ||
    code === NOT_NULL_VIOLATION_CODE ||
    code === UNIQUE_VIOLATION_CODE ||
    code === NUMERIC_OUT_OF_RANGE_CODE
  ) {
    return { ok: false, error: { code: "constraint_violation", retryable: false } };
  }
  if (code === PERMISSION_DENIED_CODE || status === 403) {
    return { ok: false, error: { code: "permission_denied", retryable: false } };
  }
  if (status === 401) {
    return { ok: false, error: { code: "unauthorized", retryable: false } };
  }
  if (isNetworkError(error)) {
    return { ok: false, error: { code: "network_error", retryable: true } };
  }

  return { ok: false, error: { code: fallback, retryable: false } };
}

async function getAuthenticatedUserId(): Promise<WasteServiceResult<string>> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) return failure(error, "unauthorized");
    if (!data.user || !UUID_PATTERN.test(data.user.id)) {
      return { ok: false, error: { code: "unauthorized", retryable: false } };
    }

    return { ok: true, data: data.user.id };
  } catch (error) {
    return failure(error, "unauthorized");
  }
}

function toRecordNumber(value: number | string): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }

  return /^[1-9]\d*$/.test(value) ? value : null;
}

function toRemoteWasteRecord(
  row: WasteRow,
  ownerId: string,
): RemoteWasteRecord | null {
  const recordNumber = toRecordNumber(row.record_number);
  const weightKg = typeof row.weight_kg === "number"
    ? row.weight_kg
    : Number(row.weight_kg);
  const registeredAt = new Date(row.registered_at);

  if (
    row.owner_id !== ownerId ||
    !UUID_PATTERN.test(row.id) ||
    !UUID_PATTERN.test(row.container_id) ||
    recordNumber === null ||
    !isWasteCategory(row.category) ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    Number.isNaN(registeredAt.getTime()) ||
    !isWasteStatus(row.status)
  ) {
    return null;
  }

  return {
    id: row.id,
    recordNumber,
    containerId: row.container_id,
    category: row.category,
    weightKg,
    registeredAt: registeredAt.toISOString(),
    status: row.status,
  };
}

async function listWasteRows(
  ownerId: string,
  status?: WasteStatus,
): Promise<WasteServiceResult<WasteRow[]>> {
  const rows: WasteRow[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * WASTE_RECORDS_PAGE_SIZE;
    let query = supabase
      .from("waste_records")
      .select(
        "id, record_number, owner_id, container_id, category, weight_kg, registered_at, status",
      )
      .eq("owner_id", ownerId)
      .order("registered_at", { ascending: false })
      .order("record_number", { ascending: false })
      .range(from, from + WASTE_RECORDS_PAGE_SIZE - 1);

    if (status !== undefined) query = query.eq("status", status);

    const { data, error } = await query.returns<WasteRow[]>();

    if (error) return failure(error);
    if (!Array.isArray(data)) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    rows.push(...data);
    if (data.length < WASTE_RECORDS_PAGE_SIZE) break;
  }

  return { ok: true, data: rows };
}

function toRemoteWasteRecords(
  rows: WasteRow[],
  ownerId: string,
): WasteServiceResult<RemoteWasteRecord[]> {
  const records = rows.map((row) => toRemoteWasteRecord(row, ownerId));

  if (records.some((record) => record === null)) {
    return { ok: false, error: { code: "database_error", retryable: true } };
  }

  return { ok: true, data: records as RemoteWasteRecord[] };
}

export function calculateWasteStatistics(
  records: ReadonlyArray<Pick<RemoteWasteRecord, "category" | "weightKg">>,
): WasteStatistics {
  let organicWeightKg = 0;
  let recyclableWeightKg = 0;
  let nonRecyclableWeightKg = 0;

  for (const record of records) {
    if (record.category === "organic") organicWeightKg += record.weightKg;
    if (record.category === "recyclable") recyclableWeightKg += record.weightKg;
    if (record.category === "nonRecyclable") nonRecyclableWeightKg += record.weightKg;
  }

  const totalWeightKg = organicWeightKg + recyclableWeightKg + nonRecyclableWeightKg;
  const toPercentage = (weightKg: number): number =>
    totalWeightKg > 0 ? (weightKg / totalWeightKg) * 100 : 0;

  return {
    recordCount: records.length,
    totalWeightKg,
    organicWeightKg,
    recyclableWeightKg,
    nonRecyclableWeightKg,
    organicPercentage: toPercentage(organicWeightKg),
    recyclablePercentage: toPercentage(recyclableWeightKg),
    nonRecyclablePercentage: toPercentage(nonRecyclableWeightKg),
  };
}

function toStatisticsRecord(
  row: WasteStatisticsRow,
  ownerId: string,
): Pick<RemoteWasteRecord, "category" | "weightKg"> | null {
  const weightKg = typeof row.weight_kg === "number"
    ? row.weight_kg
    : Number(row.weight_kg);

  if (
    row.owner_id !== ownerId ||
    !isWasteCategory(row.category) ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0
  ) {
    return null;
  }

  return { category: row.category, weightKg };
}

export async function getWasteStatistics(): Promise<
  WasteServiceResult<WasteStatistics>
> {
  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const firstPageResult = await supabase
      .from("waste_records")
      .select("owner_id, category, weight_kg", { count: "exact" })
      .eq("owner_id", userResult.data)
      .order("record_number", { ascending: true })
      .range(0, STATISTICS_PAGE_SIZE - 1)
      .returns<WasteStatisticsRow[]>();

    if (firstPageResult.error) return failure(firstPageResult.error);
    if (!Array.isArray(firstPageResult.data) || firstPageResult.count === null) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    const rows = [...firstPageResult.data];
    const totalPages = Math.ceil(firstPageResult.count / STATISTICS_PAGE_SIZE);

    for (let page = 1; page < totalPages; page += 1) {
      const from = page * STATISTICS_PAGE_SIZE;
      const { data, error } = await supabase
        .from("waste_records")
        .select("owner_id, category, weight_kg")
        .eq("owner_id", userResult.data)
        .order("record_number", { ascending: true })
        .range(from, from + STATISTICS_PAGE_SIZE - 1)
        .returns<WasteStatisticsRow[]>();

      if (error) return failure(error);
      if (!Array.isArray(data)) {
        return { ok: false, error: { code: "database_error", retryable: true } };
      }
      rows.push(...data);
    }

    const records = rows.map((row) => toStatisticsRecord(row, userResult.data));
    if (records.some((record) => record === null)) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    return {
      ok: true,
      data: calculateWasteStatistics(
        records as Array<Pick<RemoteWasteRecord, "category" | "weightKg">>,
      ),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function listWasteRecords(): Promise<
  WasteServiceResult<RemoteWasteRecord[]>
> {
  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const rowsResult = await listWasteRows(userResult.data);
    if (!rowsResult.ok) return rowsResult;

    return toRemoteWasteRecords(rowsResult.data, userResult.data);
  } catch (error) {
    return failure(error);
  }
}

export async function listAvailableWasteRecords(): Promise<
  WasteServiceResult<RemoteWasteRecord[]>
> {
  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const rowsResult = await listWasteRows(userResult.data, "available");
    if (!rowsResult.ok) return rowsResult;

    return toRemoteWasteRecords(rowsResult.data, userResult.data);
  } catch (error) {
    return failure(error);
  }
}

export async function createWasteRecord(
  input: CreateWasteRecordInput,
): Promise<WasteServiceResult<RemoteWasteRecord>> {
  if (!UUID_PATTERN.test(input.containerId)) {
    return { ok: false, error: { code: "invalid_container", retryable: false } };
  }
  if (!isWasteCategory(input.category)) {
    return { ok: false, error: { code: "invalid_category", retryable: false } };
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    return { ok: false, error: { code: "invalid_weight", retryable: false } };
  }

  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  const containersResult = await listContainers();
  if (!containersResult.ok) {
    const code = containersResult.error.code;
    if (code === "unauthorized" || code === "network_error" || code === "permission_denied") {
      return { ok: false, error: { code, retryable: containersResult.error.retryable } };
    }
    return { ok: false, error: { code: "database_error", retryable: false } };
  }
  if (!containersResult.data.some((container) => container.id === input.containerId)) {
    return { ok: false, error: { code: "container_not_found", retryable: false } };
  }

  try {
    const { data, error } = await supabase
      .from("waste_records")
      .insert({
        owner_id: userResult.data,
        container_id: input.containerId,
        category: input.category,
        weight_kg: input.weightKg,
        status: "available" satisfies WasteStatus,
      })
      .select(
        "id, record_number, owner_id, container_id, category, weight_kg, registered_at, status",
      )
      .single<WasteRow>();

    if (error) return failure(error);

    const record = toRemoteWasteRecord(data, userResult.data);
    if (record === null) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    return { ok: true, data: record };
  } catch (error) {
    return failure(error);
  }
}
