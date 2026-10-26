import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import type { AuthErrorCode } from "../../auth/authErrors";
import "./RegisterModal.css";

type RecoveryStep = "email" | "otp" | "password";
type Feedback = { tone: "error" | "success"; key: string };

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail: string;
  onClose: () => void;
  onSuccess: () => void;
  testId?: string;
}

const OTP_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getRequestErrorKey(code: AuthErrorCode): string {
  if (code === "network_error") return "recovery.networkError";
  if (code === "rate_limited") return "recovery.rateLimited";
  if (code === "session_already_active") return "recovery.sessionAlreadyActive";
  return "recovery.requestError";
}

function getOtpErrorKey(code: AuthErrorCode): string {
  if (code === "otp_invalid") return "recovery.otpIncorrect";
  if (code === "otp_expired") return "recovery.otpExpired";
  if (code === "network_error") return "recovery.networkError";
  if (code === "rate_limited") return "recovery.rateLimited";
  return "recovery.verificationError";
}

function getPasswordErrorKey(code: AuthErrorCode): string {
  if (code === "recovery_cleanup_failed") return "recovery.cleanupError";
  if (code === "weak_password") return "recovery.passwordRejected";
  if (code === "password_reused") return "recovery.passwordReused";
  if (code === "network_error") return "recovery.networkError";
  if (code === "rate_limited") return "recovery.rateLimited";
  return "recovery.updateError";
}

