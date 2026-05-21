import { Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { useUtilitiesByAsset } from "@/lib/hooks/use-utilities";
import { usePeaBill, useGuestPeaBill } from "@/lib/hooks/use-pea";
import { UtilityType } from "@/lib/types/enums";
import type { PeaBillDto } from "@/lib/api/pea.api";

function BillHeader({ ca, statusText, statColor, hasDebt }: { ca: string; statusText?: string; statColor?: string; hasDebt?: boolean }) {
  return (
    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-warning" />
        <span className="text-sm font-semibold text-fg">Electricity (PEA)</span>
        <span className="text-[11px] font-mono text-fg-subtle bg-bg-subtle px-1.5 py-0.5 rounded-md">
          CA {ca}
        </span>
      </div>
      {statusText && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: hasDebt ? "rgba(229,62,62,0.1)" : "rgba(9,152,57,0.1)",
            color: statColor,
          }}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}

function BillBody({ bill }: { bill: PeaBillDto }) {
  return (
    <>
      <div className="px-4 py-4">
        {bill.hasDebt ? (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-fg-muted mb-0.5">Amount due</p>
                <p className="text-2xl font-bold text-danger">
                  ฿{bill.sumTotal.toLocaleString("en", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {bill.dueDate && (
                <div className="text-right">
                  <p className="text-xs text-fg-muted mb-0.5">Due date</p>
                  <p className="text-sm font-semibold text-fg">
                    {new Date(bill.dueDate).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
            {bill.period && (
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Billing period {bill.period.slice(0, 4)}/{bill.period.slice(4)}</span>
                <span>{bill.billCount} unpaid bill{bill.billCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            {bill.barcode && (
              <div className="rounded-lg bg-bg-subtle border border-border px-3 py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-fg-muted mb-0.5">Payment barcode</p>
                  <p className="text-xs font-mono text-fg tracking-wider">{bill.barcode}</p>
                </div>
                <span className="text-[10px] font-semibold bg-warning/10 text-warning px-2 py-0.5 rounded-full shrink-0">
                  Pay at any 7-Eleven
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-success shrink-0" />
            <div>
              <p className="text-sm font-semibold text-fg">No outstanding balance</p>
              {bill.period && (
                <p className="text-xs text-fg-muted mt-0.5">
                  Period {bill.period.slice(0, 4)}/{bill.period.slice(4)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-2 bg-bg-subtle border-t border-border">
        <p className="text-[11px] text-fg-subtle">
          Updated {new Date(bill.fetchedAt).toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </>
  );
}

export function PeaBillCard({ assetId }: { assetId: string }) {
  const { data: utilities, isLoading: utilitiesLoading } = useUtilitiesByAsset(assetId);

  const peaContract = utilities?.find(
    (u) => u.utilityType === UtilityType.Electricity && u.providerName.toUpperCase().includes("PEA"),
  );

  const { data: bill, isLoading: billLoading, isError } = usePeaBill(peaContract?.accountNumber);

  const isLoading = utilitiesLoading || billLoading;

  if (!utilitiesLoading && !peaContract) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-5 flex items-center gap-3 text-fg-muted">
        <Zap size={16} className="shrink-0 opacity-40" />
        <div>
          <p className="text-sm">No electricity meter linked</p>
          <p className="text-xs mt-0.5 opacity-70">Add a PEA meter in property settings to track the bill here.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Zap size={14} className="text-warning" />
          <span className="text-sm font-semibold text-fg">Electricity (PEA)</span>
          {peaContract && (
            <span className="text-[11px] font-mono text-fg-subtle bg-bg-subtle px-1.5 py-0.5 rounded-md">
              CA {peaContract.accountNumber}
            </span>
          )}
        </div>
        <div className="px-4 py-4 space-y-2">
          <div className="h-4 w-32 bg-bg-subtle rounded animate-pulse" />
          <div className="h-7 w-24 bg-bg-subtle rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !bill) {
    return (
      <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
        <BillHeader ca={peaContract!.accountNumber} />
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-danger">
          <AlertCircle size={14} className="shrink-0" />
          Could not fetch bill — PEA service unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
      <BillHeader ca={bill.ca} statusText={bill.statusText} statColor={bill.statColor} hasDebt={bill.hasDebt} />
      <BillBody bill={bill} />
    </div>
  );
}

export function GuestPeaBillCard({ bookingId }: { bookingId: string }) {
  const { data: bill, isLoading, isError } = useGuestPeaBill(bookingId);

  if (isLoading) {
    return (
      <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Zap size={14} className="text-warning" />
          <span className="text-sm font-semibold text-fg">Electricity (PEA)</span>
        </div>
        <div className="px-4 py-4 space-y-2">
          <div className="h-4 w-32 bg-bg-subtle rounded animate-pulse" />
          <div className="h-7 w-24 bg-bg-subtle rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // 204 No Content → backend found no PEA meter for this booking (data is null, no error)
  if (!isError && !bill) return null;

  if (isError) {
    return (
      <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Zap size={14} className="text-warning" />
          <span className="text-sm font-semibold text-fg">Electricity (PEA)</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-danger">
          <AlertCircle size={14} className="shrink-0" />
          Could not fetch bill — PEA service unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
      <BillHeader ca={bill!.ca} statusText={bill!.statusText} statColor={bill!.statColor} hasDebt={bill!.hasDebt} />
      <BillBody bill={bill!} />
    </div>
  );
}
