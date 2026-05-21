interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-up">
      {icon && (
        <div className="relative mb-7">
          {/* Dot grid backdrop */}
          <svg
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.18] text-muted-foreground pointer-events-none"
            width="108"
            height="108"
            viewBox="0 0 108 108"
          >
            {[0, 1, 2, 3, 4].map((row) =>
              [0, 1, 2, 3, 4].map((col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={6 + col * 24}
                  cy={6 + row * 24}
                  r="1.5"
                  fill="currentColor"
                />
              ))
            )}
          </svg>

          {/* Outer ring */}
          <div className="absolute inset-[-18px] rounded-[30px] bg-muted/30 dark:bg-muted/20" />
          {/* Inner ring */}
          <div className="absolute inset-[-9px] rounded-[24px] bg-muted/55 dark:bg-muted/35" />

          {/* Icon card */}
          <div className="relative w-[68px] h-[68px] rounded-[18px] bg-background border border-border shadow-sm flex items-center justify-center">
            <div className="text-muted-foreground [&>svg]:size-[26px] [&>svg]:stroke-[1.5]">
              {icon}
            </div>
          </div>
        </div>
      )}

      <p className="text-[15px] font-semibold text-foreground tracking-tight mb-1">{title}</p>

      {description && (
        <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px] mb-6">
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}
