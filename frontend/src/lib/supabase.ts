import { createClient } from "@supabase/supabase-js";
import {
  authSessionStorage,
  SUPABASE_AUTH_STORAGE_KEY,
} from "../auth/authSessionStorage";

const readRequiredEnvironmentVariable = (
  name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY",
  value: string | undefined,
): string => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `[Supabase configuration] ${name} is missing. Add it to frontend/.env.local.`,
    );
  }

  return normalizedValue;
};

const validateSupabaseUrl = (value: string): string => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "[Supabase configuration] VITE_SUPABASE_URL must be a valid URL.",
    );
  }

  const isSecureUrl = url.protocol === "https:";
  const isLocalDevelopmentUrl =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");

  if (!isSecureUrl && !isLocalDevelopmentUrl) {
    throw new Error(
      "[Supabase configuration] VITE_SUPABASE_URL must use HTTPS outside local development.",
    );
  }

  if (url.username || url.password) {
    throw new Error(
      "[Supabase configuration] VITE_SUPABASE_URL must not contain credentials.",
    );
  }

  return url.toString().replace(/\/$/, "");
};

const readLegacyKeyRole = (value: string): string | null => {
  const segments = value.split(".");
  if (segments.length !== 3) return null;

  try {
    const payload = segments[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(segments[1].length / 4) * 4, "=");
    const decodedPayload: unknown = JSON.parse(atob(payload));

    if (
      typeof decodedPayload === "object" &&
      decodedPayload !== null &&
      "role" in decodedPayload &&
      typeof decodedPayload.role === "string"
    ) {
      return decodedPayload.role;
    }
  } catch {
    return null;
  }

  return null;
};

const validatePublishableKey = (value: string): string => {
  const isPublishableKey = value.startsWith("sb_publishable_");
  const isLegacyAnonKey = readLegacyKeyRole(value) === "anon";

  if (!isPublishableKey && !isLegacyAnonKey) {
    throw new Error(
      "[Supabase configuration] VITE_SUPABASE_PUBLISHABLE_KEY must contain a publishable key, never a secret or service_role key.",
    );
  }

  return value;
};

const supabaseUrl = validateSupabaseUrl(
  readRequiredEnvironmentVariable(
    "VITE_SUPABASE_URL",
    import.meta.env.VITE_SUPABASE_URL,
  ),
);
const supabasePublishableKey = validatePublishableKey(
  readRequiredEnvironmentVariable(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ),
);

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: authSessionStorage,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});
