import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { petSummary, totalPets } from "@/components/shared/pets-selector";
import { ArrowLeft, Clock, CheckCircle, XCircle, CalendarDays, Timer, Coins, Search, BedDouble, Home, ExternalLink, ChevronLeft, ChevronRight, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";
import { useMyApplication } from "@/lib/hooks/use-booking-requests";
import type { BookingRequestStatus } from "@/lib/api/booking-requests.api";
import { format, parseISO, addMonths } from "date-fns";

function PhotoLightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setIdx((i) => (i + 1) % urls.length);
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={onClose}>
        <XIcon size={20} />
      </button>
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{idx + 1} / {urls.length}</span>
      {urls.length > 1 && (
        <button className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={(e) => { e.stopPropagation(); prev(); }}>
          <ChevronLeft size={22} />
        </button>
      )}
      <img src={urls[idx]} alt="" className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
      {urls.length > 1 && (
        <button className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={(e) => { e.stopPropagation(); next(); }}>
          <ChevronRight size={22} />
        </button>
      )}
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {urls.map((u, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={cn("w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0", i === idx ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80")}>
              <img src={u} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_CONFIG: Record<
  BookingRequestStatus,
  { icon: React.ElementType; color: string; bg: string; ring: string; label: string; description: string }
> = {
  Pending: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    ring: "ring-warning/30",
    label: "Awaiting response",
    description: "Your request has been sent. The host will typically respond within 24 hours.",
  },
  Approved: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    ring: "ring-success/30",
    label: "Approved",
    description: "Great news — your reservation request has been approved! The host will be in touch shortly.",
  },
  Rejected: {
    icon: XCircle,
    color: "text-danger",
    bg: "bg-danger/10",
    ring: "ring-danger/30",
    label: "Not available",
    description: "Unfortunately the host wasn't able to accommodate this request.",
  },
  Expired: {
    icon: Clock,
    color: "text-fg-muted",
    bg: "bg-bg-subtle",
    ring: "ring-border",
    label: "Expired",
    description: "This request expired without a response.",
  },
};

function PetPhotoSection({ urls }: { urls: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  return (
    <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-fg">🐾 Pet photos</p>
      </div>
      <div className="p-4 flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <button key={i} onClick={() => setLightboxIdx(i)}
            className="w-24 h-24 rounded-xl overflow-hidden bg-bg-subtle shrink-0 hover:opacity-90 hover:scale-[1.03] transition-all">
            <img src={url} alt={`Pet ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {lightboxIdx !== null && (
        <PhotoLightbox urls={urls} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}

export function GuestApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading } = useMyApplication(id!);

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/me/guest/applications" className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-semibold text-fg">Application</h1>
        </div>
        <div className="bg-bg-card rounded-2xl shadow-card p-8 text-center">
          <p className="text-fg-muted">Application not found.</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[app.status];
  const Icon = cfg.icon;
  const moveIn = parseISO(app.moveInDate);
  const moveOut = addMonths(moveIn, app.durationMonths);

  return (
    <div className="w-full pb-8">
      {/* Back + title */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          to="/me/guest/applications"
          className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-fg line-clamp-1">
          {app.listingTitle ?? "Application"}
        </h1>
        {app.listingSlug && (
          <Link
            to={`/listings/${app.listingSlug}`}
            className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs text-brand hover:underline font-medium"
          >
            <ExternalLink size={13} />
            View listing
          </Link>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* LEFT — listing image */}
        <div className="space-y-4">
          <div className="h-56 sm:h-72 bg-bg-subtle rounded-2xl overflow-hidden">
            {app.listingImageUrl ? (
              <img
                src={app.listingImageUrl}
                alt={app.listingTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                <Home size={48} />
              </div>
            )}
          </div>

          {/* Pet photos (if submitted) */}
          {app.petPhotoUrls?.length > 0 && (
            <PetPhotoSection urls={app.petPhotoUrls} />
          )}

          {/* Status banner */}
          <div className={cn("rounded-2xl p-5 ring-1 flex items-start gap-4", cfg.bg, cfg.ring)}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/60">
              <Icon size={20} className={cfg.color} />
            </div>
            <div>
              <p className={cn("font-semibold", cfg.color)}>{cfg.label}</p>
              <p className="text-sm text-fg-muted mt-0.5">{cfg.description}</p>
              {app.status === "Rejected" && app.rejectionReason && (
                <p className="text-sm text-fg mt-2 pt-2 border-t border-danger/20">
                  <span className="font-medium text-fg">Host's message: </span>
                  {app.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — booking details */}
        <div className="space-y-3 lg:sticky lg:top-8">
          {/* Dates + financials */}
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-fg">Reservation details</h3>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Move-in</span>
                <span className="font-medium text-fg">{format(moveIn, "d MMM yyyy")}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <CalendarDays size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Move-out</span>
                <span className="font-medium text-fg">{format(moveOut, "d MMM yyyy")}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Timer size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Duration</span>
                <span className="font-medium text-fg">
                  {app.durationMonths} month{app.durationMonths !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <Coins size={15} className="text-fg-muted shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <span className="text-fg-muted">Monthly rent</span>
                <span className="font-medium text-fg">{formatThb(app.monthlyRate)}/mo</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <span className="w-[15px] shrink-0" />
              <div className="flex-1 flex justify-between text-sm">
                <div>
                  <span className="text-fg-muted">Refundable deposit</span>
                  <div className="text-[11px] text-fg-muted mt-0.5">held securely by Siamo</div>
                </div>
                <span className="font-medium text-fg">{formatThb(app.monthlyRate)}</span>
              </div>
            </div>
            {totalPets({ cats: app.petCatsCount, dogs: app.petDogsCount, other: app.petOtherCount }) > 0 && (
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
                <span className="w-[15px] shrink-0 text-sm">🐾</span>
                <div className="flex-1 flex justify-between text-sm">
                  <span className="text-fg-muted">Pets</span>
                  <span className="text-fg font-medium capitalize">
                    {petSummary({ cats: app.petCatsCount, dogs: app.petDogsCount, other: app.petOtherCount })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CTAs based on status */}
          {app.status === "Approved" && (
            <Button asChild className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-10 text-sm">
              <Link to="/me/guest/bookings">
                <BedDouble size={15} className="mr-2" />View your stays
              </Link>
            </Button>
          )}
          {(app.status === "Rejected" || app.status === "Expired") && (
            <Button asChild variant="outline" className="w-full rounded-xl h-10 text-sm border-border hover:bg-bg-subtle">
              <Link to="/listings">
                <Search size={15} className="mr-2" />Browse other ads
              </Link>
            </Button>
          )}

          {/* Submitted at */}
          {app.createdAt && (
            <p className="text-xs text-fg-muted text-center pt-1">
              Submitted {format(parseISO(app.createdAt), "d MMM yyyy 'at' HH:mm")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
