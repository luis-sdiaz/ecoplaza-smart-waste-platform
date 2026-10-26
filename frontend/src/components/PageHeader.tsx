import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  testId?: string;
  className?: string;
}

function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
  testId = "page-header",
  className = "",
}: PageHeaderProps) {
  const actionContent = actions ?? children;

  return (
    <header
      data-testid={testId}
      className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`.trim()}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-sm font-medium text-ecoplaza-primary">{eyebrow}</p>
        )}

        <h1 className="mt-1 text-3xl font-semibold text-ecoplaza-text">
          {title}
        </h1>

        {description && (
          <p className="mt-2 text-sm text-ecoplaza-text-muted">{description}</p>
        )}
      </div>

      {actionContent && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {actionContent}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
