import type React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, children, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <div className="text-sm text-muted-foreground mt-2">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action}
      </div>
    </div>
  );
}
