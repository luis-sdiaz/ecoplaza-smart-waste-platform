import { ArrowRight, Eye, Leaf, Lock, Mail } from "lucide-react";

const loginMetrics = [
  { value: "1.248", unit: "kg", label: "Residuos gestionados" },
  { value: "8", unit: "", label: "Sensores activos" },
  { value: "386", unit: "kg", label: "Material disponible" },
];

function LoginPage() {
  return (
    <main
      lang="es"
      className="flex h-screen items-center justify-center bg-ecoplaza-background p-6"
    >
      <div className="relative isolate grid h-full max-h-[680px] min-h-0 w-full max-w-[1220px] grid-cols-[44%_56%] overflow-hidden rounded-[32px] border border-ecoplaza-border/80 bg-ecoplaza-surface shadow-lg shadow-ecoplaza-primary-dark/5">
        {/* Decorative curves join both panels without entering the form. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-48 left-[44%] z-10 h-[420px] w-40 -translate-x-1/3 -rotate-18 rounded-[50%] bg-ecoplaza-surface"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-44 left-[44%] z-10 h-[440px] w-44 -translate-x-1/2 -rotate-24 rounded-[50%] bg-ecoplaza-primary"
        />

        <section
          aria-labelledby="login-brand-title"
          className="relative flex min-h-0 flex-col bg-ecoplaza-primary px-10 py-8 text-ecoplaza-surface"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-52 -left-48 h-[520px] w-[520px] rounded-full bg-ecoplaza-primary-dark/30"
          />

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

          <div className="relative z-20 mt-10">
            <h2
              id="login-brand-title"
              className="text-[36px] leading-[1.2] font-semibold tracking-[-0.035em]"
            >
              Gestión inteligente
              <br />
              de residuos
            </h2>
            <p className="mt-4 max-w-[350px] text-[15px] leading-6 text-ecoplaza-surface/80">
              Tecnología para una gestión de residuos más inteligente y
              sostenible.
            </p>
          </div>

          {/* CSS-only illustration: a leaf, circular paths and connected data. */}
          <div
            aria-hidden="true"
            className="pointer-events-none relative z-20 flex min-h-0 flex-1 items-center justify-center"
          >
            <div className="relative h-60 w-[300px] scale-90 opacity-70">
              <div className="absolute top-3 left-11 h-52 w-52 rounded-full border border-ecoplaza-surface/15" />
              <div className="absolute top-10 left-[72px] h-[152px] w-[152px] rounded-full border border-ecoplaza-surface/15" />
              <div className="absolute top-3 left-11 h-52 w-52 rotate-35 rounded-full border border-ecoplaza-surface/30 border-b-transparent border-l-transparent" />
              <div className="absolute top-[68px] left-[112px] h-28 w-20 rotate-15 rounded-[85%_0_85%_0] border border-ecoplaza-surface/25 bg-ecoplaza-secondary/20">
                <div className="absolute top-4 left-[37px] h-24 w-px rotate-35 bg-ecoplaza-surface/30" />
                <div className="absolute top-12 left-7 h-px w-7 rotate-10 bg-ecoplaza-surface/25" />
                <div className="absolute top-[68px] left-5 h-px w-6 rotate-75 bg-ecoplaza-surface/25" />
              </div>
              <div className="absolute top-9 left-[68px] h-3 w-3 rounded-full border border-ecoplaza-surface/40 bg-ecoplaza-secondary/40" />
              <div className="absolute top-[184px] left-[207px] h-2.5 w-2.5 rounded-full bg-ecoplaza-surface/40" />
              <div className="absolute top-[165px] left-9 h-px w-12 -rotate-25 bg-ecoplaza-surface/25" />
              <div className="absolute top-[175px] left-8 h-2 w-2 rounded-full bg-ecoplaza-surface/35" />
              <div className="absolute top-[73px] right-7 h-px w-11 rotate-20 bg-ecoplaza-surface/25" />
              <div className="absolute top-16 right-0 flex h-10 w-16 items-end justify-center gap-1.5 rounded-xl border border-ecoplaza-surface/20 bg-ecoplaza-primary-dark/20 pb-3">
                <div className="h-2 w-1 rounded-full bg-ecoplaza-surface/35" />
                <div className="h-3.5 w-1 rounded-full bg-ecoplaza-surface/35" />
                <div className="h-2.5 w-1 rounded-full bg-ecoplaza-surface/35" />
              </div>
              <div className="absolute top-2 right-12 h-1 w-1 rounded-full bg-ecoplaza-surface/30" />
              <div className="absolute bottom-3 left-28 h-1 w-1 rounded-full bg-ecoplaza-surface/30" />
            </div>
          </div>

          <dl className="relative z-20 grid grid-cols-3 gap-3">
            {loginMetrics.map(({ value, unit, label }) => (
              <div
                key={label}
                className="flex flex-col rounded-2xl border border-ecoplaza-surface/15 bg-ecoplaza-surface/10 px-3 py-3"
              >
                <dt className="order-2 mt-1.5 text-[11px] leading-4 text-ecoplaza-surface/80">
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
          className="relative flex items-center justify-center bg-ecoplaza-surface px-16 py-16"
        >
          <div className="relative z-20 w-full max-w-[400px]">
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
                    type="password"
                    autoComplete="current-password"
                    placeholder="•••••••••••"
                    className="h-12 w-full rounded-2xl border border-ecoplaza-border bg-ecoplaza-background/70 px-12 text-sm text-ecoplaza-text transition-colors placeholder:text-ecoplaza-text-muted/80 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
                  />
                  <Eye
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ecoplaza-text-muted"
                  />
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
          </div>

          <footer className="absolute right-8 bottom-7 left-8 z-20 text-center text-xs text-ecoplaza-text-muted">
            EcoPlaza · Gestión inteligente de residuos
          </footer>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
