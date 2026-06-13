import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Camera, Plus, X, CheckCircle2, AlertCircle, UserPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { NationalityInput } from "@/components/ui/nationality-input";
import { PassportPageGuide } from "@/components/shared/passport-page-guide";
import { VisaType } from "@/lib/types/enums";
import type { BookingGuestDto, UpsertPassportRequest } from "@/lib/types";
import { useAddGuest, useUpdatePassport, useRemoveGuest } from "@/lib/hooks/use-bookings";
import { bookingsApi } from "@/lib/api/bookings.api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";

// Date bounds for the pickers (mirrors the booking-detail add-resident dialog).
const NOT_IN_FUTURE = (d: Date) => d > new Date();
const NOT_IN_PAST = (d: Date) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t;
};
const parseLooseDate = (s?: string): Date | null => {
  if (!s?.trim()) return null;
  const d = new Date(s.length === 10 ? s + "T00:00:00" : s);
  return isNaN(d.getTime()) ? null : d;
};
const PASSPORT_EXPIRED = (s?: string): boolean => {
  const d = parseLooseDate(s);
  if (!d) return false;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d <= t;
};
const DOB_ANCHOR = new Date(1995, 0, 1);
const MAX_RESIDENT_PHOTOS = 3;

const isForeign = (g: BookingGuestDto) => !!g.nationality && g.nationality !== "TH";

// A co-resident is "ready for the contract / TM-30" when their identity is on
// file. Thai citizens don't need a passport or TM-30 photos; foreigners need
// the passport fields plus at least one uploaded passport/visa photo.
function residentComplete(g: BookingGuestDto): boolean {
  if (!g.firstName?.trim() || !g.lastName?.trim() || !g.nationality?.trim() || !g.dateOfBirth?.trim()) {
    return false;
  }
  if (isForeign(g)) {
    if (!g.passportNumber?.trim() || !g.passportExpiry?.trim() || !g.visaType) return false;
    if ((g.passportPhotoUrls?.length ?? 0) === 0) return false;
  }
  return true;
}

/**
 * Co-residents roster for the contract-signing screen. Lists every non-main
 * resident on the booking, flags which still need their details, and lets the
 * tenant add a new resident or complete an existing one inline (a modal over
 * the sign page — they never navigate away and lose their signing form).
 */
