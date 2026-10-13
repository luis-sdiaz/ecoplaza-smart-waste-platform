import { lazy, Suspense, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Leaf, Lock, Mail } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { AuthErrorCode } from "../auth/authErrors";
import RegisterModal from "../components/auth/RegisterModal";
import "./LoginPage.css";

const EcoContainer3D = lazy(() => import("../components/auth/EcoContainer3D"));

const loginMetrics = [
  { value: "1.248", unit: "kg", label: "login.managedWaste" },
  { value: "8", unit: "", label: "login.activeSensors" },
  { value: "386", unit: "kg", label: "login.availableMaterial" },
];

type LoginValues = {
  email: string;
  password: string;
};

type LoginErrorKey =
  | "login.emailRequired"
  | "login.emailInvalid"
  | "login.passwordRequired";

type LoginErrors = Partial<Record<keyof LoginValues, LoginErrorKey>>;

type InternalDestination = {
  pathname: string;
  search: string;
  hash: string;
};

function getPostSignInDestination(state: unknown): InternalDestination | string {
  if (typeof state !== "object" || state === null || !("from" in state)) return "/";

  const from = state.from;
  if (typeof from !== "object" || from === null) return "/";

  const { pathname, search, hash } = from as Record<string, unknown>;
  const isInternalPath =
    typeof pathname === "string" &&
    pathname.startsWith("/") &&
    !pathname.startsWith("//") &&
    !pathname.includes("\\") &&
    !/^\/login(?:\/|$)/i.test(pathname);
  const hasValidSearch =
    typeof search === "string" && (search === "" || search.startsWith("?"));
  const hasValidHash =
    typeof hash === "string" && (hash === "" || hash.startsWith("#"));

  if (!isInternalPath || !hasValidSearch || !hasValidHash) return "/";

  return { pathname, search, hash };
}

function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "login.emailRequired";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "login.emailInvalid";
  }

  if (!values.password) errors.password = "login.passwordRequired";

  return errors;
}

function LoginPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [authErrorCode, setAuthErrorCode] = useState<AuthErrorCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const errors = hasSubmitted ? validateLogin(values) : {};
  const isBusy = isLoading || isSubmitting;

  const authErrorKey = authErrorCode === "invalid_credentials"
    ? "login.invalidCredentials"
    : authErrorCode === "email_not_confirmed"
      ? "login.emailNotConfirmed"
      : authErrorCode === "network_error"
        ? "login.networkError"
        : authErrorCode === "rate_limited"
          ? "login.rateLimited"
          : authErrorCode === "session_already_active"
            ? "login.sessionAlreadyActive"
            : "login.sessionError";

  const handleChange = (name: keyof LoginValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setAuthErrorCode(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading || isSubmittingRef.current) return;

    setHasSubmitted(true);
    setAuthErrorCode(null);

    const validationErrors = validateLogin(values);
    const firstInvalidField = (["email", "password"] as const).find((name) => validationErrors[name]);
    if (firstInvalidField) {
      const input = event.currentTarget.elements.namedItem(firstInvalidField);
      if (input instanceof HTMLInputElement) {
        // Wait for the error text and aria-describedby to render before focusing.
        requestAnimationFrame(() => {
          if (input.isConnected) input.focus({ preventScroll: true });
        });
      }
      return;
    }

    const rememberInput = event.currentTarget.elements.namedItem("remember");
    const remember = rememberInput instanceof HTMLInputElement && rememberInput.checked;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await signIn(values.email, values.password, remember);

      if (!result.ok) {
        setAuthErrorCode(result.error.code);
        return;
      }

      navigate(getPostSignInDestination(location.state), {
        replace: true,
        state: null,
      });
    } catch {
      setAuthErrorCode("unexpected_error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isLoading && isAuthenticated) {
    return (
      <Navigate
        to={getPostSignInDestination(location.state)}
        replace
        state={null}
      />
    );
  }

  return (
    <main
      lang={i18n.resolvedLanguage === "en" ? "en" : "es"}
      className="ecoplaza-login flex h-screen items-center justify-center bg-ecoplaza-background p-6"
    >
      <div className="ecoplaza-login-card relative isolate grid h-full max-h-[760px] min-h-0 w-full max-w-[1220px] grid-cols-[44%_56%] overflow-hidden rounded-[32px] border border-ecoplaza-border/80 bg-ecoplaza-surface">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1220 760"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="login-panel-green" x1="0" y1="0" x2="0.8" y2="1">
              <stop className="ecoplaza-login-green-deep" />
              <stop offset="1" stopColor="var(--color-ecoplaza-primary-dark)" />
            </linearGradient>
            <radialGradient id="login-panel-light" cx="0.42" cy="0.61" r="0.6">
              <stop stopColor="var(--color-ecoplaza-secondary)" stopOpacity="0.23" />
              <stop offset="1" stopColor="var(--color-ecoplaza-secondary)" stopOpacity="0" />
            </radialGradient>
            <path id="login-panel-curve" d="M0 0H474C492 134 541 151 536 306C526 492 595 517 645 760H0Z" />
          </defs>
          <use href="#login-panel-curve" fill="url(#login-panel-green)" />
          <use href="#login-panel-curve" fill="url(#login-panel-light)" />
        </svg>

        <section
          aria-labelledby="login-brand-title"
          className="relative flex min-h-0 flex-col px-9 py-7 text-white"
        >
          <div className="relative z-20 flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Leaf size={26} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">EcoPlaza</p>
              <p className="mt-1 text-xs text-white/75">
                {t("login.brandTagline")}
              </p>
            </div>
          </div>

          <div className="relative z-20 mt-6">
            <h2
              id="login-brand-title"
              className="text-[36px] leading-[1.2] font-semibold tracking-[-0.035em]"
            >
              {t("login.brandTitleFirst")}
              <br />
              {t("login.brandTitleSecond")}
            </h2>
            <p className="mt-3 max-w-[365px] text-[15px] leading-6 text-white/75">
              {t("login.brandDescription")}
            </p>
          </div>

          <div aria-hidden="true" className="ecoplaza-login-visual">
            <div className="ecoplaza-login-scene">
              <Suspense fallback={<div className="ecoplaza-login-scene-placeholder" />}>
                <EcoContainer3D />
              </Suspense>
            </div>
          </div>

          <dl className="relative z-20 grid shrink-0 grid-cols-3 gap-2.5">
            {loginMetrics.map(({ value, unit, label }) => (
              <div
                key={label}
                className="flex flex-col rounded-xl border border-white/10 bg-white/5 px-2.5 py-3"
              >
                <dt className="order-2 mt-1 text-[11px] leading-4 text-white/70">
                  {t(label)}
                </dt>
                <dd className="text-[22px] leading-7 font-semibold tracking-tight tabular-nums">
                  {value}
                  {unit && (
                    <span className="ml-1 text-sm font-normal text-white/80">
                      {unit}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="login-title"
          className="ecoplaza-login-form-panel relative flex items-center justify-center px-16 py-16"
        >
          <div className="relative z-20 w-full max-w-[400px] pb-1">
            <header>
              <h1
                id="login-title"
                className="text-[30px] font-semibold tracking-tight text-ecoplaza-text"
              >
                {t("login.title")}
              </h1>
              <p className="ecoplaza-login-secondary mt-2 text-sm leading-6 text-ecoplaza-text-muted">
                {t("login.description")}
              </p>
            </header>

            <form
              className="mt-7"
              noValidate
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-ecoplaza-text"
                >
                  {t("login.email")}
                </label>
                <div className="relative">
                  <Mail
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted"
                  />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("login.emailPlaceholder")}
                    required
                    disabled={isBusy}
                    value={values.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "login-email-error" : undefined}
                    className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-4 pl-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  />
                </div>
                {errors.email && (
                  <p id="login-email-error" className="mt-1 text-xs leading-4 text-ecoplaza-danger">
                    {t(errors.email)}
                  </p>
                )}
              </div>

              <div className="mt-5">
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium text-ecoplaza-text"
                >
                  {t("login.password")}
                </label>
                <div className="relative">
                  <Lock
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ecoplaza-text-muted"
                  />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="•••••••••••"
                    required
                    disabled={isBusy}
                    value={values.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "login-password-error" : undefined}
                    className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 px-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                    aria-controls="login-password"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  >
                    {showPassword ? (
                      <EyeOff size={19} strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <Eye size={19} strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="login-password-error" className="mt-1 text-xs leading-4 text-ecoplaza-danger">
                    {t(errors.password)}
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 text-xs">
                <label
                  htmlFor="login-remember"
                  className="ecoplaza-login-secondary flex cursor-pointer items-center gap-2.5 text-ecoplaza-text-muted"
                >
                  <input
                    id="login-remember"
                    name="remember"
                    type="checkbox"
                    disabled={isBusy}
                    className="ecoplaza-login-remember-checkbox h-4 w-4 cursor-pointer accent-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  />
                  {t("login.rememberMe")}
                </label>
                <a
                  href="#"
                  aria-disabled="true"
                  onClick={(event) => event.preventDefault()}
                  className="rounded font-medium text-ecoplaza-primary transition-colors hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
                >
                  {t("login.forgotPassword")}
                </a>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                aria-busy={isSubmitting}
                className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
              >
                {isLoading
                  ? t("login.restoringSession")
                  : isSubmitting
                    ? t("login.signingIn")
                    : t("login.submit")}
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
              {authErrorCode && (
                <p role="alert" className="mt-3 text-center text-xs leading-4 text-ecoplaza-danger">
                  {t(authErrorKey)}
                </p>
              )}
            </form>

            <p className="ecoplaza-login-secondary mt-4 text-center text-sm leading-5 text-ecoplaza-text-muted">
              {t("login.noAccount")} {" "}
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="cursor-pointer rounded font-semibold text-ecoplaza-primary transition-colors duration-150 hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
              >
                {t("login.createAccount")}
              </button>
            </p>
          </div>

          <footer className="ecoplaza-login-secondary absolute right-8 bottom-7 left-8 z-20 text-center text-xs text-ecoplaza-text-muted">
            {t("login.footer")}
          </footer>
        </section>
      </div>
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </main>
  );
}

export default LoginPage;
