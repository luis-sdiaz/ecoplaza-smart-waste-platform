import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { isValidProfileName, normalizeProfileName } from "./profileStorage";

export type UserProfile = {
  id: string;
  fullName: string;
};

export type ProfileServiceResult =
  | { ok: true; profile: UserProfile }
  | { ok: false };

type ProfileRow = {
  id: string;
  full_name: string;
};

const PROFILE_CONFLICT_CODE = "23505";
const DEFAULT_PROFILE_NAME = "EcoPlaza User";

function toUserProfile(row: ProfileRow, expectedUserId: string): UserProfile | null {
  const normalizedName = normalizeProfileName(row.full_name);

  if (row.id !== expectedUserId || !isValidProfileName(normalizedName)) {
    return null;
  }

  return {
    id: row.id,
    fullName: normalizedName,
  };
}

function readMetadataName(user: User): string | null {
  const fullName: unknown = user.user_metadata.full_name;

  if (typeof fullName !== "string") return null;

  const normalizedName = normalizeProfileName(fullName);
  return isValidProfileName(normalizedName) ? normalizedName : null;
}

export function getProfileFallbackName(user: User): string {
  const metadataName = readMetadataName(user);
  if (metadataName !== null) return metadataName;

  const emailName = normalizeProfileName(
    (user.email?.split("@", 1)[0] ?? "").replace(/[._-]+/g, " "),
  );

  return isValidProfileName(emailName) ? emailName : DEFAULT_PROFILE_NAME;
}

async function readProfile(userId: string): Promise<ProfileServiceResult | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) return { ok: false };
  if (data === null) return null;

  const profile = toUserProfile(data, userId);
  return profile === null ? { ok: false } : { ok: true, profile };
}

export async function getOrCreateProfile(
  user: User,
): Promise<ProfileServiceResult> {
  try {
    const existingProfile = await readProfile(user.id);

    if (existingProfile !== null) return existingProfile;

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: getProfileFallbackName(user),
      })
      .select("id, full_name")
      .single<ProfileRow>();

    if (!error) {
      const profile = toUserProfile(data, user.id);
      return profile === null ? { ok: false } : { ok: true, profile };
    }

    if (error.code === PROFILE_CONFLICT_CODE) {
      return (await readProfile(user.id)) ?? { ok: false };
    }

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function updateProfileName(
  userId: string,
  name: string,
): Promise<ProfileServiceResult> {
  const normalizedName = normalizeProfileName(name);

  if (!isValidProfileName(normalizedName)) return { ok: false };

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: normalizedName })
      .eq("id", userId)
      .select("id, full_name")
      .maybeSingle<ProfileRow>();

    if (error || data === null) return { ok: false };

    const profile = toUserProfile(data, userId);
    return profile === null ? { ok: false } : { ok: true, profile };
  } catch {
    return { ok: false };
  }
}