export function CoResidentsCard({
  bookingId,
  guests,
  maxOccupancy,
}: {
  bookingId: string;
  guests: BookingGuestDto[] | undefined;
  maxOccupancy?: number;
}) {
  const coResidents = (guests ?? []).filter((g) => !g.isMainTenant);
  // Tenant counts as 1, so the roster is full once tenant + co-residents hits the cap.
  const atOccupancyCap =
    typeof maxOccupancy === "number" && coResidents.length + 1 >= maxOccupancy;

  const addGuest = useAddGuest(bookingId);
  const updatePassport = useUpdatePassport(bookingId);
  const removeGuest = useRemoveGuest(bookingId);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);
  const [form, setForm] = useState<UpsertPassportRequest>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [tried, setTried] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  function resetForm() {
    setEditingGuestId(null);
    setExistingPhotoCount(0);
    setForm({});
    setPhotos([]);
    setTried(false);
    setTouched({});
  }
  function openAdd() {
    if (atOccupancyCap) {
      toast.error(`This listing fits ${maxOccupancy} ${maxOccupancy === 1 ? "person" : "people"} — maximum reached.`);
      return;
    }
    resetForm();
    setOpen(true);
  }
  function openEdit(g: BookingGuestDto) {
    setEditingGuestId(g.id);
    setExistingPhotoCount(g.passportPhotoUrls?.length ?? 0);
    setForm({
      firstName: g.firstName,
      lastName: g.lastName,
      gender: g.gender,
      dateOfBirth: g.dateOfBirth,
      nationality: g.nationality,
      passportNumber: g.passportNumber,
      passportExpiry: g.passportExpiry,
      visaType: g.visaType,
    });
    setPhotos([]);
    setTried(false);
    setTouched({});
    setOpen(true);
  }

  const isThai = form.nationality === "TH";
  const dobFuture = !!form.dateOfBirth && NOT_IN_FUTURE(parseLooseDate(form.dateOfBirth)!);
  const expiryExpired = !isThai && PASSPORT_EXPIRED(form.passportExpiry);
  // Photos are satisfied if the resident already has them on file (edit mode)
  // OR the tenant attached at least the passport page + visa stamp now.
  const photosSatisfied = isThai || existingPhotoCount > 0 || photos.length >= 2;
  const errors: Record<string, string | false> = {
    firstName: !form.firstName?.trim() ? "Required" : false,
    lastName: !form.lastName?.trim() ? "Required" : false,
    nationality: !form.nationality?.trim() ? "Required" : false,
    dateOfBirth: !form.dateOfBirth?.trim()
      ? "Required"
      : dobFuture ? "Date of birth can't be in the future" : false,
    passportNumber: !isThai && !form.passportNumber?.trim() ? "Required for non-Thai nationals" : false,
    passportExpiry: !isThai
      ? (!form.passportExpiry?.trim()
          ? "Required for non-Thai nationals"
          : expiryExpired ? "Passport has already expired" : false)
      : false,
    visaType: !isThai && !form.visaType?.trim() ? "Required for non-Thai nationals" : false,
    photos: !photosSatisfied ? "Upload the passport page + visa stamp (min 2 photos)" : false,
  };
  const valid = !Object.values(errors).some(Boolean);
  const markTouched = (f: string) => setTouched((t) => (t[f] ? t : { ...t, [f]: true }));
  const showErr = (f: string): string | false => (tried || touched[f] ? errors[f] : false);

  const photoUrls = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => photoUrls.forEach((u) => URL.revokeObjectURL(u)), [photoUrls]);
  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotos((prev) => {
      const next = [...prev];
      for (const f of Array.from(files)) {
        if (next.length >= MAX_RESIDENT_PHOTOS) break;
        if (next.some((p) => p.name === f.name && p.size === f.size)) continue;
        next.push(f);
      }
      return next;
    });
  }
  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    setTried(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    const name = [form.firstName, form.lastName].filter(Boolean).join(" ") || "Co-resident";
    try {
      // Editing an existing (materialised) resident → PUT their passport;
      // otherwise POST a brand-new resident.
      const guestId = editingGuestId
        ? (await updatePassport.mutateAsync({ guestId: editingGuestId, data: form }), editingGuestId)
        : (await addGuest.mutateAsync(form))?.id;
      if (photos.length > 0 && guestId) {
        await bookingsApi.uploadPassportPhotos(bookingId, guestId, photos);
        // The add/update mutation already refetched the guest list, but that
        // happened BEFORE the photos uploaded — so passportPhotoUrls was still
        // empty and the resident kept showing "Details required". Refetch again
        // now that the photos are attached so completeness updates immediately.
        await qc.invalidateQueries({ queryKey: ["bookings", bookingId, "guests"] });
      }
      toast.success(editingGuestId ? `✓ ${name}'s details saved` : `✓ ${name} added`);
      setOpen(false);
      resetForm();
    } catch {
      toast.error(editingGuestId ? "Failed to save details" : "Failed to add co-resident");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmRemove() {
    if (!removeId) return;
    try {
      await removeGuest.mutateAsync(removeId);
      toast.success("Co-resident removed");
    } catch {
      toast.error("Failed to remove co-resident");
    } finally {
      setRemoveId(null);
    }
  }

  const allComplete = coResidents.length > 0 && coResidents.every(residentComplete);

  return (
    <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <UserPlus size={15} className="text-fg-muted" />
        <h2 className="text-sm font-semibold text-fg">Co-residents</h2>
        {coResidents.length > 0 && (
          <span
            className={cn(
              "ml-auto text-xs font-medium",
              allComplete ? "text-success" : "text-warning",
            )}
          >
            {allComplete ? "All details added" : "Details needed"}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-xs text-fg-muted leading-relaxed">
          Everyone living in the unit must be on the contract and registered for Thai
          immigration (TM-30). Add each co-resident's details below before you sign.
        </p>

        {coResidents.length === 0 ? (
          <p className="text-sm text-fg-muted">No co-residents added yet.</p>
        ) : (
          <ul className="space-y-2">
            {coResidents.map((g) => {
              const complete = residentComplete(g);
              const name = [g.firstName, g.lastName].filter(Boolean).join(" ") || "Unnamed resident";
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  {complete ? (
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-warning shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{name}</p>
                    <p className={cn("text-xs", complete ? "text-fg-muted" : "text-warning")}>
                      {complete ? (g.nationality ?? "") : "Details required"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(g)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline shrink-0"
                  >
                    {complete ? <Pencil size={12} /> : <Plus size={13} />}
                    {complete ? "Edit" : "Add details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveId(g.id)}
                    aria-label={`Remove ${name}`}
                    className="text-fg-muted hover:text-danger shrink-0"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {atOccupancyCap ? (
          <p className="text-xs text-fg-muted">
            Maximum occupancy reached{typeof maxOccupancy === "number" ? ` (${maxOccupancy})` : ""}.
          </p>
        ) : (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            <Plus size={14} />Add co-resident
          </button>
        )}
      </div>

      {/* Add / edit resident — modal over the sign page (no navigation away). */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle>{editingGuestId ? "Co-resident details" : "Add co-resident"}</DialogTitle>
            <p className="text-xs text-fg-muted mt-0.5">
              All residents must be registered for Thai immigration (TM-30).
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            {/* NAME */}
            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Name</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-fg-muted">First name <span className="text-danger">*</span></Label>
                  <Input
                    autoFocus
                    value={form.firstName ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    onBlur={() => markTouched("firstName")}
                    placeholder="As on passport"
                    className={cn(showErr("firstName") && "border-destructive")}
                  />
                  {showErr("firstName") && <p className="text-xs text-danger">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-fg-muted">Last name <span className="text-danger">*</span></Label>
                  <Input
                    value={form.lastName ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    onBlur={() => markTouched("lastName")}
                    placeholder="As on passport"
                    className={cn(showErr("lastName") && "border-destructive")}
                  />
                  {showErr("lastName") && <p className="text-xs text-danger">{errors.lastName}</p>}
                </div>
              </div>
            </div>

            {/* GENDER */}
            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Gender</p>
              <div className="flex gap-3">
                {(["M", "F"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, gender: g }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                      form.gender === g
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-border text-fg-muted hover:border-fg-muted",
                    )}
                  >
                    {g === "M" ? "Male" : "Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* PASSPORT */}
            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Passport</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Nationality <span className="text-danger">*</span></Label>
                    <NationalityInput
                      value={form.nationality ?? ""}
                      onChange={(v) => { setForm((p) => ({ ...p, nationality: v })); markTouched("nationality"); }}
                      className={cn(showErr("nationality") && "border-destructive")}
                    />
                    {showErr("nationality") && <p className="text-xs text-danger">{errors.nationality}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">Date of birth <span className="text-danger">*</span></Label>
                    <DatePicker
                      value={form.dateOfBirth}
                      onChange={(v) => { setForm((p) => ({ ...p, dateOfBirth: v })); markTouched("dateOfBirth"); }}
                      placeholder="Select date of birth"
                      isDisabled={NOT_IN_FUTURE}
                      startView="year"
                      yearAnchor={DOB_ANCHOR}
                      contentClassName="z-[200]"
                      className={cn(showErr("dateOfBirth") && "border-destructive")}
                    />
                    {showErr("dateOfBirth") && <p className="text-xs text-danger">{errors.dateOfBirth}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">
                      Passport number {!isThai && <span className="text-danger">*</span>}
                    </Label>
                    <Input
                      className={cn("font-mono", showErr("passportNumber") && "border-destructive")}
                      value={form.passportNumber ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, passportNumber: e.target.value }))}
                      onBlur={() => markTouched("passportNumber")}
                      placeholder="e.g. 7123456789"
                    />
                    {showErr("passportNumber") && <p className="text-xs text-danger">{errors.passportNumber}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-fg-muted">
                      Passport expiry {!isThai && <span className="text-danger">*</span>}
                    </Label>
                    <DatePicker
                      value={form.passportExpiry}
                      onChange={(v) => { setForm((p) => ({ ...p, passportExpiry: v })); markTouched("passportExpiry"); }}
                      placeholder="Select expiry date"
                      isDisabled={NOT_IN_PAST}
                      startView="year"
                      contentClassName="z-[200]"
                      className={cn(showErr("passportExpiry") && "border-destructive")}
                    />
                    {showErr("passportExpiry") && <p className="text-xs text-danger">{errors.passportExpiry}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* VISA */}
            <div>
              <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">Visa</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">
                  Visa type {!isThai && <span className="text-danger">*</span>}
                </Label>
                <Select value={form.visaType ?? ""} onValueChange={(v) => { setForm((p) => ({ ...p, visaType: v as VisaType })); markTouched("visaType"); }}>
                  <SelectTrigger className={cn(showErr("visaType") && "border-destructive")}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VisaType.VisaExempt}>Visa Exempt (30-day stamp)</SelectItem>
                    <SelectItem value={VisaType.Tourist}>Tourist Visa (TR)</SelectItem>
                    <SelectItem value={VisaType.NonImmigrantB}>Non-Immigrant B (Business/Work)</SelectItem>
                    <SelectItem value={VisaType.NonImmigrantO}>Non-Immigrant O (Retirement/Family)</SelectItem>
                    <SelectItem value={VisaType.NonImmigrantOA}>Non-Immigrant O-A (Long Stay)</SelectItem>
                    <SelectItem value={VisaType.Education}>Education / Student (ED)</SelectItem>
                    <SelectItem value={VisaType.SpecialTourist}>Special Tourist Visa (STV)</SelectItem>
                    <SelectItem value={VisaType.Other}>Other</SelectItem>
                  </SelectContent>
                </Select>
                {showErr("visaType") && <p className="text-xs text-danger">{errors.visaType}</p>}
              </div>
            </div>

            {/* PASSPORT PHOTOS — foreigners only */}
            {!isThai && (
              <div>
                <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wide">
                  Passport &amp; visa photos {existingPhotoCount === 0 && <span className="text-danger">*</span>}
                </p>
                {existingPhotoCount > 0 && photos.length === 0 ? (
                  <p className="text-xs text-success mb-2">
                    {existingPhotoCount} photo{existingPhotoCount > 1 ? "s" : ""} already on file — add more only if needed.
                  </p>
                ) : (
                  <p className="text-[11px] text-fg-muted mb-2">
                    Upload <strong>both</strong> the passport main page <strong>and</strong> the current Thai visa stamp — your host needs both to file TM-30.
                  </p>
                )}
                <PassportPageGuide />

                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {photos.map((f, i) => (
                      <div key={i} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-border bg-bg-subtle">
                        <img src={photoUrls[i]} alt={f.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove ${f.name}`}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          <X size={13} />
                        </button>
                        <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] px-1 py-0.5 truncate">{f.name}</span>
                      </div>
                    ))}
                    {photos.length < MAX_RESIDENT_PHOTOS && (
                      <label className="aspect-[3/4] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer text-fg-muted hover:border-brand hover:bg-brand/5 transition-colors">
                        <Plus size={18} />
                        <span className="text-[11px]">Add photo</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.currentTarget.value = ""; }} />
                      </label>
                    )}
                  </div>
                )}

                {photos.length === 0 && (
                  <label className={cn(
                    "mt-3 flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors",
                    showErr("photos") ? "border-danger bg-danger/5" : "border-border hover:border-brand hover:bg-brand/5",
                  )}>
                    <Camera size={16} className={showErr("photos") ? "text-danger" : "text-fg-muted"} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", showErr("photos") ? "text-danger font-medium" : "text-fg-muted")}>
                        {showErr("photos") ? "Passport page + visa stamp required" : "Upload passport page + visa stamp"}
                      </p>
                      <p className="text-xs text-fg-muted mt-0.5">Select multiple files at once (up to 3)</p>
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.currentTarget.value = ""; }} />
                  </label>
                )}

                {photos.length > 0 && (
                  <p className={cn("text-xs mt-2", photosSatisfied ? "text-success" : showErr("photos") ? "text-danger font-medium" : "text-fg-muted")}>
                    {photosSatisfied
                      ? `${photos.length} photo${photos.length > 1 ? "s" : ""} ready`
                      : "Add at least 2 — the passport page and the visa stamp."}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={submitting || !valid}
              className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white"
              onClick={submit}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                  {editingGuestId ? "Saving…" : "Adding…"}
                </span>
              ) : editingGuestId ? "Save details" : "Add co-resident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={removeId !== null} onOpenChange={(v) => !v && setRemoveId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove co-resident?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-fg-muted">
            They'll be removed from the booking and the rental contract.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={removeGuest.isPending}
              onClick={confirmRemove}
            >
              {removeGuest.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
