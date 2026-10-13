import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext, type AuthActionResult, type AuthUser } from "./AuthContext";
import {
  requestPasswordRecoveryOtp,
  signInWithPassword,
  signOut as signOutFromSupabase,
  updatePassword,
  verifyPasswordRecoveryOtp as verifyPasswordRecoveryOtpWithSupabase,
  verifySignUpOtp as verifySignUpOtpWithSupabase,
} from "./supabaseAuth";
import {
  clearPasswordRecoverySessionMarker,
  hasPasswordRecoverySession,
  markPasswordRecoverySession,
} from "./authSessionStorage";
import { supabase } from "../lib/supabase";
import { isValidProfileName, normalizeProfileName } from "./profileStorage";
import {
  getOrCreateProfile,
  getProfileFallbackName,
  updateProfileName,
} from "./profileService";
import {
  readProfileAvatar,
  removeProfileAvatar,
  storeProfileAvatar,
} from "./avatarStorage";

type ProfileLoadState = "idle" | "loading" | "ready" | "error";

function toFallbackAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: getProfileFallbackName(user),
    email: user.email ?? "",
    avatarUrl: null,
  };
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileError, setProfileError] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);
  const sessionRevisionRef = useRef(0);
  const profileLoadStateRef = useRef<ProfileLoadState>("idle");
  const userLoadRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  const avatarUrlRef = useRef<string | null>(null);
  const avatarRevisionRef = useRef(0);
  const passwordRecoveryActiveRef = useRef(false);
  const recoveryCleanupRef = useRef<Promise<AuthActionResult> | null>(null);

  const revokeCurrentAvatarUrl = useCallback((): void => {
    if (avatarUrlRef.current === null) return;

    URL.revokeObjectURL(avatarUrlRef.current);
    avatarUrlRef.current = null;
  }, []);

  const clearAuthenticatedUser = useCallback((): void => {
    sessionRevisionRef.current += 1;
    avatarRevisionRef.current += 1;
    activeUserIdRef.current = null;
    profileLoadStateRef.current = "idle";
    userLoadRef.current = null;
    revokeCurrentAvatarUrl();
    setProfileError(false);
    setUser(null);
    setIsLoading(false);
  }, [revokeCurrentAvatarUrl]);

  const loadUserResources = useCallback(
    (authUser: User, sessionRevision: number): void => {
      const existingLoad = userLoadRef.current;

      if (existingLoad?.userId === authUser.id) return;

      profileLoadStateRef.current = "loading";
      const avatarRevision = avatarRevisionRef.current;

      const promise = Promise.all([
        getOrCreateProfile(authUser),
        readProfileAvatar(authUser.id),
      ]).then(([profileResult, storedAvatar]) => {
        if (
          activeUserIdRef.current !== authUser.id ||
          sessionRevisionRef.current !== sessionRevision
        ) {
          return;
        }

        if (profileResult.ok) {
          profileLoadStateRef.current = "ready";
          setProfileError(false);
          setUser((currentUser) =>
            currentUser?.id === authUser.id
              ? { ...currentUser, name: profileResult.profile.fullName }
              : currentUser,
          );
        } else {
          profileLoadStateRef.current = "error";
          setProfileError(true);
        }

        if (storedAvatar === null || avatarRevisionRef.current !== avatarRevision) {
          return;
        }

        try {
          const avatarUrl = URL.createObjectURL(storedAvatar);

          if (
            activeUserIdRef.current !== authUser.id ||
            sessionRevisionRef.current !== sessionRevision ||
            avatarRevisionRef.current !== avatarRevision
          ) {
            URL.revokeObjectURL(avatarUrl);
            return;
          }

          revokeCurrentAvatarUrl();
          avatarUrlRef.current = avatarUrl;
          setUser((currentUser) =>
            currentUser?.id === authUser.id
              ? { ...currentUser, avatarUrl }
              : currentUser,
          );
        } catch {
          return;
        }
      }).catch(() => {
        if (
          activeUserIdRef.current === authUser.id &&
          sessionRevisionRef.current === sessionRevision
        ) {
          profileLoadStateRef.current = "error";
          setProfileError(true);
        }
      }).finally(() => {
        if (userLoadRef.current?.promise === promise) {
          userLoadRef.current = null;
        }
      });

      userLoadRef.current = { userId: authUser.id, promise };
    },
    [revokeCurrentAvatarUrl],
  );

  const synchronizeSession = useCallback(
    (session: Session | null, retryProfile: boolean): void => {
      if (session === null) {
        clearAuthenticatedUser();
        return;
      }

      const authUser = session.user;

      if (activeUserIdRef.current === authUser.id) {
        setUser((currentUser) =>
          currentUser?.id === authUser.id
            ? { ...currentUser, email: authUser.email ?? "" }
            : toFallbackAuthUser(authUser),
        );
        setIsLoading(false);

        if (retryProfile && profileLoadStateRef.current === "error") {
          loadUserResources(authUser, sessionRevisionRef.current);
        }
        return;
      }

      sessionRevisionRef.current += 1;
      avatarRevisionRef.current += 1;
      const sessionRevision = sessionRevisionRef.current;

      revokeCurrentAvatarUrl();
      activeUserIdRef.current = authUser.id;
      profileLoadStateRef.current = "idle";
      userLoadRef.current = null;
      setProfileError(false);
      setUser(toFallbackAuthUser(authUser));
      setIsLoading(false);
      loadUserResources(authUser, sessionRevision);
    },
    [clearAuthenticatedUser, loadUserResources, revokeCurrentAvatarUrl],
  );

  const discardPasswordRecoverySession = useCallback(async (): Promise<AuthActionResult> => {
    if (recoveryCleanupRef.current !== null) return recoveryCleanupRef.current;

    passwordRecoveryActiveRef.current = false;
    const cleanupPromise = (async (): Promise<AuthActionResult> => {
      const result = await signOutFromSupabase();

      if (!result.ok && result.error.storageCleanupFailed) {
        passwordRecoveryActiveRef.current = true;
        try {
          markPasswordRecoverySession();
        } catch {
          // Keeping the in-memory guard active still prevents this recovery
          // session from being treated as an authenticated application user.
        }
        clearAuthenticatedUser();
        return result;
      }

      try {
        clearPasswordRecoverySessionMarker();
      } catch {
        clearAuthenticatedUser();
        return {
          ok: false,
          error: {
            code: "unexpected_error",
            retryable: false,
            storageCleanupFailed: true,
          },
        };
      }

      clearAuthenticatedUser();

      return { ok: true };
    })();

    recoveryCleanupRef.current = cleanupPromise;

    try {
      return await cleanupPromise;
    } finally {
      if (recoveryCleanupRef.current === cleanupPromise) {
        recoveryCleanupRef.current = null;
      }
    }
  }, [clearAuthenticatedUser]);

  useEffect(() => {
    let disposed = false;
    let hasReceivedInitialState = false;
    const pendingSynchronizationTasks = new Set<number>();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (passwordRecoveryActiveRef.current || hasPasswordRecoverySession()) {
        hasReceivedInitialState = true;
        if (!passwordRecoveryActiveRef.current) {
          void discardPasswordRecoverySession();
        }
        return;
      }

      if (event === "PASSWORD_RECOVERY") {
        hasReceivedInitialState = true;
        try {
          markPasswordRecoverySession();
        } catch {
          // The recovery session is still discarded below even if the marker
          // cannot be persisted.
        }
        void discardPasswordRecoverySession();
        return;
      }

      if (
        event !== "INITIAL_SESSION" &&
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "TOKEN_REFRESHED"
      ) {
        return;
      }

      hasReceivedInitialState = true;
      const taskId = window.setTimeout(() => {
        pendingSynchronizationTasks.delete(taskId);
        if (disposed) return;
        synchronizeSession(session, event !== "TOKEN_REFRESHED");
      }, 0);
      pendingSynchronizationTasks.add(taskId);
    });

    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (disposed || hasReceivedInitialState) return;
        if (hasPasswordRecoverySession()) {
          void discardPasswordRecoverySession();
          return;
        }
        synchronizeSession(error ? null : data.session, true);
      },
      () => {
        if (disposed || hasReceivedInitialState) return;
        synchronizeSession(null, false);
      },
    );

    return () => {
      disposed = true;
      for (const taskId of pendingSynchronizationTasks) {
        window.clearTimeout(taskId);
      }
      pendingSynchronizationTasks.clear();
      subscription.unsubscribe();
    };
  }, [discardPasswordRecoverySession, synchronizeSession]);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      remember: boolean,
    ): Promise<AuthActionResult> => {
      const result = await signInWithPassword({
        email,
        password,
        persistence: remember ? "persistent" : "temporary",
      });

      if (!result.ok) return result;

      const { data, error } = await supabase.auth.getSession();

      if (error || data.session === null) {
        return {
          ok: false,
          error: { code: "unexpected_error", retryable: false },
        };
      }

      synchronizeSession(data.session, true);
      return { ok: true };
    },
    [synchronizeSession],
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    const result = await signOutFromSupabase();

    if (!result.ok) return result;

    clearAuthenticatedUser();
    return { ok: true };
  }, [clearAuthenticatedUser]);

  const verifySignUpOtp = useCallback(
    async (email: string, token: string): Promise<AuthActionResult> => {
      const result = await verifySignUpOtpWithSupabase({
        email,
        token,
        persistence: "temporary",
      });

      if (!result.ok) return result;

      const verifiedUserId = result.data.user?.id;
      if (!result.data.authenticated || verifiedUserId === undefined) {
        return {
          ok: false,
          error: { code: "unexpected_error", retryable: false },
        };
      }

      const { data, error } = await supabase.auth.getSession();
      if (
        error ||
        data.session === null ||
        data.session.user.id !== verifiedUserId
      ) {
        return {
          ok: false,
          error: { code: "unexpected_error", retryable: false },
        };
      }

      synchronizeSession(data.session, true);
      return { ok: true };
    },
    [synchronizeSession],
  );

  const requestPasswordRecovery = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      const result = await requestPasswordRecoveryOtp({ email });
      return result.ok ? { ok: true } : result;
    },
    [],
  );

  const verifyPasswordRecoveryOtp = useCallback(
    async (email: string, token: string): Promise<AuthActionResult> => {
      try {
        markPasswordRecoverySession();
      } catch {
        return {
          ok: false,
          error: { code: "unexpected_error", retryable: false },
        };
      }

      passwordRecoveryActiveRef.current = true;
      const result = await verifyPasswordRecoveryOtpWithSupabase({
        email,
        token,
        persistence: "temporary",
      });

      if (!result.ok) {
        passwordRecoveryActiveRef.current = false;
        try {
          clearPasswordRecoverySessionMarker();
        } catch {
          return {
            ok: false,
            error: {
              code: "unexpected_error",
              retryable: false,
              storageCleanupFailed: true,
            },
          };
        }
        return result;
      }

      const verifiedUserId = result.data.user?.id;
      const { data, error } = await supabase.auth.getSession();
      if (
        !result.data.authenticated ||
        verifiedUserId === undefined ||
        error ||
        data.session === null ||
        data.session.user.id !== verifiedUserId
      ) {
        await discardPasswordRecoverySession();
        return {
          ok: false,
          error: { code: "unexpected_error", retryable: false },
        };
      }

      clearAuthenticatedUser();
      return { ok: true };
    },
    [clearAuthenticatedUser, discardPasswordRecoverySession],
  );

  const updateRecoveredPassword = useCallback(
    async (password: string): Promise<AuthActionResult> => {
      if (
        !passwordRecoveryActiveRef.current ||
        !hasPasswordRecoverySession()
      ) {
        return {
          ok: false,
          error: { code: "unexpected_error", retryable: false },
        };
      }

      const result = await updatePassword({ password });
      if (!result.ok) return result;

      const cleanupResult = await discardPasswordRecoverySession();
      if (cleanupResult.ok) return cleanupResult;

      const retryResult = await discardPasswordRecoverySession();
      if (retryResult.ok) return retryResult;

      return {
        ok: false,
        error: {
          code: "recovery_cleanup_failed",
          retryable: true,
          storageCleanupFailed: true,
        },
      };
    },
    [discardPasswordRecoverySession],
  );

  const cancelPasswordRecovery = useCallback(async (): Promise<AuthActionResult> => {
    if (
      !passwordRecoveryActiveRef.current &&
      !hasPasswordRecoverySession()
    ) {
      return { ok: true };
    }

    return discardPasswordRecoverySession();
  }, [discardPasswordRecoverySession]);

  const updateUserName = useCallback(async (name: string): Promise<boolean> => {
    const normalizedName = normalizeProfileName(name);
    const userId = activeUserIdRef.current;

    if (userId === null || !isValidProfileName(normalizedName)) return false;

    const pendingUserLoad = userLoadRef.current;
    if (pendingUserLoad?.userId === userId) {
      await pendingUserLoad.promise;
    }

    if (activeUserIdRef.current !== userId) return false;

    const result = await updateProfileName(userId, normalizedName);

    if (!result.ok || activeUserIdRef.current !== userId) return false;

    profileLoadStateRef.current = "ready";
    setProfileError(false);
    setUser((currentUser) =>
      currentUser?.id === userId
        ? { ...currentUser, name: result.profile.fullName }
        : currentUser,
    );
    return true;
  }, []);

  const updateUserAvatar = useCallback(async (avatar: Blob): Promise<boolean> => {
    const userId = activeUserIdRef.current;
    if (userId === null) return false;

    let nextAvatarUrl: string;

    try {
      nextAvatarUrl = URL.createObjectURL(avatar);
    } catch {
      return false;
    }

    if (!(await storeProfileAvatar(userId, avatar))) {
      URL.revokeObjectURL(nextAvatarUrl);
      return false;
    }

    if (activeUserIdRef.current !== userId) {
      URL.revokeObjectURL(nextAvatarUrl);
      return false;
    }

    avatarRevisionRef.current += 1;
    revokeCurrentAvatarUrl();
    avatarUrlRef.current = nextAvatarUrl;
    setUser((currentUser) =>
      currentUser?.id === userId
        ? { ...currentUser, avatarUrl: nextAvatarUrl }
        : currentUser,
    );
    return true;
  }, [revokeCurrentAvatarUrl]);

  const removeUserAvatar = useCallback(async (): Promise<boolean> => {
    const userId = activeUserIdRef.current;
    if (userId === null || !(await removeProfileAvatar(userId))) return false;
    if (activeUserIdRef.current !== userId) return false;

    avatarRevisionRef.current += 1;
    revokeCurrentAvatarUrl();
    setUser((currentUser) =>
      currentUser?.id === userId
        ? { ...currentUser, avatarUrl: null }
        : currentUser,
    );
    return true;
  }, [revokeCurrentAvatarUrl]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: user !== null,
        user,
        profileError,
        signIn,
        verifySignUpOtp,
        requestPasswordRecovery,
        verifyPasswordRecoveryOtp,
        updateRecoveredPassword,
        cancelPasswordRecovery,
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
