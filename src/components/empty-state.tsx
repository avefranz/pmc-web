interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && (
        <div className="mb-4 text-fg-subtle text-4xl">{icon}</div>
      )}
      <h3 className="text-xl font-medium text-fg mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-fg-muted max-w-sm mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
