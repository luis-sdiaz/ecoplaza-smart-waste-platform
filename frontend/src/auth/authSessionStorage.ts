import type { SupportedStorage } from "@supabase/supabase-js";

export type AuthSessionPersistence = "persistent" | "temporary";

export const SUPABASE_AUTH_STORAGE_KEY = "ecoplaza-supabase-auth";

const AUTH_PERSISTENCE_STORAGE_KEY = "ecoplaza-auth-persistence";
const AUTH_STORAGE_KEYS = [
  SUPABASE_AUTH_STORAGE_KEY,
  `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`,
  `${SUPABASE_AUTH_STORAGE_KEY}-user`,
] as const;

let activePersistence: AuthSessionPersistence | null = null;

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function readStoredPersistence(): AuthSessionPersistence {
  if (activePersistence !== null) return activePersistence;

  try {
    const storedPersistence = getLocalStorage()?.getItem(
      AUTH_PERSISTENCE_STORAGE_KEY,
    );

    activePersistence = storedPersistence === "temporary"
      ? "temporary"
      : "persistent";
  } catch {
    activePersistence = "persistent";
  }

  return activePersistence;
}

function getStorage(persistence: AuthSessionPersistence): Storage | null {
  return persistence === "persistent"
    ? getLocalStorage()
    : getSessionStorage();
}

function getOppositeStorage(
  persistence: AuthSessionPersistence,
): Storage | null {
  return persistence === "persistent"
    ? getSessionStorage()
    : getLocalStorage();
}

function requireStorage(storage: Storage | null): Storage {
  if (storage === null) {
    throw new Error("Browser storage is not available for Supabase Auth.");
  }

  return storage;
}

function requireAuthStorageKey(key: string): void {
  if (
    key !== SUPABASE_AUTH_STORAGE_KEY &&
    !key.startsWith(`${SUPABASE_AUTH_STORAGE_KEY}-`)
  ) {
    throw new Error("Refusing to access a storage key outside EcoPlaza Auth.");
  }
}

function removeAuthKeys(storage: Storage | null): void {
  if (storage === null) return;

  let firstError: unknown;

  for (const key of AUTH_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch (error) {
      firstError ??= error;
    }
  }

  if (firstError !== undefined) throw firstError;
}

function removeAuthKeysFromAllStorage(): void {
  let firstError: unknown;

  for (const storage of [getLocalStorage(), getSessionStorage()]) {
    try {
      removeAuthKeys(storage);
    } catch (error) {
      firstError ??= error;
    }
  }

  if (firstError !== undefined) throw firstError;
}

function removeKeyFromAllStorage(key: string): void {
  let firstError: unknown;

  for (const storage of [getLocalStorage(), getSessionStorage()]) {
    try {
      storage?.removeItem(key);
    } catch (error) {
      firstError ??= error;
    }
  }

  if (firstError !== undefined) throw firstError;
}

export function selectAuthSessionPersistence(
  persistence: AuthSessionPersistence,
): void {
  requireStorage(getStorage(persistence));
  const localStorage = requireStorage(getLocalStorage());

  localStorage.setItem(AUTH_PERSISTENCE_STORAGE_KEY, persistence);
  activePersistence = persistence;
}

export function clearAuthSessionStorage(): void {
  let firstError: unknown;

  try {
    try {
      removeAuthKeysFromAllStorage();
    } catch (error) {
      firstError ??= error;
    }

    try {
      getLocalStorage()?.removeItem(AUTH_PERSISTENCE_STORAGE_KEY);
    } catch (error) {
      firstError ??= error;
    }
  } finally {
    activePersistence = null;
  }

  if (firstError !== undefined) throw firstError;
}

export const authSessionStorage: SupportedStorage = {
  getItem(key) {
    requireAuthStorageKey(key);
    const persistence = readStoredPersistence();
    const selectedStorage = getStorage(persistence);

    return selectedStorage?.getItem(key) ?? null;
  },

  setItem(key, value) {
    requireAuthStorageKey(key);
    const persistence = readStoredPersistence();
    const selectedStorage = requireStorage(getStorage(persistence));
    const oppositeStorage = getOppositeStorage(persistence);
    const previousSelectedValue = selectedStorage.getItem(key);

    selectedStorage.setItem(key, value);

    try {
      oppositeStorage?.removeItem(key);
    } catch (error) {
      try {
        if (previousSelectedValue === null) {
          selectedStorage.removeItem(key);
        } else {
          selectedStorage.setItem(key, previousSelectedValue);
        }
      } catch {
        // Web Storage cannot provide an atomic cross-storage rollback. The
        // persisted mode still selects one location deterministically.
      }

      throw error;
    }
  },

  removeItem(key) {
    requireAuthStorageKey(key);
    removeKeyFromAllStorage(key);
  },
};
