import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import {
  clearDemoSession,
  readDemoSession,
  storeDemoSession,
} from "./authStorage";
import { DEMO_USER, verifyDemoCredentials } from "./demoAuth";
import {
  isValidProfileName,
  normalizeProfileName,
  readProfileName,
  storeProfileName,
} from "./profileStorage";
import {
  readProfileAvatar,
  removeProfileAvatar,
  storeProfileAvatar,
} from "./avatarStorage";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readDemoSession);
  const [demoUser, setDemoUser] = useState(() => ({
    ...DEMO_USER,
    name: readProfileName(DEMO_USER.id, DEMO_USER.name),
  }));
  const avatarUrlRef = useRef<string | null>(null);
  const avatarRevisionRef = useRef(0);
  const user = isAuthenticated ? demoUser : null;

  const replaceAvatarUrl = useCallback((avatarUrl: string | null): void => {
    const previousAvatarUrl = avatarUrlRef.current;

    avatarUrlRef.current = avatarUrl;
    setDemoUser((currentUser) => ({ ...currentUser, avatarUrl }));

    if (previousAvatarUrl !== null && previousAvatarUrl !== avatarUrl) {
      URL.revokeObjectURL(previousAvatarUrl);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialRevision = avatarRevisionRef.current;

    const loadAvatar = async (): Promise<void> => {
      const storedAvatar = await readProfileAvatar(DEMO_USER.id);

      if (
        cancelled ||
        storedAvatar === null ||
        avatarRevisionRef.current !== initialRevision
      ) {
        return;
      }

      try {
        const avatarUrl = URL.createObjectURL(storedAvatar);

        if (cancelled) {
          URL.revokeObjectURL(avatarUrl);
          return;
        }

        replaceAvatarUrl(avatarUrl);
      } catch {
        return;
      }
    };

    void loadAvatar();

    return () => {
      cancelled = true;

      if (avatarUrlRef.current !== null) {
        URL.revokeObjectURL(avatarUrlRef.current);
        avatarUrlRef.current = null;
      }
    };
  }, [replaceAvatarUrl]);

  const signIn = (email: string, password: string, remember: boolean): boolean => {
    if (!verifyDemoCredentials(email, password)) return false;

    storeDemoSession(remember);
    setIsAuthenticated(true);
    return true;
  };

  const signOut = (): void => {
    clearDemoSession();
    setIsAuthenticated(false);
  };

  const updateUserName = (name: string): boolean => {
    const normalizedName = normalizeProfileName(name);

    if (!isValidProfileName(normalizedName)) return false;
    if (!storeProfileName(demoUser.id, normalizedName)) return false;

    setDemoUser((currentUser) => ({
      ...currentUser,
      name: normalizedName,
    }));
    return true;
  };

  const updateUserAvatar = async (avatar: Blob): Promise<boolean> => {
    let nextAvatarUrl: string;

    try {
      nextAvatarUrl = URL.createObjectURL(avatar);
    } catch {
      return false;
    }

    if (!(await storeProfileAvatar(demoUser.id, avatar))) {
      URL.revokeObjectURL(nextAvatarUrl);
      return false;
    }

    avatarRevisionRef.current += 1;
    replaceAvatarUrl(nextAvatarUrl);
    return true;
  };

  const removeUserAvatar = async (): Promise<boolean> => {
    if (!(await removeProfileAvatar(demoUser.id))) return false;

    avatarRevisionRef.current += 1;
    replaceAvatarUrl(null);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        signIn,
        signOut,
        updateUserName,
        updateUserAvatar,
        removeUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
