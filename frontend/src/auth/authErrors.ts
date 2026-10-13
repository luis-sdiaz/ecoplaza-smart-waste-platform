import {
  isAuthError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";

export type AuthOperation =
  | "sign-in"
  | "sign-up"
  | "verify-signup-otp"
  | "resend-signup-otp"
  | "request-password-recovery"
  | "verify-recovery-otp"
  | "update-password"
  | "sign-out";

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_registered"
  | "otp_invalid"
  | "otp_expired"
  | "weak_password"
  | "password_reused"
  | "recovery_cleanup_failed"
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

  const isOtpVerification =
    operation === "verify-signup-otp" || operation === "verify-recovery-otp";

  if (error.code === "invalid_credentials") {
    return isOtpVerification
      ? { code: "otp_invalid", retryable: true }
      : { code: "invalid_credentials", retryable: false };
  }

  if (error.code === "email_not_confirmed") {
    return { code: "email_not_confirmed", retryable: true };
  }

  if (error.code && REGISTERED_USER_CODES.has(error.code)) {
    return { code: "user_already_registered", retryable: false };
  }

  if (error.code === "otp_expired") {
    return { code: "otp_expired", retryable: true };
  }

  if (isOtpVerification && error.code === "validation_failed") {
    return { code: "otp_invalid", retryable: true };
  }

  if (error.code === "weak_password") {
    return { code: "weak_password", retryable: true };
  }

  if (error.code === "same_password") {
    return { code: "password_reused", retryable: true };
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
