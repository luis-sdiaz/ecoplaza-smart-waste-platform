import { supabase } from "../lib/supabase";

export type Container = {
  id: string;
  code: string;
  createdAt: string;
};

export type ContainerErrorCode =
  | "unauthorized"
  | "invalid_code"
  | "duplicate_code"
  | "network_error"
  | "permission_denied"
  | "database_error";

export type ContainerServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ContainerErrorCode; retryable: boolean } };

type ContainerRow = {
  id: string;
  owner_id: string;
  code: string;
  created_at: string;
};

const DUPLICATE_CODE = "23505";
const CHECK_VIOLATION_CODE = "23514";
const PERMISSION_DENIED_CODE = "42501";
const MIN_CODE_LENGTH = 2;
const MAX_CODE_LENGTH = 40;
const CONTAINER_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeContainerCode(code: string): string {
  return code.trim().replace(/\s+/g, "-").toUpperCase();
}

export function isValidContainerCode(code: string): boolean {
  return (
    code.length >= MIN_CODE_LENGTH &&
    code.length <= MAX_CODE_LENGTH &&
    CONTAINER_CODE_PATTERN.test(code)
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
  fallback: ContainerErrorCode = "database_error",
): Extract<ContainerServiceResult<never>, { ok: false }> {
  const code = readErrorProperty(error, "code");
  const status = readErrorProperty(error, "status");

  if (code === DUPLICATE_CODE) {
    return { ok: false, error: { code: "duplicate_code", retryable: false } };
  }
  if (code === CHECK_VIOLATION_CODE) {
    return { ok: false, error: { code: "invalid_code", retryable: false } };
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

  return {
    ok: false,
    error: { code: fallback, retryable: fallback === "network_error" },
  };
}

async function getAuthenticatedUserId(): Promise<ContainerServiceResult<string>> {
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

function toContainer(row: ContainerRow, ownerId: string): Container | null {
  if (
    typeof row.id !== "string" ||
    typeof row.owner_id !== "string" ||
    typeof row.code !== "string" ||
    typeof row.created_at !== "string"
  ) {
    return null;
  }

  const storedCode = row.code.trim();
  const createdAt = new Date(row.created_at);

  if (
    row.owner_id !== ownerId ||
    !UUID_PATTERN.test(row.id) ||
    storedCode.length === 0 ||
    Number.isNaN(createdAt.getTime())
  ) {
    return null;
  }

  return {
    id: row.id,
    code: storedCode,
    createdAt: createdAt.toISOString(),
  };
}

export async function listContainers(): Promise<ContainerServiceResult<Container[]>> {
  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const { data, error } = await supabase
      .from("containers")
      .select("id, owner_id, code, created_at")
      .eq("owner_id", userResult.data)
      .order("created_at", { ascending: true })
      .returns<ContainerRow[]>();

    if (error) return failure(error);

    if (!Array.isArray(data)) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    const containers = data.map((row) => toContainer(row, userResult.data));
    if (containers.some((container) => container === null)) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    return { ok: true, data: containers as Container[] };
  } catch (error) {
    return failure(error);
  }
}

export async function createContainer(
  code: string,
): Promise<ContainerServiceResult<Container>> {
  const normalizedCode = normalizeContainerCode(code);
  if (!isValidContainerCode(normalizedCode)) {
    return { ok: false, error: { code: "invalid_code", retryable: false } };
  }

  const userResult = await getAuthenticatedUserId();
  if (!userResult.ok) return userResult;

  try {
    const { data: existingContainers, error: lookupError } = await supabase
      .from("containers")
      .select("id, code")
      .eq("owner_id", userResult.data)
      .returns<Array<{ id: string; code: string }>>();

    if (lookupError) return failure(lookupError);
    if (!Array.isArray(existingContainers)) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }
    if (
      existingContainers.some((container) =>
        typeof container.code === "string" &&
        normalizeContainerCode(container.code) === normalizedCode
      )
    ) {
      return { ok: false, error: { code: "duplicate_code", retryable: false } };
    }

    const { data, error } = await supabase
      .from("containers")
      .insert({
        owner_id: userResult.data,
        code: normalizedCode,
      })
      .select("id, owner_id, code, created_at")
      .single<ContainerRow>();

    if (error) return failure(error);

    const container = toContainer(data, userResult.data);
    if (container === null) {
      return { ok: false, error: { code: "database_error", retryable: true } };
    }

    return { ok: true, data: container };
  } catch (error) {
    return failure(error);
  }
}
