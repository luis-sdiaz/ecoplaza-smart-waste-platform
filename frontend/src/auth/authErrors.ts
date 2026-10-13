import {
  isAuthError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";

export type AuthOperation =
  | "sign-in"
  | "sign-up"
  | "verify-signup-otp"
  | "resend-signup-otp"
  | "sign-out";

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_registered"
  | "otp_invalid_or_expired"
  | "rate_limited"
  | "network_error"
  | "session_already_active"
  | "invalid_full_name"
  | "unexpected_error";

export type ClassifiedAuthError = {
  code: AuthErrorCode;
  retryable: boolean;
  storageCleanupFailed?: boolean;
};

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
]);

const REGISTERED_USER_CODES = new Set([
  "email_exists",
  "identity_already_exists",
  "user_already_exists",
]);

export function classifyAuthError(
  error: unknown,
  operation: AuthOperation,
): ClassifiedAuthError {
  if (isAuthRetryableFetchError(error)) {
    return { code: "network_error", retryable: true };
  }

  if (!isAuthError(error)) {
    return { code: "unexpected_error", retryable: false };
  }

  if (error.code === "invalid_credentials") {
    return operation === "verify-signup-otp"
      ? { code: "otp_invalid_or_expired", retryable: true }
      : { code: "invalid_credentials", retryable: false };
  }

  if (error.code === "email_not_confirmed") {
    return { code: "email_not_confirmed", retryable: true };
  }

  if (error.code && REGISTERED_USER_CODES.has(error.code)) {
    return { code: "user_already_registered", retryable: false };
  }

  if (
    error.code === "otp_expired" ||
    (operation === "verify-signup-otp" && error.code === "validation_failed")
  ) {
    return { code: "otp_invalid_or_expired", retryable: true };
  }

  if (
    error.status === 429 ||
    (error.code && RATE_LIMIT_CODES.has(error.code))
  ) {
    return { code: "rate_limited", retryable: true };
  }

  if (error.code === "request_timeout") {
    return { code: "network_error", retryable: true };
  }

  return { code: "unexpected_error", retryable: false };
}
