import { supabase } from "../lib/supabase";
import {
  classifyAuthError,
  type AuthOperation,
  type ClassifiedAuthError,
} from "./authErrors";
import {
  clearAuthSessionStorage,
  selectAuthSessionPersistence,
  type AuthSessionPersistence,
} from "./authSessionStorage";

export type AuthServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ClassifiedAuthError };

type AuthServiceFailure = Extract<AuthServiceResult<never>, { ok: false }>;

export type SignInInput = {
  email: string;
  password: string;
  persistence: AuthSessionPersistence;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  persistence: AuthSessionPersistence;
};

export type VerifySignUpOtpInput = {
  email: string;
  token: string;
  persistence: AuthSessionPersistence;
};

export type ResendSignUpOtpInput = {
  email: string;
};

export type RequestPasswordRecoveryInput = {
  email: string;
};

export type VerifyPasswordRecoveryOtpInput = {
  email: string;
  token: string;
  persistence: AuthSessionPersistence;
};

export type UpdatePasswordInput = {
  password: string;
};

export type AuthenticatedUserReference = {
  id: string;
  email: string | null;
};

export type SignUpResult = {
  confirmationRequired: boolean;
};

export type VerifySignUpOtpResult = {
  authenticated: boolean;
  user: AuthenticatedUserReference | null;
};

export type VerifyPasswordRecoveryOtpResult = VerifySignUpOtpResult;

const LOCAL_SIGN_OUT_SCOPE = "local" as const;
const MIN_FULL_NAME_LENGTH = 2;
const MAX_FULL_NAME_LENGTH = 60;

let authOperationTail: Promise<void> = Promise.resolve();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, " ");
}

function failure(
  error: unknown,
  operation: AuthOperation,
): AuthServiceFailure {
  return { ok: false, error: classifyAuthError(error, operation) };
}

function runAuthOperation<T>(
  operation: () => Promise<AuthServiceResult<T>>,
): Promise<AuthServiceResult<T>> {
  const result = authOperationTail.then(operation, operation);

  authOperationTail = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

async function rejectActiveSession<T>(
  operation: AuthOperation,
): Promise<AuthServiceResult<T> | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) return failure(error, operation);
  if (data.session === null) return null;

  return {
    ok: false,
    error: {
      code: "session_already_active",
      retryable: false,
    },
  };
}

export function signInWithPassword(
  input: SignInInput,
): Promise<AuthServiceResult<AuthenticatedUserReference>> {
  return runAuthOperation(async () => {
    try {
      const activeSessionResult = await rejectActiveSession<AuthenticatedUserReference>(
        "sign-in",
      );

      if (activeSessionResult) return activeSessionResult;

      selectAuthSessionPersistence(input.persistence);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(input.email),
        password: input.password,
      });

      if (error) return failure(error, "sign-in");

      return {
        ok: true,
        data: {
          id: data.user.id,
          email: data.user.email ?? null,
        },
      };
    } catch (error) {
      return failure(error, "sign-in");
    }
  });
}

export function signUpWithPassword(
  input: SignUpInput,
): Promise<AuthServiceResult<SignUpResult>> {
  return runAuthOperation(async () => {
    const fullName = normalizeFullName(input.fullName);

    if (
      fullName.length < MIN_FULL_NAME_LENGTH ||
      fullName.length > MAX_FULL_NAME_LENGTH
    ) {
      return {
        ok: false,
        error: {
          code: "invalid_full_name",
          retryable: false,
        },
      };
    }

    try {
      const activeSessionResult = await rejectActiveSession<SignUpResult>(
        "sign-up",
      );

      if (activeSessionResult) return activeSessionResult;

      selectAuthSessionPersistence(input.persistence);

      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(input.email),
        password: input.password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) return failure(error, "sign-up");

      return {
        ok: true,
        data: {
          confirmationRequired: data.session === null,
        },
      };
    } catch (error) {
      return failure(error, "sign-up");
    }
  });
}

