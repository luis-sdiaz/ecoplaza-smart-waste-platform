import { useTranslation } from "react-i18next";

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm font-medium text-ecoplaza-primary">Error 404</p>

        <h1 className="mt-2 text-3xl font-semibold text-ecoplaza-text">
          {t("errors.notFound")}
        </h1>

        <p className="mt-2 text-sm text-ecoplaza-text-muted">
          {t("errors.notFoundDescription")}
        </p>
      </div>
    </section>
  );
}

export default NotFoundPage;
