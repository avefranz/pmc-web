export function formatThb(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (!isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (!isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (!isFinite(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function multiLangText(obj: Record<string, string> | undefined | null): string {
  if (!obj) return "";
  return obj["en"] ?? obj["th"] ?? Object.values(obj)[0] ?? "";
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// UX-74: format raw VisaType enum values into human-readable labels
const VISA_LABELS: Record<string, string> = {
  VisaExempt:       "Visa Exempt",
  Tourist:          "Tourist Visa",
  NonImmigrantB:    "Non-Immigrant B",
  NonImmigrantO:    "Non-Immigrant O",
  NonImmigrantOA:   "Non-Immigrant O-A",
  Education:        "Education Visa",
  SpecialTourist:   "Special Tourist Visa",
  Other:            "Other",
};
export function formatVisaType(visa: string | null | undefined): string {
  if (!visa) return "—";
  return VISA_LABELS[visa] ?? visa;
}

export function changePercentColor(pct: number): string {
  if (pct > 0) return "text-green-600";
  if (pct < 0) return "text-red-500";
  return "text-muted-foreground";
}
