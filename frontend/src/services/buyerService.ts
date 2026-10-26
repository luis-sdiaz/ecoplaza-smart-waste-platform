import { supabase } from "../lib/supabase";

export type Buyer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  documentNumber?: string;
  address?: string;
};

export type BuyerInput = {
  name: string;
  email: string;
  phone: string;
  documentNumber?: string;
  address?: string;
};

export type BuyerErrorCode =
  | "unauthorized"
  | "invalid_id"
  | "invalid_name"
  | "invalid_email"
  | "invalid_phone"
  | "not_found"
  | "network_error"
  | "permission_denied"
  | "constraint_violation"
  | "database_error";

export type BuyerServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: BuyerErrorCode; retryable: boolean } };

type BuyerRow = {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

const CHECK_VIOLATION_CODE = "23514";
const NOT_NULL_VIOLATION_CODE = "23502";
const PERMISSION_DENIED_CODE = "42501";
const NO_ROWS_CODE = "PGRST116";
const BUYERS_PAGE_SIZE = 1000;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MIN_PHONE_LENGTH = 7;
const MAX_PHONE_LENGTH = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+(). -]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUYER_FIELDS = "id, owner_id, name, email, phone, created_at, updated_at";

export function normalizeBuyerName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeBuyerEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeBuyerPhone(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidBuyerName(value: string): boolean {
  const name = normalizeBuyerName(value);
  return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
}

export function isValidBuyerEmail(value: string): boolean {
  const email = normalizeBuyerEmail(value);
  return email === "" || (email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email));
}

export function isValidBuyerPhone(value: string): boolean {
  const phone = normalizeBuyerPhone(value);
  return phone === "" || (
    phone.length >= MIN_PHONE_LENGTH &&
    phone.length <= MAX_PHONE_LENGTH &&
    PHONE_PATTERN.test(phone)
  );
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
  fallback: BuyerErrorCode = "database_error",
): Extract<BuyerServiceResult<never>, { ok: false }> {
  const code = readErrorProperty(error, "code");
  const status = readErrorProperty(error, "status");

  if (code === NO_ROWS_CODE) {
    return { ok: false, error: { code: "not_found", retryable: false } };
  }
  if (code === CHECK_VIOLATION_CODE || code === NOT_NULL_VIOLATION_CODE) {
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

async function getAuthenticatedUserId(): Promise<BuyerServiceResult<string>> {
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

function validateInput(input: BuyerInput): BuyerServiceResult<{
  name: string;
  email: string | null;
  phone: string | null;
}> {
  const name = normalizeBuyerName(input.name);
  const email = normalizeBuyerEmail(input.email);
  const phone = normalizeBuyerPhone(input.phone);

  if (!isValidBuyerName(name)) {
    return { ok: false, error: { code: "invalid_name", retryable: false } };
  }
  if (!isValidBuyerEmail(email)) {
    return { ok: false, error: { code: "invalid_email", retryable: false } };
  }
  if (!isValidBuyerPhone(phone)) {
    return { ok: false, error: { code: "invalid_phone", retryable: false } };
  }

  return {
    ok: true,
    data: { name, email: email || null, phone: phone || null },
  };
}

function toBuyer(row: BuyerRow, ownerId: string): Buyer | null {
  const name = normalizeBuyerName(row.name);
  const email = row.email === null ? "" : normalizeBuyerEmail(row.email);
  const phone = row.phone === null ? "" : normalizeBuyerPhone(row.phone);
  const createdAt = new Date(row.created_at);
  const updatedAt = new Date(row.updated_at);

  if (
    row.owner_id !== ownerId ||
    !UUID_PATTERN.test(row.id) ||
    !isValidBuyerName(name) ||
    !isValidBuyerEmail(email) ||
    !isValidBuyerPhone(phone) ||
    Number.isNaN(createdAt.getTime()) ||
    Number.isNaN(updatedAt.getTime())
  ) {
    return null;
  }

  return {
    id: row.id,
    name,
    email: email || null,
    phone: phone || null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function parseBuyer(row: BuyerRow, ownerId: string): BuyerServiceResult<Buyer> {
  const buyer = toBuyer(row, ownerId);
  return buyer === null
    ? { ok: false, error: { code: "database_error", retryable: true } }
    : { ok: true, data: buyer };
}

export async function listBuyers(): Promise<BuyerServiceResult<Buyer[]>> {
  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const rows: BuyerRow[] = [];

    for (let page = 0; ; page += 1) {
      const from = page * BUYERS_PAGE_SIZE;
      const { data, error } = await supabase
        .from("buyers")
        .select(BUYER_FIELDS)
        .eq("owner_id", userResult.data)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + BUYERS_PAGE_SIZE - 1)
        .returns<BuyerRow[]>();

      if (error) return failure(error);
      if (!Array.isArray(data)) {
        return { ok: false, error: { code: "database_error", retryable: true } };
      }

      rows.push(...data);
      if (data.length < BUYERS_PAGE_SIZE) break;
    }

    const buyers = rows.map((row) => toBuyer(row, userResult.data));
    if (buyers.some((buyer) => buyer === null)) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    return { ok: true, data: buyers as Buyer[] };
  } catch (error) {
    return failure(error);
  }
}

export async function createBuyer(input: BuyerInput): Promise<BuyerServiceResult<Buyer>> {
  const inputResult = validateInput(input);
  if (!inputResult.ok) return inputResult;

  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const { data, error } = await supabase
      .from("buyers")
      .insert({ owner_id: userResult.data, ...inputResult.data })
      .select(BUYER_FIELDS)
      .single<BuyerRow>();

    if (error) return failure(error);
    return parseBuyer(data, userResult.data);
  } catch (error) {
    return failure(error);
  }
}

export async function updateBuyer(
  buyerId: string,
  input: BuyerInput,
): Promise<BuyerServiceResult<Buyer>> {
  if (!UUID_PATTERN.test(buyerId)) {
    return { ok: false, error: { code: "invalid_id", retryable: false } };
  }

  const inputResult = validateInput(input);
  if (!inputResult.ok) return inputResult;

  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const { data, error } = await supabase
      .from("buyers")
      .update(inputResult.data)
      .eq("id", buyerId)
      .eq("owner_id", userResult.data)
      .select(BUYER_FIELDS)
      .single<BuyerRow>();

    if (error) return failure(error);
    return parseBuyer(data, userResult.data);
  } catch (error) {
    return failure(error);
  }
}
