import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle,
  Lock, Mail, RefreshCw, ShieldCheck, User, X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import type { AuthErrorCode } from "../../auth/authErrors";
import { resendSignUpOtp, signUpWithPassword } from "../../auth/supabaseAuth";
import "./RegisterModal.css";

type RegisterModalProps = { isOpen: boolean; onClose: () => void };
type RegisterFieldName = "fullName" | "email" | "password" | "confirmPassword";
type RegisterValues = Record<RegisterFieldName, string>;
type RegisterErrorKey =
  | "register.fullNameRequired" | "register.fullNameLength"
  | "register.emailRequired" | "register.emailInvalid"
  | "register.passwordRequired" | "register.passwordLength"
  | "register.confirmPasswordRequired" | "register.passwordMismatch";
type RegisterErrors = Partial<Record<RegisterFieldName, RegisterErrorKey>>;
type RegisterStep = "details" | "verification";
type Feedback = { tone: "error" | "success"; key: string };

const OTP_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;
const initialValues: RegisterValues = {
  fullName: "", email: "", password: "", confirmPassword: "",
};

function normalizeFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, " ");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateRegistration(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  const fullName = normalizeFullName(values.fullName);
  const email = values.email.trim();

  if (!fullName) errors.fullName = "register.fullNameRequired";
  else if (fullName.length < 2 || fullName.length > 60) errors.fullName = "register.fullNameLength";

  if (!email) errors.email = "register.emailRequired";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "register.emailInvalid";

  if (!values.password) errors.password = "register.passwordRequired";
  else if (values.password.length < 8) errors.password = "register.passwordLength";

  if (!values.confirmPassword) errors.confirmPassword = "register.confirmPasswordRequired";
  else if (values.password && values.password !== values.confirmPassword) {
    errors.confirmPassword = "register.passwordMismatch";
  }

  return errors;
}

function getSignUpErrorKey(code: AuthErrorCode): string {
  if (code === "network_error") return "register.networkError";
  if (code === "rate_limited") return "register.rateLimited";
  if (code === "session_already_active") return "register.sessionAlreadyActive";
  if (code === "invalid_full_name") return "register.fullNameLength";
  if (code === "user_already_registered") return "register.registrationUnavailable";
  return "register.registrationError";
}

function getOtpErrorKey(code: AuthErrorCode): string {
  if (code === "otp_invalid") return "register.otpIncorrect";
  if (code === "otp_expired") return "register.otpExpired";
  if (code === "network_error") return "register.networkError";
  if (code === "rate_limited") return "register.rateLimited";
  if (code === "session_already_active") return "register.sessionAlreadyActive";
  return "register.verificationError";
}

function getResendErrorKey(code: AuthErrorCode): string {
  if (code === "network_error") return "register.networkError";
  if (code === "rate_limited") return "register.resendRateLimited";
  return "register.resendError";
}

