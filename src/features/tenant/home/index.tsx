import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Wifi, Eye, EyeOff, Plus, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyBookings } from "@/lib/hooks/use-bookings";
import { useListing } from "@/lib/hooks/use-listings";
import { formatDate, formatThb } from "@/lib/utils/format";
import { BookingStatus } from "@/lib/types/enums";
import type { BookingDto } from "@/lib/types";
import { useAuthStore } from "@/lib/stores/auth.store";
import { toast } from "sonner";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handle}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-3)", display: "flex" }}
    >
      {copied ? <Check size={13} style={{ color: "#2D7A4F" }} /> : <Copy size={13} />}
    </button>
  );
}

function daysUrgency(days: number) {
  if (days <= 14) return { color: "#B53030", label: "Expires soon" };
  if (days <= 30) return { color: "#9A6B00", label: "Ending this month" };
  return { color: "var(--ink-3)", label: "Active" };
}

function ActiveBookingCard({ booking }: { booking: BookingDto }) {
  const { data: listing } = useListing(booking.listingId);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const daysLeft = booking.daysRemaining ?? 0;
  const urgency = daysUrgency(daysLeft);
  const presentAmenities = listing?.amenities.filter((a) => a.isPresent) ?? [];

  return (
    <div>
      {/* ── Property hero ──────────────────────────────────────────────────── */}
      <div className="adm-prop-hero" style={{ marginBottom: 20, position: "relative" }}>
        {listing?.media[0] ? (
          <img src={listing.media[0].url} alt={listing.title} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}>
            <Home size={48} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,15,10,.65) 0%, transparent 50%)" }} />
        <div style={{ position: "absolute", bottom: 20, left: 24 }}>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "#FFF8EC", lineHeight: 1.2 }}>
            {listing?.title ?? "My unit"}
          </div>
          <div style={{ marginTop: 6 }}>
            <span className={`adm-tag ${booking.status === BookingStatus.Active ? "adm-tag--success" : "adm-tag--neutral"}`}>
              {booking.status === BookingStatus.Active ? "Active lease" : booking.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Lease details ──────────────────────────────────────────────────── */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card__head">
          <div className="adm-card__title">Lease</div>
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { label: "Monthly rent", value: <strong style={{ fontFamily: "var(--mono)", fontSize: 15 }}>{formatThb(booking.rentAmount)}</strong> },
              { label: "Lease ends",   value: formatDate(booking.checkOutDate) },
              ...(booking.daysRemaining != null
                ? [{ label: "Days remaining", value: <span style={{ color: urgency.color, fontWeight: 600, fontFamily: "var(--mono)" }}>{booking.daysRemaining} days</span> }]
                : []),
            ].map(({ label, value }, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < 2 ? "1px solid var(--line)" : "none",
              }}>
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{label}</span>
                <span style={{ fontSize: 13 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WiFi ───────────────────────────────────────────────────────────── */}
      {listing && (listing.wifiName || listing.wifiPassword) && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card__head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Wifi size={14} style={{ color: "var(--ink-3)" }} />
              <div className="adm-card__title">WiFi</div>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {listing.wifiName && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Network</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{listing.wifiName}</span>
                  <CopyButton text={listing.wifiName} />
                </div>
              </div>
            )}
            {listing.wifiPassword && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Password</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
                    {showPassword ? listing.wifiPassword : "•".repeat(Math.min(listing.wifiPassword.length, 12))}
                  </span>
                  <button
                    onClick={() => setShowPassword(v => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-3)", display: "flex" }}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <CopyButton text={listing.wifiPassword} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Amenities ──────────────────────────────────────────────────────── */}
      {presentAmenities.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card__head">
            <div className="adm-card__title">Amenities</div>
          </div>
          <div style={{ padding: "0 20px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {presentAmenities.map((a) => (
              <span key={a.amenityId} className="adm-tag adm-tag--neutral">{a.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/tenant/tickets")}
        className="adm-btn adm-btn--ink"
        style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
      >
        <Plus size={13} /> Report an issue
      </button>
    </div>
  );
}

export default function TenantHome() {
  const { user } = useAuthStore();
  const { data: bookings, isLoading } = useMyBookings();
  const activeBooking = bookings?.find(
    (b) => b.status !== BookingStatus.Completed && b.status !== BookingStatus.Cancelled,
  );

  return (
    <div className="adm-page" style={{ paddingBottom: 100 }}>
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Tenant · Active stay</div>
          <h1 className="adm-pagehead__title">
            {user?.firstName ? <>Welcome back, <em>{user.firstName}</em></> : "Active stay"}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !activeBooking ? (
        <div className="adm-empty" style={{ marginTop: 0 }}>
          <Home size={32} style={{ opacity: 0.3 }} />
          <div style={{ fontWeight: 500, fontSize: 15 }}>No active lease</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Contact your manager to get set up.</div>
        </div>
      ) : (
        <ActiveBookingCard booking={activeBooking} />
      )}
    </div>
  );
}
