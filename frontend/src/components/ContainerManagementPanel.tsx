import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  Box,
  CircleCheck,
  Database,
  LoaderCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  createContainer,
  listContainers,
  type Container,
  type ContainerErrorCode,
} from "../services/containerService";

type Feedback = {
  tone: "error" | "success";
  key: string;
};

function getContainerErrorKey(code: ContainerErrorCode): string {
  if (code === "unauthorized") return "containers.unauthorized";
  if (code === "invalid_code") return "containers.invalidCode";
  if (code === "duplicate_code") return "containers.duplicateCode";
  if (code === "network_error") return "containers.networkError";
  if (code === "permission_denied") return "containers.permissionError";
  return "containers.databaseError";
}

function ContainerManagementPanel() {
  const { t, i18n } = useTranslation();
  const requestRevisionRef = useRef(0);
  const isCreatingRef = useRef(false);
  const [containers, setContainers] = useState<Container[]>([]);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const isFormUnavailable = isCreating || isLoading || loadError !== null;

  const applyLoadResult = useCallback((
    result: Awaited<ReturnType<typeof listContainers>>,
    requestRevision: number,
  ) => {
    if (requestRevision !== requestRevisionRef.current) return;

    if (!result.ok) {
      setContainers([]);
      setLoadError(getContainerErrorKey(result.error.code));
      setIsLoading(false);
      return;
    }

    setContainers(result.data);
    setLoadError(null);
    setIsLoading(false);
  }, []);

  const loadUserContainers = useCallback(async () => {
    const requestRevision = ++requestRevisionRef.current;
    setIsLoading(true);
    setLoadError(null);

    const result = await listContainers();
    applyLoadResult(result, requestRevision);
  }, [applyLoadResult]);

  useEffect(() => {
    const requestRevision = ++requestRevisionRef.current;

    void listContainers().then((result) => {
      applyLoadResult(result, requestRevision);
    });

    return () => {
      requestRevisionRef.current += 1;
    };
  }, [applyLoadResult]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingRef.current || isLoading || loadError !== null) return;

    isCreatingRef.current = true;
    setIsCreating(true);
    setFeedback(null);
    const lifecycleRevision = requestRevisionRef.current;

    try {
      const result = await createContainer(code);
      if (lifecycleRevision !== requestRevisionRef.current) return;

      if (!result.ok) {
        setFeedback({ tone: "error", key: getContainerErrorKey(result.error.code) });
        return;
      }

      setContainers((current) => [...current, result.data]);
      setCode("");
      setFeedback({ tone: "success", key: "containers.createSuccess" });
    } catch {
      if (lifecycleRevision === requestRevisionRef.current) {
        setFeedback({ tone: "error", key: "containers.databaseError" });
      }
    } finally {
      isCreatingRef.current = false;
      if (lifecycleRevision === requestRevisionRef.current) {
        setIsCreating(false);
      }
    }
  };

  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const feedbackClass = feedback?.tone === "success"
    ? "border-ecoplaza-primary/30 bg-ecoplaza-primary/10 text-ecoplaza-primary"
    : "border-ecoplaza-danger/30 bg-ecoplaza-danger/10 text-ecoplaza-danger";

  return (
    <section className="mt-10" aria-labelledby="user-containers-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="user-containers-title" className="text-lg font-semibold text-ecoplaza-text">
              {t("containers.title")}
            </h2>
            <span className="rounded-full bg-ecoplaza-primary/10 px-2.5 py-1 text-[11px] font-semibold text-ecoplaza-primary">
              {t("containers.remoteData")}
            </span>
          </div>
          <p className="mt-1 text-sm text-ecoplaza-text-muted">
            {t("containers.description")}
          </p>
        </div>
        {!isLoading && !loadError && (
          <span className="shrink-0 text-sm font-medium text-ecoplaza-text-muted">
            {t("containers.count", { count: containers.length })}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4">
        <div className="min-h-48 rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
          {isLoading ? (
            <div role="status" className="flex min-h-38 items-center justify-center gap-3 text-sm text-ecoplaza-text-muted">
              <LoaderCircle className="animate-spin text-ecoplaza-primary" size={20} strokeWidth={1.8} aria-hidden="true" />
              {t("containers.loading")}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-38 flex-col items-center justify-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ecoplaza-danger/10 text-ecoplaza-danger">
                <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-3 max-w-md text-sm text-ecoplaza-text-muted">{t(loadError)}</p>
              <button
                type="button"
                onClick={() => void loadUserContainers()}
                className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-ecoplaza-border px-3 py-2 text-sm font-medium text-ecoplaza-text transition-colors hover:border-ecoplaza-primary hover:text-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
              >
                <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
                {t("containers.retry")}
              </button>
            </div>
          ) : containers.length === 0 ? (
            <div className="flex min-h-38 flex-col items-center justify-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ecoplaza-background text-ecoplaza-primary">
                <Box size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ecoplaza-text">{t("containers.emptyTitle")}</h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-ecoplaza-text-muted">{t("containers.emptyDescription")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {containers.map((container) => (
                <article key={container.id} className="rounded-xl border border-ecoplaza-border bg-ecoplaza-background/55 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ecoplaza-primary/10 text-ecoplaza-primary">
                      <Database size={18} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-ecoplaza-text">{container.code}</h3>
                      <p className="mt-1 text-xs text-ecoplaza-text-muted">
                        {t("containers.createdAt", {
                          date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(container.createdAt)),
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 break-all font-mono text-[10px] leading-4 text-ecoplaza-text-muted" title={container.id}>
                    {container.id}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="self-start rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-5">
          <h3 className="text-base font-semibold text-ecoplaza-text">{t("containers.registerTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-ecoplaza-text-muted">{t("containers.registerDescription")}</p>
          <label htmlFor="container-code" className="mt-4 block text-sm font-medium text-ecoplaza-text">
            {t("containers.codeLabel")}
          </label>
          <input
            id="container-code"
            name="containerCode"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            required
            disabled={isFormUnavailable}
            value={code}
            onChange={(event) => { setCode(event.target.value); setFeedback(null); }}
            placeholder={t("containers.codePlaceholder")}
            aria-invalid={feedback?.tone === "error"}
            aria-describedby={feedback ? "container-form-feedback" : "container-code-help"}
            className="mt-2 h-11 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background/70 px-3 font-mono text-sm uppercase text-ecoplaza-text transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-ecoplaza-text-muted/75 focus-visible:border-ecoplaza-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          {!feedback && (
            <p id="container-code-help" className="mt-1.5 text-xs leading-4 text-ecoplaza-text-muted">
              {t("containers.codeHelp")}
            </p>
          )}
          {feedback && (
            <p
              id="container-form-feedback"
              role={feedback.tone === "error" ? "alert" : "status"}
              className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5 ${feedbackClass}`}
            >
              {feedback.tone === "success"
                ? <CircleCheck className="mt-0.5 shrink-0" size={15} strokeWidth={1.8} aria-hidden="true" />
                : <AlertTriangle className="mt-0.5 shrink-0" size={15} strokeWidth={1.8} aria-hidden="true" />}
              <span>{t(feedback.key)}</span>
            </p>
          )}
          <button
            type="submit"
            disabled={isFormUnavailable}
            className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ecoplaza-primary px-4 text-sm font-semibold text-ecoplaza-on-primary transition-colors hover:bg-ecoplaza-primary-dark focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ecoplaza-primary disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isCreating
              ? <LoaderCircle className="animate-spin" size={17} strokeWidth={1.8} aria-hidden="true" />
              : <Plus size={17} strokeWidth={1.8} aria-hidden="true" />}
            {t(isCreating ? "containers.registering" : "containers.register")}
          </button>
        </form>
      </div>
    </section>
  );
}

export default ContainerManagementPanel;