function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const { t, i18n } = useTranslation();
  const { verifySignUpOtp } = useAuth();
  const formId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const operationRevisionRef = useRef(0);
  const isSignUpPendingRef = useRef(false);
  const isVerificationPendingRef = useRef(false);
  const isResendPendingRef = useRef(false);
  const [step, setStep] = useState<RegisterStep>("details");
  const [values, setValues] = useState(initialValues);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSignUpPending, setIsSignUpPending] = useState(false);
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [isResendPending, setIsResendPending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const errors = hasSubmitted ? validateRegistration(values) : {};
  const isOtpBusy = isVerificationPending || isResendPending;

  const resetModal = () => {
    operationRevisionRef.current += 1;
    isSignUpPendingRef.current = false;
    isVerificationPendingRef.current = false;
    isResendPendingRef.current = false;
    setStep("details");
    setValues(initialValues);
    setHasSubmitted(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPendingEmail("");
    setOtp("");
    setOtpError(null);
    setFeedback(null);
    setIsSignUpPending(false);
    setIsVerificationPending(false);
    setIsResendPending(false);
    setResendSeconds(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleRegistrationChange = (name: RegisterFieldName, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSignUpPendingRef.current) return;
    setHasSubmitted(true);
    setFeedback(null);

    const validationErrors = validateRegistration(values);
    const fieldOrder: RegisterFieldName[] = ["fullName", "email", "password", "confirmPassword"];
    const firstInvalidField = fieldOrder.find((name) => validationErrors[name]);
    if (firstInvalidField) {
      const input = event.currentTarget.elements.namedItem(firstInvalidField);
      if (input instanceof HTMLInputElement) {
        requestAnimationFrame(() => {
          if (input.isConnected) input.focus({ preventScroll: true });
        });
      }
      return;
    }

    const fullName = normalizeFullName(values.fullName);
    const email = normalizeEmail(values.email);
    const operationRevision = operationRevisionRef.current;
    isSignUpPendingRef.current = true;
    setIsSignUpPending(true);

    try {
      const result = await signUpWithPassword({
        email, password: values.password, fullName, persistence: "temporary",
      });
      if (operationRevision !== operationRevisionRef.current) return;
      if (!result.ok) {
        setFeedback({ tone: "error", key: getSignUpErrorKey(result.error.code) });
        return;
      }

      setValues({ fullName, email, password: "", confirmPassword: "" });
      if (result.data.confirmationRequired) {
        setPendingEmail(email);
        setOtp("");
        setOtpError(null);
        setFeedback({ tone: "success", key: "register.codeSent" });
        setResendSeconds(RESEND_COOLDOWN_SECONDS);
        setStep("verification");
      }
    } catch {
      if (operationRevision === operationRevisionRef.current) {
        setFeedback({ tone: "error", key: "register.registrationError" });
      }
    } finally {
      isSignUpPendingRef.current = false;
      if (operationRevision === operationRevisionRef.current) setIsSignUpPending(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isVerificationPendingRef.current || isResendPendingRef.current) return;
    const normalizedOtp = otp.replace(/\D/g, "");
    setFeedback(null);
    if (normalizedOtp.length !== OTP_LENGTH) {
      setOtpError("register.otpLength");
      otpInputRef.current?.focus({ preventScroll: true });
      return;
    }

    const operationRevision = operationRevisionRef.current;
    isVerificationPendingRef.current = true;
    setIsVerificationPending(true);
    setOtpError(null);
    try {
      const result = await verifySignUpOtp(pendingEmail, normalizedOtp);
      if (operationRevision !== operationRevisionRef.current) return;
      if (!result.ok) {
        setFeedback({ tone: "error", key: getOtpErrorKey(result.error.code) });
        return;
      }
      setOtp("");
      setPendingEmail("");
      setValues(initialValues);
      setFeedback({ tone: "success", key: "register.verificationSuccess" });
    } catch {
      if (operationRevision === operationRevisionRef.current) {
        setFeedback({ tone: "error", key: "register.verificationError" });
      }
    } finally {
      isVerificationPendingRef.current = false;
      if (operationRevision === operationRevisionRef.current) setIsVerificationPending(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || isVerificationPendingRef.current || isResendPendingRef.current || !pendingEmail) return;
    const operationRevision = operationRevisionRef.current;
    isResendPendingRef.current = true;
    setIsResendPending(true);
    setFeedback(null);
    try {
      const result = await resendSignUpOtp({ email: pendingEmail });
      if (operationRevision !== operationRevisionRef.current) return;
      if (!result.ok) {
        setFeedback({ tone: "error", key: getResendErrorKey(result.error.code) });
        if (result.error.code === "rate_limited") setResendSeconds(RESEND_COOLDOWN_SECONDS);
        return;
      }
      setOtp("");
      setOtpError(null);
      setFeedback({ tone: "success", key: "register.codeResent" });
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      requestAnimationFrame(() => otpInputRef.current?.focus({ preventScroll: true }));
    } catch {
      if (operationRevision === operationRevisionRef.current) {
        setFeedback({ tone: "error", key: "register.resendError" });
      }
    } finally {
      isResendPendingRef.current = false;
      if (operationRevision === operationRevisionRef.current) setIsResendPending(false);
    }
  };

  const handleBack = () => {
    if (isOtpBusy) return;
    setStep("details");
    setPendingEmail("");
    setOtp("");
    setOtpError(null);
    setFeedback(null);
    setResendSeconds(0);
    setHasSubmitted(false);
    requestAnimationFrame(() => firstInputRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    firstInputRef.current?.focus();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (step === "verification") {
      requestAnimationFrame(() => otpInputRef.current?.focus({ preventScroll: true }));
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen || step !== "verification" || resendSeconds <= 0) return;
    const timeoutId = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, resendSeconds, step]);

  useEffect(() => () => { operationRevisionRef.current += 1; }, []);

  if (!isOpen) return null;

  const registerFields = [
    { name: "fullName" as const, label: t("register.fullName"), type: "text", autoComplete: "name", placeholder: t("register.fullNamePlaceholder"), icon: User },
    { name: "email" as const, label: t("register.email"), type: "email", autoComplete: "email", placeholder: t("register.emailPlaceholder"), icon: Mail },
    { name: "password" as const, label: t("register.password"), type: "password", autoComplete: "new-password", placeholder: "•••••••••••", icon: Lock },
    { name: "confirmPassword" as const, label: t("register.confirmPassword"), type: "password", autoComplete: "new-password", placeholder: "•••••••••••", icon: Lock },
  ];
  const feedbackClass = feedback?.tone === "success"
    ? "border-ecoplaza-primary/30 bg-ecoplaza-primary/10 text-ecoplaza-primary"
    : "border-ecoplaza-danger/30 bg-ecoplaza-danger/10 text-ecoplaza-danger";

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      aria-describedby={`${formId}-description`}
      lang={i18n.resolvedLanguage === "en" ? "en" : "es"}
      className="ecoplaza-register-modal px-8 py-7 text-ecoplaza-text"
      onCancel={(event) => { event.preventDefault(); handleClose(); }}
    >
      <button type="button" aria-label={t("register.close")} onClick={handleClose}
        className="absolute top-5 right-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary">
        <X size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <header>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-ecoplaza-primary/10 text-ecoplaza-primary">
          {step === "details" ? <User size={22} strokeWidth={1.8} aria-hidden="true" /> : <ShieldCheck size={23} strokeWidth={1.8} aria-hidden="true" />}
        </div>
        <h2 id={`${formId}-title`} className="pr-10 text-[28px] leading-9 font-semibold tracking-tight">
          {t(step === "details" ? "register.title" : "register.verifyTitle")}
        </h2>
        <p id={`${formId}-description`} className="mt-1.5 text-sm leading-5 text-ecoplaza-text-muted">
          {step === "details" ? t("register.description") : t("register.verifyDescription", { email: pendingEmail })}
        </p>
      </header>

      {step === "details" ? (
        <form className="mt-5" noValidate onSubmit={handleSubmit}>
          <div className="space-y-3">
            {registerFields.map(({ name, label, type, autoComplete, placeholder, icon: Icon }, index) => {
              const isPassword = type === "password";
              const isVisible = name === "password" ? showPassword : showConfirmPassword;
              const VisibilityIcon = isVisible ? EyeOff : Eye;
              return (
                <div key={name}>
                  <label htmlFor={`${formId}-${name}`} className="mb-1.5 block text-sm font-medium text-ecoplaza-text">{label}</label>
                  <div className="relative">
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted" />
                    <input
                      ref={index === 0 ? firstInputRef : undefined}
                      id={`${formId}-${name}`} name={name}
                      type={isPassword && isVisible ? "text" : type}
                      autoComplete={autoComplete} placeholder={placeholder}
                      minLength={isPassword ? 8 : undefined} required disabled={isSignUpPending}
                      value={values[name]}
                      onChange={(event) => handleRegistrationChange(name, event.target.value)}
                      aria-invalid={Boolean(errors[name])}
                      aria-describedby={errors[name] ? `${formId}-${name}-error` : undefined}
                      className={`h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 ${isPassword ? "pr-12" : "pr-4"} pl-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                    {isPassword && (
                      <button type="button" aria-label={t(isVisible ? "register.hidePassword" : "register.showPassword")}
                        aria-controls={`${formId}-${name}`} disabled={isSignUpPending}
                        onClick={() => name === "password" ? setShowPassword((visible) => !visible) : setShowConfirmPassword((visible) => !visible)}
                        className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60">
                        <VisibilityIcon size={19} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {errors[name] && <p id={`${formId}-${name}-error`} className="mt-1 text-xs leading-4 text-ecoplaza-danger">{t(errors[name])}</p>}
                </div>
              );
            })}
          </div>

          {feedback && <p role="alert" className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${feedbackClass}`}>{t(feedback.key)}</p>}
          <button type="submit" disabled={isSignUpPending}
            className="mt-5 flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-65">
            {isSignUpPending ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} aria-hidden="true" /> : <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />}
            {t(isSignUpPending ? "register.creatingAccount" : "register.submit")}
          </button>
        </form>
      ) : (
        <form className="mt-6" noValidate onSubmit={handleVerify}>
          <label htmlFor={`${formId}-otp`} className="mb-1.5 block text-sm font-medium text-ecoplaza-text">{t("register.otpLabel")}</label>
          <div className="relative">
            <ShieldCheck size={19} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted" />
            <input
              ref={otpInputRef} id={`${formId}-otp`} name="otp" type="text"
              inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}"
              maxLength={OTP_LENGTH} placeholder={t("register.otpPlaceholder")}
              required disabled={isOtpBusy} value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
                setOtpError(null); setFeedback(null);
              }}
              aria-invalid={Boolean(otpError)}
              aria-describedby={otpError ? `${formId}-otp-error` : `${formId}-otp-help`}
              className="h-14 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-4 pl-12 text-center font-mono text-xl tracking-[0.32em] text-ecoplaza-text transition-colors placeholder:tracking-normal placeholder:text-ecoplaza-text-muted/60 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          {otpError
            ? <p id={`${formId}-otp-error`} className="mt-1 text-xs leading-4 text-ecoplaza-danger">{t(otpError)}</p>
            : <p id={`${formId}-otp-help`} className="mt-1.5 text-xs leading-4 text-ecoplaza-text-muted">{t("register.otpHelp")}</p>}

          {feedback && (
            <div role={feedback.tone === "error" ? "alert" : "status"} aria-live="polite"
              className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5 ${feedbackClass}`}>
              {feedback.tone === "success" && <CheckCircle2 className="mt-0.5 shrink-0" size={16} strokeWidth={1.8} aria-hidden="true" />}
              <span>{t(feedback.key)}</span>
            </div>
          )}

          <button type="submit" disabled={isOtpBusy}
            className="mt-5 flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-65">
            {isVerificationPending ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} aria-hidden="true" /> : <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />}
            {t(isVerificationPending ? "register.verifying" : "register.verifySubmit")}
          </button>
          <button type="button" disabled={isOtpBusy || resendSeconds > 0} onClick={() => void handleResend()}
            className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold text-ecoplaza-primary transition-colors hover:bg-ecoplaza-primary/8 hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:text-ecoplaza-text-muted disabled:opacity-70">
            {isResendPending ? <LoaderCircle className="animate-spin" size={16} strokeWidth={1.8} aria-hidden="true" /> : <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />}
            {isResendPending ? t("register.resending") : resendSeconds > 0 ? t("register.resendIn", { seconds: resendSeconds }) : t("register.resend")}
          </button>
          <button type="button" disabled={isOtpBusy} onClick={handleBack}
            className="mt-1 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm text-ecoplaza-text-muted transition-colors hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60">
            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            {t("register.back")}
          </button>
        </form>
      )}

      {step === "details" && (
        <p className="mt-3 text-center text-sm leading-5 text-ecoplaza-text-muted">
          {t("register.hasAccount")} {" "}
          <button type="button" onClick={handleClose}
            className="cursor-pointer rounded font-semibold text-ecoplaza-primary transition-colors duration-150 hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary">
            {t("register.signIn")}
          </button>
        </p>
      )}
    </dialog>
  );
}

export default RegisterModal;
