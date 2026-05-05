import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { AmenityToggleGrid } from "@/components/shared/amenity-toggle-grid";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreateAsset } from "@/lib/hooks/use-assets";
import { useCreateListing } from "@/lib/hooks/use-listings";
import { listingsApi } from "@/lib/api/listings.api";
import { RentalType } from "@/lib/types/enums";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

type PropertyType = {
  id: number;
  icon: string;
  label: string;
  description: string;
};

const PROPERTY_TYPES: PropertyType[] = [
  { id: 1, icon: "🏢", label: "Apartment / Condo", description: "Unit in a multi-story building" },
  { id: 2, icon: "🏡", label: "House", description: "Standalone residential property" },
  { id: 3, icon: "🏖️", label: "Villa", description: "Luxury property, often with pool" },
  { id: 4, icon: "🏠", label: "Studio", description: "Open-plan single room" },
  { id: 5, icon: "🏘️", label: "Townhouse", description: "Multi-floor terraced house" },
  { id: 6, icon: "🏗️", label: "Other", description: "Commercial or other type" },
];

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-4)",
  display: "block",
  marginBottom: 6,
};

function Counter({
  label, value, min = 0,
  onChange,
}: { label: string; value: number; min?: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--ink-5)" }}>
      <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="adm-btn adm-btn--ghost adm-btn--icon"
          disabled={value <= min}
          style={{ width: 28, height: 28, fontSize: 16 }}
        >−</button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="adm-btn adm-btn--ghost adm-btn--icon"
          style={{ width: 28, height: 28, fontSize: 16 }}
        >+</button>
      </div>
    </div>
  );
}

