import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatThb, formatDate } from "@/lib/utils/format";
import { InvoiceStatus } from "@/lib/types/enums";
import type { PaymentRecordDto, InvoiceDto } from "@/lib/types";

const INVOICE_TYPE_LABEL: Record<string, string> = {
  Deposit: "Security deposit",
  Utilities: "Utilities",
  Cleaning: "Cleaning fee",
  Damage: "Damage fee",
  Other: "Other charge",
};

/**
 * Derive the most pressing payment status from an existing list of payments.
 * Pure client-side derivation — works without backend-provided `paymentHealth`.
 *
 *  - `ok`               — no rent due in next 14 days, no overdue
 *  - `upcoming`         — rent due in 7–14 days
 *  - `dueSoon`          — rent due in 1–6 days
 *  - `dueToday`         — rent due today (0 days)
 *  - `overdueMinor`     — 1–6 days overdue
 *  - `overdueSerious`   — 7–13 days overdue
 *  - `overdueCritical`  — 14+ days overdue (termination eligible)
 */
export type PaymentStage =
  | "none"
  | "ok"
  | "upcoming"
  | "dueSoon"
  | "dueToday"
  | "overdueMinor"
  | "overdueSerious"
  | "overdueCritical";

export interface PaymentHealth {
  stage: PaymentStage;
  nextDuePayment: PaymentRecordDto | null;
  oldestOverduePayment: PaymentRecordDto | null;
  daysOverdue: number;
  daysUntilDue: number;
  totalOverdueAmount: number;
  overdueCount: number;
}

const MS_PER_DAY = 86_400_000;

