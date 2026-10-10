import { lazy, Suspense, useState } from "react";
import { ArrowRight, Eye, EyeOff, Leaf, Lock, Mail } from "lucide-react";
import RegisterModal from "../components/auth/RegisterModal";
import "./LoginPage.css";

const EcoContainer3D = lazy(() => import("../components/auth/EcoContainer3D"));

const loginMetrics = [
  { value: "1.248", unit: "kg", label: "Residuos gestionados" },
  { value: "8", unit: "", label: "Sensores activos" },
  { value: "386", unit: "kg", label: "Material disponible" },
];

function LoginPage() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main
      lang="es"
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
          className="relative flex min-h-0 flex-col px-9 py-7 text-ecoplaza-surface"
        >
          <div className="relative z-20 flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ecoplaza-surface/20 bg-ecoplaza-surface/10">
              <Leaf size={26} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">EcoPlaza</p>
              <p className="mt-1 text-xs text-ecoplaza-surface/75">
                Tecnología + sostenibilidad
              </p>
            </div>
          </div>

          <div className="relative z-20 mt-6">
            <h2
              id="login-brand-title"
              className="text-[36px] leading-[1.2] font-semibold tracking-[-0.035em]"
            >
              Gestión inteligente
              <br />
              de residuos
            </h2>
            <p className="mt-3 max-w-[365px] text-[15px] leading-6 text-ecoplaza-surface/75">
              Tecnología para una gestión de residuos más inteligente y
              sostenible.
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
                className="flex flex-col rounded-xl border border-ecoplaza-surface/10 bg-ecoplaza-surface/5 px-2.5 py-3"
              >
                <dt className="order-2 mt-1 text-[11px] leading-4 text-ecoplaza-surface/70">
                  {label}
                </dt>
                <dd className="text-[22px] leading-7 font-semibold tracking-tight tabular-nums">
                  {value}
                  {unit && (
                    <span className="ml-1 text-sm font-normal text-ecoplaza-surface/80">
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
          className="relative flex items-center justify-center px-16 py-16"
        >
          <div className="relative z-20 w-full max-w-[400px] pb-1">
            <header>
              <h1
                id="login-title"
                className="text-[30px] font-semibold tracking-tight text-ecoplaza-text"
              >
                Bienvenido de nuevo
              </h1>
              <p className="mt-2 text-sm leading-6 text-ecoplaza-text-muted">
                Ingresa tus datos para acceder a EcoPlaza.
              </p>
            </header>

            <form
              className="mt-7"
              onSubmit={(event) => event.preventDefault()}
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-ecoplaza-text"
                >
                  Correo electrónico
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
                    placeholder="usuario@correo.com"
                    className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 pr-4 pl-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium text-ecoplaza-text"
                >
                  Contraseña
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
                    className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 px-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 text-xs">
                <label
                  htmlFor="login-remember"
                  className="flex cursor-pointer items-center gap-2.5 text-ecoplaza-text-muted"
                >
                  <input
                    id="login-remember"
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  />
                  Recordarme
                </label>
                <a
                  href="#"
                  aria-disabled="true"
                  onClick={(event) => event.preventDefault()}
                  className="rounded font-medium text-ecoplaza-primary transition-colors hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type="submit"
                className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-ecoplaza-primary text-sm font-semibold text-ecoplaza-surface transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
              >
                Iniciar sesión
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </form>

            <p className="mt-4 text-center text-sm leading-5 text-ecoplaza-text-muted">
              ¿Aún no tienes una cuenta?{" "}
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="cursor-pointer rounded font-semibold text-ecoplaza-primary transition-colors duration-150 hover:text-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ecoplaza-primary"
              >
                Crear cuenta
              </button>
            </p>
          </div>

          <footer className="absolute right-8 bottom-7 left-8 z-20 text-center text-xs text-ecoplaza-text-muted">
            EcoPlaza · Gestión inteligente de residuos
          </footer>
        </section>
      </div>
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </main>
  );
}

export default LoginPage;