export function verifySignUpOtp(
  input: VerifySignUpOtpInput,
): Promise<AuthServiceResult<VerifySignUpOtpResult>> {
  return runAuthOperation(async () => {
    try {
      const activeSessionResult = await rejectActiveSession<VerifySignUpOtpResult>(
        "verify-signup-otp",
      );

      if (activeSessionResult) return activeSessionResult;

      selectAuthSessionPersistence(input.persistence);

      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizeEmail(input.email),
        token: input.token.trim(),
        type: "signup",
      });

      if (error) return failure(error, "verify-signup-otp");

      return {
        ok: true,
        data: {
          authenticated: data.session !== null,
          user: data.user
            ? {
                id: data.user.id,
                email: data.user.email ?? null,
              }
            : null,
        },
      };
    } catch (error) {
      return failure(error, "verify-signup-otp");
    }
  });
}

export function resendSignUpOtp(
  input: ResendSignUpOtpInput,
): Promise<AuthServiceResult<null>> {
  return runAuthOperation(async () => {
    try {
      const { error } = await supabase.auth.resend({
        email: normalizeEmail(input.email),
        type: "signup",
      });

      if (error) return failure(error, "resend-signup-otp");
      return { ok: true, data: null };
    } catch (error) {
      return failure(error, "resend-signup-otp");
    }
  });
}

export function requestPasswordRecoveryOtp(
  input: RequestPasswordRecoveryInput,
): Promise<AuthServiceResult<null>> {
  return runAuthOperation(async () => {
    try {
      const activeSessionResult = await rejectActiveSession<null>(
        "request-password-recovery",
      );

      if (activeSessionResult) return activeSessionResult;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizeEmail(input.email),
      );

      if (error) return failure(error, "request-password-recovery");
      return { ok: true, data: null };
    } catch (error) {
      return failure(error, "request-password-recovery");
    }
  });
}

export function verifyPasswordRecoveryOtp(
  input: VerifyPasswordRecoveryOtpInput,
): Promise<AuthServiceResult<VerifyPasswordRecoveryOtpResult>> {
  return runAuthOperation(async () => {
    try {
      const activeSessionResult = await rejectActiveSession<VerifyPasswordRecoveryOtpResult>(
        "verify-recovery-otp",
      );

      if (activeSessionResult) return activeSessionResult;

      selectAuthSessionPersistence(input.persistence);

      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizeEmail(input.email),
        token: input.token.trim(),
        type: "recovery",
      });

      if (error) return failure(error, "verify-recovery-otp");

      return {
        ok: true,
        data: {
          authenticated: data.session !== null,
          user: data.user
            ? { id: data.user.id, email: data.user.email ?? null }
            : null,
        },
      };
    } catch (error) {
      return failure(error, "verify-recovery-otp");
    }
  });
}

export function updatePassword(
  input: UpdatePasswordInput,
): Promise<AuthServiceResult<null>> {
  return runAuthOperation(async () => {
    if (input.password.length < 8) {
      return {
        ok: false,
        error: { code: "weak_password", retryable: true },
      };
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) return failure(sessionError, "update-password");
      if (sessionData.session === null) {
        return {
          ok: false,
          error: { code: "unexpected_error", retryable: false },
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: input.password,
      });

      if (error) return failure(error, "update-password");
      return { ok: true, data: null };
    } catch (error) {
      return failure(error, "update-password");
    }
  });
}

/** Signs out only the current EcoPlaza session, leaving other devices active. */
export function signOut(): Promise<AuthServiceResult<null>> {
  return runAuthOperation(async () => {
    let signOutError: unknown;
    let storageCleanupError: unknown;

    try {
      const { error } = await supabase.auth.signOut({
        scope: LOCAL_SIGN_OUT_SCOPE,
      });
      signOutError = error;
    } catch (error) {
      signOutError = error;
    }

    try {
      clearAuthSessionStorage();
    } catch (error) {
      storageCleanupError = error;
    }

    if (signOutError) {
      const result = failure(signOutError, "sign-out");

      return storageCleanupError
        ? {
            ...result,
            error: {
              ...result.error,
              storageCleanupFailed: true,
            },
          }
        : result;
    }

    if (storageCleanupError) {
      const result = failure(storageCleanupError, "sign-out");

      return {
        ...result,
        error: {
          ...result.error,
          storageCleanupFailed: true,
        },
      };
    }

    return { ok: true, data: null };
  });
}