export function computePaymentHealth(payments: PaymentRecordDto[]): PaymentHealth {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const unpaidRent = payments
    .filter((p) => p.type === "MonthlyRent" && p.status !== "Paid" && p.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  if (unpaidRent.length === 0) {
    return {
      stage: "none",
      nextDuePayment: null,
      oldestOverduePayment: null,
      daysOverdue: 0,
      daysUntilDue: 0,
      totalOverdueAmount: 0,
      overdueCount: 0,
    };
  }

  const overdue = unpaidRent.filter((p) => new Date(p.dueDate!).getTime() < todayMs);
  const oldestOverdue = overdue[0] ?? null;
  const nextUnpaid = unpaidRent[0];

  const overdueAmount = overdue.reduce((sum, p) => sum + p.amount, 0);

  if (oldestOverdue) {
    const days = Math.floor((todayMs - new Date(oldestOverdue.dueDate!).getTime()) / MS_PER_DAY);
    const stage: PaymentStage =
      days >= 14 ? "overdueCritical" : days >= 7 ? "overdueSerious" : "overdueMinor";
    return {
      stage,
      nextDuePayment: nextUnpaid,
      oldestOverduePayment: oldestOverdue,
      daysOverdue: days,
      daysUntilDue: 0,
      totalOverdueAmount: overdueAmount,
      overdueCount: overdue.length,
    };
  }

  // Not overdue — check how close the next payment is
  const daysUntil = Math.ceil((new Date(nextUnpaid.dueDate!).getTime() - todayMs) / MS_PER_DAY);
  const stage: PaymentStage =
    daysUntil === 0 ? "dueToday"
      : daysUntil <= 6 ? "dueSoon"
      : daysUntil <= 14 ? "upcoming"
      : "ok";

  return {
    stage,
    nextDuePayment: nextUnpaid,
    oldestOverduePayment: null,
    daysOverdue: 0,
    daysUntilDue: daysUntil,
    totalOverdueAmount: 0,
    overdueCount: 0,
  };
}

/**
 * Banner shown to the **tenant** with the most pressing payment status.
 *
 * Renders nothing when stage = "none" or "ok".
 *
 * Stage → visual:
 *  - upcoming/dueSoon → neutral blue (informational reminder)
 *  - dueToday         → warning amber (urgent reminder)
 *  - overdueMinor     → warning amber (action needed)
 *  - overdueSerious   → danger red (warning of consequences)
 *  - overdueCritical  → danger red (termination warning)
 */
export function TenantPaymentBanner({
  health,
  onPay,
  className,
}: {
  health: PaymentHealth;
  onPay?: () => void;
  className?: string;
}) {
  if (health.stage === "none" || health.stage === "ok") return null;

  const { stage, nextDuePayment, oldestOverduePayment, daysOverdue, daysUntilDue, totalOverdueAmount, overdueCount } = health;
  const isOverdue = stage.startsWith("overdue");
  const payment = isOverdue ? oldestOverduePayment! : nextDuePayment!;

  const palette = {
    upcoming:        "bg-bg-card border-border text-fg",
    dueSoon:         "bg-warning/5 border-warning/20 text-fg",
    dueToday:        "bg-warning/10 border-warning/30 text-fg",
    overdueMinor:    "bg-warning/10 border-warning/30 text-fg",
    overdueSerious:  "bg-danger/10 border-danger/30 text-fg",
    overdueCritical: "bg-danger/15 border-danger/40 text-fg",
  }[stage] ?? "bg-bg-card border-border";

  const Icon = isOverdue ? AlertCircle : stage === "dueToday" || stage === "dueSoon" ? Clock : CheckCircle2;
  const iconColor =
    stage === "overdueCritical" || stage === "overdueSerious" ? "text-danger"
      : stage === "overdueMinor" || stage === "dueToday" || stage === "dueSoon" ? "text-warning"
      : "text-fg-muted";

  let headline: string;
  let body: string;

  switch (stage) {
    case "upcoming":
      headline = `Payment coming up in ${daysUntilDue} days`;
      body = `${formatThb(payment.amount)} due on ${formatDate(payment.dueDate!)}. You can pay any time.`;
      break;
    case "dueSoon":
      headline = `Payment due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`;
      body = `${formatThb(payment.amount)} due on ${formatDate(payment.dueDate!)}.`;
      break;
    case "dueToday":
      headline = "Payment due today";
      body = `${formatThb(payment.amount)} for ${formatDate(payment.dueDate!)}. Please pay to avoid late status.`;
      break;
    case "overdueMinor":
      headline = `Payment ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`;
      body = `${formatThb(totalOverdueAmount)} outstanding${overdueCount > 1 ? ` across ${overdueCount} months` : ""}. Pay now to avoid further consequences.`;
      break;
    case "overdueSerious":
      headline = `Serious — payment ${daysOverdue} days overdue`;
      body = `${formatThb(totalOverdueAmount)} unpaid${overdueCount > 1 ? ` (${overdueCount} months)` : ""}. Your host can issue a formal payment notice from day 7.`;
      break;
    case "overdueCritical":
      headline = `Critical — ${daysOverdue} days overdue`;
      body = `${formatThb(totalOverdueAmount)} unpaid${overdueCount > 1 ? ` (${overdueCount} months)` : ""}. Your host can initiate termination for non-payment at any time.`;
      break;
    default:
      headline = "Payment status";
      body = "";
  }

  return (
    <div className={cn("rounded-2xl border px-5 py-4 flex items-start gap-3", palette, className)}>
      <Icon size={18} className={cn("shrink-0 mt-0.5", iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{headline}</p>
        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{body}</p>
      </div>
      {onPay && (
        <button
          type="button"
          onClick={onPay}
          className={cn(
            "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
            isOverdue ? "bg-danger text-white hover:bg-danger/90" : "bg-fg text-white hover:bg-fg/90",
          )}
        >
          Pay now
        </button>
      )}
    </div>
  );
}

/**
 * Tenant banner for unpaid invoices that are NOT monthly rent (utilities, damage,
 * cleaning, etc.). `TenantPaymentBanner` only covers MonthlyRent records, so these
 * other charges would otherwise live silently inside the invoice list with no
 * "X days overdue" escalation.
 */
export function TenantOtherInvoicesBanner({
  invoices,
  className,
}: {
  invoices: InvoiceDto[];
  className?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // "Rent" invoices are handled by TenantPaymentBanner via payment records.
  const unpaid = invoices.filter(
    (i) => i.status !== InvoiceStatus.Paid && i.type !== "Rent",
  );
  if (unpaid.length === 0) return null;

  const overdue = unpaid.filter((i) => i.dueDate && new Date(i.dueDate).getTime() < todayMs);
  const totalAmount = unpaid.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const overdueAmount = overdue.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const isOverdue = overdue.length > 0;
  const oldest = overdue.sort((a, b) =>
    (a.dueDate ?? "") < (b.dueDate ?? "") ? -1 : 1,
  )[0];
  const daysOverdue = oldest?.dueDate
    ? Math.floor((todayMs - new Date(oldest.dueDate).getTime()) / MS_PER_DAY)
    : 0;

  const palette = isOverdue
    ? daysOverdue >= 7
      ? "bg-danger/10 border-danger/30"
      : "bg-warning/10 border-warning/30"
    : "bg-bg-card border-border";
  const accent = isOverdue && daysOverdue >= 7 ? "text-danger" : "text-warning";

  const types = Array.from(new Set(unpaid.map((i) => INVOICE_TYPE_LABEL[i.type] ?? i.type)));
  const headline = isOverdue
    ? unpaid.length === 1
      ? `${types[0]} ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`
      : `${unpaid.length} unpaid charges (${daysOverdue}d overdue)`
    : unpaid.length === 1
      ? `${types[0]} due`
      : `${unpaid.length} unpaid charges`;

  return (
    <div className={cn("rounded-2xl border px-5 py-4 flex items-start gap-3", palette, className)}>
      <AlertCircle size={18} className={cn("shrink-0 mt-0.5", accent)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg">{headline}</p>
        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
          {isOverdue
            ? `${formatThb(overdueAmount)} past due${unpaid.length > overdue.length ? ` (plus ${formatThb(totalAmount - overdueAmount)} pending)` : ""}. Pay to avoid late fees and disputes at move-out.`
            : `${formatThb(totalAmount)} outstanding across ${types.join(", ")}.`}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact info pill shown to the **host** summarising tenant payment health.
 * Designed to live inside the rent-schedule section.
 */
export function HostPaymentHealthPill({ health }: { health: PaymentHealth }) {
  if (health.stage === "none" || health.stage === "ok" || health.stage === "upcoming") return null;

  const { stage, daysOverdue, totalOverdueAmount } = health;

  const label = stage === "dueSoon" || stage === "dueToday"
    ? "Due soon"
    : stage === "overdueMinor" ? `${daysOverdue}d overdue`
    : stage === "overdueSerious" ? `${daysOverdue}d overdue · serious`
    : `${daysOverdue}d overdue · critical`;

  const palette = stage.startsWith("overdue")
    ? stage === "overdueCritical" ? "bg-danger text-white" : "bg-danger/10 text-danger"
    : "bg-warning/10 text-warning";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", palette)}>
      <AlertCircle size={11} />
      {label}
      {totalOverdueAmount > 0 && <span className="opacity-80">· {formatThb(totalOverdueAmount)}</span>}
    </span>
  );
}
