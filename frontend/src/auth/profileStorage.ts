const PROFILE_NAME_STORAGE_PREFIX = "ecoplaza-profile-name:";

export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 60;

type StoredProfileName = {
  version: 1;
  name: string;
};

function getProfileNameStorageKey(userId: string): string {
  return `${PROFILE_NAME_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

export function normalizeProfileName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isValidProfileName(name: string): boolean {
  const normalizedName = normalizeProfileName(name);

  return (
    normalizedName.length >= PROFILE_NAME_MIN_LENGTH &&
    normalizedName.length <= PROFILE_NAME_MAX_LENGTH
  );
}

export function readProfileName(userId: string, fallbackName: string): string {
  try {
    const storedValue = localStorage.getItem(getProfileNameStorageKey(userId));

    if (storedValue === null) return fallbackName;

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      !("version" in parsedValue) ||
      parsedValue.version !== 1 ||
      !("name" in parsedValue) ||
      typeof parsedValue.name !== "string"
    ) {
      return fallbackName;
    }

    const normalizedName = normalizeProfileName(parsedValue.name);
    return isValidProfileName(normalizedName) ? normalizedName : fallbackName;
  } catch {
    return fallbackName;
  }
}

export function storeProfileName(userId: string, name: string): boolean {
  const normalizedName = normalizeProfileName(name);

  if (!isValidProfileName(normalizedName)) return false;

  const storedValue: StoredProfileName = {
    version: 1,
    name: normalizedName,
  };

  try {
    localStorage.setItem(
      getProfileNameStorageKey(userId),
      JSON.stringify(storedValue),
    );
    return true;
  } catch {
    return false;
  }
}