function WizardAmenities({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const { data: amenityDefs, isLoading } = useAmenities();
  const { data: categories } = useAmenityCategories();
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [presentSet, setPresentSet] = useState<Set<number>>(new Set());

  async function onToggle(id: number, isPresent: boolean) {
    const newValue = !isPresent;
    const newPresentSet = new Set(presentSet);
    if (newValue) newPresentSet.add(id);
    else newPresentSet.delete(id);

    setPresentSet(newPresentSet);
    setPending((p) => ({ ...p, [id]: true }));

    try {
      const updated = (amenityDefs ?? []).map((def) => ({
        amenityId: def.id,
        isPresent: newPresentSet.has(def.id),
      }));
      await listingsApi.updateAmenities(listingId, updated);
      qc.invalidateQueries({ queryKey: ["listings"] });
    } catch {
      setPresentSet(presentSet);
      toast.error("Failed to update amenity");
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 128 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Loading amenities…</span>
      </div>
    );
  }

  if (!amenityDefs?.length) {
    return <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>No amenities configured in the system.</p>;
  }

  return (
    <AmenityToggleGrid
      amenities={amenityDefs}
      categories={categories}
      presentSet={presentSet}
      pending={pending}
      onToggle={onToggle}
      compact
    />
  );
}

export function CreatePropertyWizard({ open, onClose }: Props) {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const createListing = useCreateListing();

  const [step, setStep] = useState(0);
  const [createdAssetId, setCreatedAssetId] = useState<string | null>(null);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [maxOccupancy, setMaxOccupancy] = useState(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rentalType, setRentalType] = useState<RentalType>(RentalType.LongTerm);
  const [basePrice, setBasePrice] = useState(0);
  const [baseMonthlyRate, setBaseMonthlyRate] = useState(15000);
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [houseRules, setHouseRules] = useState("");

  const totalSteps = 4;
  const priceValid = rentalType === RentalType.ShortTerm ? basePrice > 0 : baseMonthlyRate > 0;

  function canProceed(): boolean {
    if (step === 0) return !!propertyType;
    if (step === 1) return true;
    if (step === 2) return !!title.trim() && priceValid;
    return true;
  }

  async function handleNext() {
    if (step < 2) { setStep((s) => s + 1); return; }

    if (step === 2) {
      try {
        const asset = await createAsset.mutateAsync({
          internalName: title.trim(),
          assetTypeId: propertyType!.id,
          maxOccupancy,
          bedrooms,
          beds,
          bathrooms,
        });

        const listing = await createListing.mutateAsync({
          assetId: asset.id,
          title: title.trim(),
          description: description.trim() || title.trim(),
          houseRules: houseRules.trim() || "Standard house rules apply.",
          wifiName: wifiName.trim(),
          wifiPassword: wifiPassword.trim(),
          propertyCategoryId: 1,
          instantBookEnabled: false,
          rentalType,
          basePrice: rentalType === RentalType.ShortTerm ? basePrice : Math.round(baseMonthlyRate / 30),
          baseMonthlyRate: rentalType === RentalType.LongTerm ? baseMonthlyRate : undefined,
        });

        setCreatedAssetId(asset.id);
        setCreatedListingId(listing.id);
        setStep(3);
      } catch {
        toast.error("Failed to create property");
      }
      return;
    }

    if (step === 3) setStep(4);
  }

  function reset() {
    setStep(0);
    setPropertyType(null);
    setBedrooms(1); setBeds(1); setBathrooms(1); setMaxOccupancy(2);
    setTitle(""); setDescription("");
    setRentalType(RentalType.LongTerm); setBasePrice(0); setBaseMonthlyRate(15000);
    setWifiName(""); setWifiPassword(""); setHouseRules("");
    setCreatedAssetId(null); setCreatedListingId(null);
  }

  function handleClose() { reset(); onClose(); }
  function handleViewProperty() { const id = createdAssetId; handleClose(); if (id) navigate(`/manager/assets/${id}`); }

  const isSubmitting = createAsset.isPending || createListing.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden [&>button]:hidden max-h-[90vh] flex flex-col">
      {/* adm scope wrapper — Dialog portals outside .adm, so CSS vars would be undefined without this */}
      <div className="adm" style={{ display: "contents" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "2px solid var(--ink)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {step > 0 && step <= 2 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="adm-btn adm-btn--ghost adm-btn--icon"
                style={{ width: 28, height: 28 }}
              >
                <ArrowLeft size={14} />
              </button>
            )}
            {/* Step indicator */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 3,
                    width: i === step ? 28 : 16,
                    background: i <= step ? "var(--ink)" : "var(--ink-5)",
                    transition: "width 0.2s, background 0.2s",
                  }}
                />
              ))}
            </div>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-4)" }}>
            {step < totalSteps ? `STEP ${step + 1} / ${totalSteps}` : "DONE"}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 28px 24px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* Step 0: property type */}
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                What kind of property is it?
              </h2>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginBottom: 20 }}>
                This helps categorize it in your portfolio.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setPropertyType(pt)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "14px 12px",
                      border: propertyType?.id === pt.id ? "2px solid var(--ink)" : "1px solid var(--ink-5)",
                      background: propertyType?.id === pt.id ? "var(--surface-muted)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.1s",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{pt.icon}</span>
                    <div>
                      <p style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{pt.label}</p>
                      <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)" }}>{pt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: rooms & capacity */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                Share the basics about the place
              </h2>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginBottom: 24 }}>
                You can update this later from the property page.
              </p>
              <div style={{ border: "1px solid var(--ink-5)", padding: "0 16px" }}>
                <Counter label="Bedrooms" value={bedrooms} min={0} onChange={setBedrooms} />
                <Counter label="Beds" value={beds} min={1} onChange={setBeds} />
                <Counter label="Bathrooms" value={bathrooms} min={1} onChange={setBathrooms} />
                <div style={{ borderBottom: "none" }}>
                  <Counter label="Max guests" value={maxOccupancy} min={1} onChange={setMaxOccupancy} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: title, price, wifi */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                Now, let's give it a title
              </h2>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginBottom: 20 }}>
                A short title helps identify this property across your portfolio.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <Label style={fieldLabelStyle}>Property name *</Label>
                  <Input
                    placeholder="e.g. Baan Rim Nam Villa, Unit 4A"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label style={fieldLabelStyle}>Description</Label>
                  <Textarea
                    placeholder="Describe the property, its surroundings, what makes it special..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Label style={fieldLabelStyle}>Rental type *</Label>
                    <div style={{ display: "flex", border: "1px solid var(--ink-5)" }}>
                      {([RentalType.LongTerm, RentalType.ShortTerm] as const).map((rt) => (
                        <button
                          key={rt}
                          type="button"
                          onClick={() => setRentalType(rt)}
                          style={{
                            flex: 1,
                            padding: "8px 6px",
                            fontFamily: "var(--mono)",
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            border: "none",
                            borderRight: rt === RentalType.LongTerm ? "1px solid var(--ink-5)" : "none",
                            background: rentalType === rt ? "var(--ink)" : "transparent",
                            color: rentalType === rt ? "var(--paper)" : "var(--ink-3)",
                            cursor: "pointer",
                          }}
                        >
                          {rt === RentalType.LongTerm ? "Long term" : "Short term"}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-4)", marginTop: 4, lineHeight: 1.5 }}>
                      {rentalType === RentalType.LongTerm
                        ? "Monthly rent — tenants stay 1+ months. Billed daily (monthly ÷ 30)."
                        : "Nightly rate — tenants stay days to weeks. Total = nightly × nights."}
                    </p>
                  </div>
                  <div>
                    {rentalType === RentalType.LongTerm ? (
                      <>
                        <Label style={fieldLabelStyle}>Monthly rent (฿) *</Label>
                        <Input
                          type="number"
                          value={baseMonthlyRate || ""}
                          onChange={(e) => setBaseMonthlyRate(Number(e.target.value))}
                          placeholder="e.g. 25000"
                          min={1}
                        />
                        <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-4)", marginTop: 4 }}>Per month — divided by 30 for daily billing</p>
                      </>
                    ) : (
                      <>
                        <Label style={fieldLabelStyle}>Nightly rate (฿) *</Label>
                        <Input
                          type="number"
                          value={basePrice || ""}
                          onChange={(e) => setBasePrice(Number(e.target.value))}
                          placeholder="e.g. 2500"
                          min={1}
                        />
                        <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-4)", marginTop: 4 }}>Per night × number of nights = total rent</p>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Label style={fieldLabelStyle}>WiFi name</Label>
                    <Input placeholder="Network name" value={wifiName} onChange={(e) => setWifiName(e.target.value)} />
                  </div>
                  <div>
                    <Label style={fieldLabelStyle}>WiFi password</Label>
                    <Input placeholder="Password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label style={fieldLabelStyle}>House rules</Label>
                  <Textarea
                    placeholder="No smoking indoors, quiet hours after 10 pm..."
                    value={houseRules}
                    onChange={(e) => setHouseRules(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Amenities */}
          {step === 3 && createdListingId && (
            <div>
              <h2 style={{ fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                What does this place offer?
              </h2>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginBottom: 20 }}>
                Select all amenities available at the property. You can update these later.
              </p>
              <WizardAmenities listingId={createdListingId} />
            </div>
          )}

          {/* Done — step 4 */}
          {step === 4 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px 32px" }}>
              <div style={{ width: 56, height: 56, border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <Check size={24} />
              </div>
              <h2 style={{ fontFamily: "var(--sans)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Property created!</h2>
              <p style={{ fontFamily: "var(--mono)", fontSize: 12, marginBottom: 4 }}>
                <strong>{title}</strong> is ready.
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>
                Open the property page to add photos, invite a landlord, and create bookings.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", marginBottom: 28 }}>
                <Sparkles size={12} />
                Tip: upload photos next — they're the first thing tenants notice
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="adm-btn adm-btn--ghost" onClick={handleClose}>Later</button>
                <button className="adm-btn adm-btn--ink" onClick={handleViewProperty}>Open property →</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step <= 3 && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--ink-5)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {step < 3 ? (
              <button
                className="adm-btn adm-btn--ink"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
              >
                {step === 2
                  ? isSubmitting ? "Creating…" : "Create property"
                  : <><span>Next</span> <ArrowRight size={13} /></>}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button className="adm-btn adm-btn--ghost" onClick={() => { handleClose(); if (createdAssetId) navigate(`/manager/assets/${createdAssetId}`); }}>
                  Open property →
                </button>
                <button className="adm-btn adm-btn--ink" onClick={() => setStep(4)}>
                  Done <Check size={13} style={{ display: "inline", marginLeft: 4 }} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>{/* end .adm scope */}
      </DialogContent>
    </Dialog>
  );
}
