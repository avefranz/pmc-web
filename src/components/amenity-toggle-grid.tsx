import { cn } from "@/lib/utils/cn";
import { amenityIcon } from "@/lib/utils/amenity-icons";
import type { AmenityDefinition } from "@/lib/types";

export interface AmenityCategory {
  id: number;
  name: string;
}

export interface AmenityToggleGridProps {
  amenities: AmenityDefinition[];
  categories?: AmenityCategory[];
  presentSet: Set<number>;
  pending: Record<number, boolean>;
  onToggle: (id: number, isPresent: boolean) => void;
  compact?: boolean;
}

function AmenityIcon({ name, icon, isPresent }: { name: string; icon?: string; isPresent: boolean }) {
  const cls = cn("w-5 h-5 shrink-0", isPresent ? "text-fg" : "text-fg-subtle");

  if (icon && [...icon].length <= 2) {
    return <span className="text-lg leading-none">{icon}</span>;
  }
  if (icon?.startsWith("http")) {
    return <img src={icon} alt="" className="w-5 h-5 object-contain" />;
  }
  const Lucide = amenityIcon(name);
  if (Lucide) return <Lucide className={cls} strokeWidth={1.5} />;

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AmenityCard({ amenity, isPresent, isPending, onToggle, compact = false }: {
  amenity: AmenityDefinition;
  isPresent: boolean;
  isPending: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg border-2 text-left",
        "transition-all duration-150 select-none w-full",
        compact ? "px-2.5 py-1.5" : "px-4 py-3 rounded-xl gap-3",
        isPresent
          ? "border-fg bg-fg/[0.03] text-fg shadow-sm"
          : "border-border bg-bg-card text-fg-muted hover:border-fg-subtle hover:bg-bg-subtle",
        isPending && "cursor-wait opacity-60",
      )}
    >
      {isPresent && (
        <span className={cn(
          "absolute flex items-center justify-center rounded-full bg-fg font-bold text-bg-card",
          compact ? "right-1 top-1 h-3 w-3 text-[7px]" : "right-2 top-2 h-4 w-4 text-[9px]",
        )}>✓</span>
      )}
      {!compact && <AmenityIcon name={amenity.name} icon={amenity.icon} isPresent={isPresent} />}
      <span className={cn(
        "leading-snug truncate",
        compact ? "text-xs" : "text-sm",
        isPresent ? "font-medium text-fg" : "text-fg-muted",
      )}>
        {amenity.name}
      </span>
    </button>
  );
}

function CategoryGroup({ title, amenities, presentSet, pending, onToggle, compact = false }: {
  title?: string;
  amenities: AmenityDefinition[];
  presentSet: Set<number>;
  pending: Record<number, boolean>;
  onToggle: (id: number, isPresent: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div>
      {title && (
        <p className={cn("font-semibold uppercase tracking-wider text-fg-muted",
          compact ? "mb-1.5 text-[10px]" : "mb-2.5 text-xs")}>
          {title}
        </p>
      )}
      <div className={cn("grid gap-1.5",
        compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 gap-2 sm:grid-cols-3")}>
        {amenities.map((a) => (
          <AmenityCard
            key={a.id}
            amenity={a}
            isPresent={presentSet.has(a.id)}
            isPending={!!pending[a.id]}
            onToggle={() => onToggle(a.id, presentSet.has(a.id))}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

export function AmenityToggleGrid({ amenities, categories = [], presentSet, pending, onToggle, compact = false }: AmenityToggleGridProps) {
  const presentCount = amenities.filter((a) => presentSet.has(a.id)).length;
  if (!amenities.length) return null;

  if (!categories.length) {
    return (
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <CategoryGroup amenities={amenities} presentSet={presentSet} pending={pending} onToggle={onToggle} compact={compact} />
        <p className={cn("text-fg-muted", compact ? "text-[10px]" : "text-xs")}>
          {presentCount} of {amenities.length} amenities selected
        </p>
      </div>
    );
  }

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const grouped = new Map<number, AmenityDefinition[]>();
  const uncategorized: AmenityDefinition[] = [];

  for (const a of amenities) {
    if (a.categoryId != null && catMap.has(a.categoryId)) {
      if (!grouped.has(a.categoryId)) grouped.set(a.categoryId, []);
      grouped.get(a.categoryId)!.push(a);
    } else {
      uncategorized.push(a);
    }
  }

  const sections: { key: string; title: string; items: AmenityDefinition[] }[] = [];
  for (const cat of categories) {
    const items = grouped.get(cat.id);
    if (items?.length) sections.push({ key: String(cat.id), title: cat.name, items });
  }
  if (uncategorized.length) sections.push({ key: "other", title: sections.length ? "Other" : "", items: uncategorized });

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {sections.map((s) => (
        <CategoryGroup key={s.key} title={s.title || undefined} amenities={s.items} presentSet={presentSet} pending={pending} onToggle={onToggle} compact={compact} />
      ))}
      <p className={cn("text-fg-muted", compact ? "text-[10px]" : "text-xs")}>
        {presentCount} of {amenities.length} amenities selected
      </p>
    </div>
  );
}