function ForgotPasswordModal({
  isOpen,
  initialEmail,
  onClose,
  onSuccess,
  testId,
}: ForgotPasswordModalProps) {
  const { t, i18n } = useTranslation();
  const {
    requestPasswordRecovery,
    verifyPasswordRecoveryOtp,
    updateRecoveredPassword,
    cancelPasswordRecovery,
  } = useAuth();
  const modalId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const operationRevisionRef = useRef(0);
  const isPendingRef = useRef(false);
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const isBusy = isPending || isResending;

  const resetState = () => {
    operationRevisionRef.current += 1;
    isPendingRef.current = false;
    setStep("email");
    setEmail("");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFieldError(null);
    setFeedback(null);
    setIsPending(false);
    setIsResending(false);
    setResendSeconds(0);
  };

  const handleClose = () => {
    void cancelPasswordRecovery();
    resetState();
    onClose();
  };

  const requestCode = async (isResend: boolean) => {
    if (isPendingRef.current || resendSeconds > 0) return;

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setFieldError("recovery.emailRequired");
      emailInputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setFieldError("recovery.emailInvalid");
      emailInputRef.current?.focus({ preventScroll: true });
      return;
    }

    const operationRevision = operationRevisionRef.current;
    isPendingRef.current = true;
    setIsPending(!isResend);
    setIsResending(isResend);
    setFieldError(null);
    setFeedback(null);

    try {
      const result = await requestPasswordRecovery(normalizedEmail);
      if (operationRevision !== operationRevisionRef.current) return;

      if (!result.ok) {
        setFeedback({ tone: "error", key: getRequestErrorKey(result.error.code) });
        if (result.error.code === "rate_limited") {
          setResendSeconds(RESEND_COOLDOWN_SECONDS);
        }
        return;
      }

      setEmail(normalizedEmail);
      setOtp("");
      setFeedback({
        tone: "success",
        key: isResend ? "recovery.codeResent" : "recovery.codeRequested",
      });
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch {
      if (operationRevision === operationRevisionRef.current) {
        setFeedback({ tone: "error", key: "recovery.requestError" });
      }
    } finally {
      isPendingRef.current = false;
      if (operationRevision === operationRevisionRef.current) {
        setIsPending(false);
        setIsResending(false);
      }
    }
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void requestCode(false);
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPendingRef.current) return;

    const normalizedOtp = otp.replace(/\D/g, "");
    if (normalizedOtp.length !== OTP_LENGTH) {
      setFieldError("recovery.otpLength");
      otpInputRef.current?.focus({ preventScroll: true });
      return;
    }

    const operationRevision = operationRevisionRef.current;
    isPendingRef.current = true;
    setIsPending(true);
    setFieldError(null);
    setFeedback(null);

    try {
      const result = await verifyPasswordRecoveryOtp(email, normalizedOtp);
      if (operationRevision !== operationRevisionRef.current) return;

      if (!result.ok) {
        setFeedback({ tone: "error", key: getOtpErrorKey(result.error.code) });
        return;
      }

      setOtp("");
      setFeedback({ tone: "success", key: "recovery.codeVerified" });
      setStep("password");
    } catch {
      if (operationRevision === operationRevisionRef.current) {
        setFeedback({ tone: "error", key: "recovery.verificationError" });
      }
    } finally {
      isPendingRef.current = false;
      if (operationRevision === operationRevisionRef.current) setIsPending(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPendingRef.current) return;

    if (!password) {
      setFieldError("recovery.passwordRequired");
      passwordInputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (password.length < 8) {
      setFieldError("recovery.passwordLength");
      passwordInputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!confirmPassword) {
      setFieldError("recovery.confirmPasswordRequired");
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("recovery.passwordMismatch");
      return;
    }

    const operationRevision = operationRevisionRef.current;
    isPendingRef.current = true;
    setIsPending(true);
    setFieldError(null);
    setFeedback(null);

    try {
      const result = await updateRecoveredPassword(password);
      if (operationRevision !== operationRevisionRef.current) return;

      if (!result.ok) {
        setPassword("");
        setConfirmPassword("");
        setFeedback({ tone: "error", key: getPasswordErrorKey(result.error.code) });
        requestAnimationFrame(() => passwordInputRef.current?.focus({ preventScroll: true }));
        return;
      }

      resetState();
      onSuccess();
    } catch {
      if (operationRevision === operationRevisionRef.current) {
        setPassword("");
        setConfirmPassword("");
        setFeedback({ tone: "error", key: "recovery.updateError" });
      }
    } finally {
      isPendingRef.current = false;
      if (operationRevision === operationRevisionRef.current) setIsPending(false);
    }
  };

  const handleBackToEmail = () => {
    if (isPendingRef.current) return;
    setStep("email");
    setOtp("");
    setFieldError(null);
    setFeedback(null);
    requestAnimationFrame(() => emailInputRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    setEmail(normalizeEmail(initialEmail));
    const previousFocus = document.activeElement;
    if (typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
      } catch {
        // Fallback defensivo para jsdom
      }
    }
    requestAnimationFrame(() => emailInputRef.current?.focus({ preventScroll: true }));

    return () => {
      if (typeof dialog.close === "function") {
        try {
          dialog.close();
        } catch {
          // Fallback defensivo para jsdom
        }
      }
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [initialEmail, isOpen]);

  useEffect(() => {
    const input = step === "otp"
      ? otpInputRef.current
      : step === "password"
        ? passwordInputRef.current
        : emailInputRef.current;
    requestAnimationFrame(() => input?.focus({ preventScroll: true }));
  }, [step]);

  useEffect(() => {
    if (!isOpen || resendSeconds <= 0) return;
    const timeoutId = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, resendSeconds]);

  useEffect(() => () => { operationRevisionRef.current += 1; }, []);

  if (!isOpen) return null;

  const titleKey = step === "email"
    ? "recovery.title"
    : step === "otp"
      ? "recovery.verifyTitle"
      : "recovery.newPasswordTitle";
  const description = step === "email"
    ? t("recovery.description")
    : step === "otp"
      ? t("recovery.verifyDescription", { email })
      : t("recovery.newPasswordDescription");
  const feedbackClass = feedback?.tone === "success"
    ? "border-ecoplaza-primary/30 bg-ecoplaza-primary/10 text-ecoplaza-primary"
    : "border-ecoplaza-danger/30 bg-ecoplaza-danger/10 text-ecoplaza-danger";

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
      aria-describedby={`${modalId}-description`}
      lang={i18n.resolvedLanguage === "en" ? "en" : "es"}
      className="ecoplaza-register-modal px-8 py-7 text-ecoplaza-text"
      onCancel={(event) => { event.preventDefault(); handleClose(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          handleClose();
        }
      }}
      data-testid={testId}
    >
      <button
        type="button"
        aria-label={t("recovery.close")}
        onClick={handleClose}
        className="absolute top-5 right-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
      >
        <X size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <header>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-ecoplaza-primary/10 text-ecoplaza-primary">
          {step === "email"
            ? <KeyRound size={22} strokeWidth={1.8} aria-hidden="true" />
            : step === "otp"
              ? <ShieldCheck size={23} strokeWidth={1.8} aria-hidden="true" />
              : <Lock size={22} strokeWidth={1.8} aria-hidden="true" />}
        </div>
        <h2 id={`${modalId}-title`} className="pr-10 text-[28px] leading-9 font-semibold tracking-tight">
          {t(titleKey)}
        </h2>
        <p id={`${modalId}-description`} className="mt-1.5 text-sm leading-5 text-ecoplaza-text-muted">
          {description}
        </p>
      </header>

      {step === "email" && (
        <form className="mt-6" noValidate onSubmit={handleEmailSubmit}>
          <label htmlFor={`${modalId}-email`} className="mb-1.5 block text-sm font-medium text-ecoplaza-text">
            {t("recovery.email")}
          </label>
          <div className="relative">
            <Mail size={19} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted" />
            <input
              ref={emailInputRef}
              id={`${modalId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("recovery.emailPlaceholder")}
              required
              disabled={isPending}
              value={email}
              onChange={(event) => { setEmail(event.target.value); setFieldError(null); setFeedback(null); }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? `${modalId}-email-error` : undefined}
              className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-4 pl-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          {fieldError && <p id={`${modalId}-email-error`} className="mt-1 text-xs leading-4 text-ecoplaza-danger">{t(fieldError)}</p>}
          {feedback && <p role="alert" className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${feedbackClass}`}>{t(feedback.key)}</p>}
          <button type="submit" disabled={isPending || resendSeconds > 0} aria-busy={isPending}
            className="mt-5 flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-65">
            {isPending ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} aria-hidden="true" /> : <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />}
            <span role={isPending ? "status" : undefined}>
              {isPending
                ? t("recovery.sending")
                : resendSeconds > 0
                  ? t("recovery.retryIn", { seconds: resendSeconds })
                  : t("recovery.sendCode")}
            </span>
          </button>
        </form>
      )}

      {step === "otp" && (
        <form className="mt-6" noValidate onSubmit={handleOtpSubmit}>
          <label htmlFor={`${modalId}-otp`} className="mb-1.5 block text-sm font-medium text-ecoplaza-text">{t("recovery.otpLabel")}</label>
          <div className="relative">
            <ShieldCheck size={19} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted" />
            <input
              ref={otpInputRef}
              id={`${modalId}-otp`}
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={OTP_LENGTH}
              placeholder={t("recovery.otpPlaceholder")}
              required
              disabled={isBusy}
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
                setFieldError(null);
                setFeedback(null);
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? `${modalId}-otp-error` : `${modalId}-otp-help`}
              className="h-14 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-4 pl-12 text-center font-mono text-xl tracking-[0.32em] text-ecoplaza-text transition-colors placeholder:tracking-normal placeholder:text-ecoplaza-text-muted/60 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          {fieldError
            ? <p id={`${modalId}-otp-error`} className="mt-1 text-xs leading-4 text-ecoplaza-danger">{t(fieldError)}</p>
            : <p id={`${modalId}-otp-help`} className="mt-1.5 text-xs leading-4 text-ecoplaza-text-muted">{t("recovery.otpHelp")}</p>}
          {feedback && <p role={feedback.tone === "error" ? "alert" : "status"} className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${feedbackClass}`}>{t(feedback.key)}</p>}
          <button type="submit" disabled={isBusy}
            className="mt-5 flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-65">
            {isPending && !isResending ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} aria-hidden="true" /> : <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />}
            {t(isPending && !isResending ? "recovery.verifying" : "recovery.verifyCode")}
          </button>
          <button type="button" disabled={isBusy || resendSeconds > 0} onClick={() => void requestCode(true)}
            className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold text-ecoplaza-primary transition-colors hover:bg-ecoplaza-primary/8 hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:text-ecoplaza-text-muted disabled:opacity-70">
            {isResending ? <LoaderCircle className="animate-spin" size={16} strokeWidth={1.8} aria-hidden="true" /> : <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />}
            {isResending ? t("recovery.resending") : resendSeconds > 0 ? t("recovery.resendIn", { seconds: resendSeconds }) : t("recovery.resend")}
          </button>
          <button type="button" disabled={isBusy} onClick={handleBackToEmail}
            className="mt-1 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm text-ecoplaza-text-muted transition-colors hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60">
            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            {t("recovery.back")}
          </button>
        </form>
      )}

      {step === "password" && (
        <form className="mt-6" noValidate onSubmit={handlePasswordSubmit}>
          {([
            { name: "password", label: t("recovery.newPassword"), value: password, visible: showPassword, setValue: setPassword, setVisible: setShowPassword, inputRef: passwordInputRef },
            { name: "confirmPassword", label: t("recovery.confirmPassword"), value: confirmPassword, visible: showConfirmPassword, setValue: setConfirmPassword, setVisible: setShowConfirmPassword, inputRef: undefined },
          ] as const).map((field, index) => {
            const VisibilityIcon = field.visible ? EyeOff : Eye;
            return (
              <div key={field.name} className={index === 1 ? "mt-4" : undefined}>
                <label htmlFor={`${modalId}-${field.name}`} className="mb-1.5 block text-sm font-medium text-ecoplaza-text">{field.label}</label>
                <div className="relative">
                  <Lock size={19} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted" />
                  <input
                    ref={field.inputRef}
                    id={`${modalId}-${field.name}`}
                    name={field.name}
                    type={field.visible ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="•••••••••••"
                    minLength={8}
                    required
                    disabled={isPending}
                    value={field.value}
                    onChange={(event) => { field.setValue(event.target.value); setFieldError(null); setFeedback(null); }}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? `${modalId}-password-error` : undefined}
                    className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-12 pl-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button type="button" aria-label={t(field.visible ? "recovery.hidePassword" : "recovery.showPassword")}
                    disabled={isPending} onClick={() => field.setVisible((visible) => !visible)}
                    className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60">
                    <VisibilityIcon size={19} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
          {fieldError && <p id={`${modalId}-password-error`} className="mt-1.5 text-xs leading-4 text-ecoplaza-danger">{t(fieldError)}</p>}
          {feedback && <p role="alert" className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${feedbackClass}`}>{t(feedback.key)}</p>}
          <button type="submit" disabled={isPending}
            className="mt-5 flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-65">
            {isPending ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} aria-hidden="true" /> : <KeyRound size={18} strokeWidth={1.8} aria-hidden="true" />}
            {t(isPending ? "recovery.updating" : "recovery.updatePassword")}
          </button>
        </form>
      )}
    </dialog>
  );
}

export default ForgotPasswordModal;
