interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header>
      <p className="text-sm font-medium text-ecoplaza-primary">{eyebrow}</p>

      <h1 className="mt-1 text-3xl font-semibold text-ecoplaza-text">
        {title}
      </h1>

      <p className="mt-2 text-sm text-ecoplaza-text-muted">{description}</p>
    </header>
  );
}

export default PageHeader;
