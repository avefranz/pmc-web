import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AmenityToggleGrid } from "@/components/amenity-toggle-grid";
import { useCreateAsset } from "@/lib/hooks/use-assets";
import { useCreateListing } from "@/lib/hooks/use-listings";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { listingsApi } from "@/lib/api/listings.api";
import { RentalType } from "@/lib/types/enums";
import { cn } from "@/lib/utils/cn";

const PROPERTY_TYPES = [
  { id: 1, icon: "🏢", label: "Apartment / Condo", description: "Unit in a multi-story building" },
  { id: 2, icon: "🏡", label: "House", description: "Standalone residential property" },
  { id: 3, icon: "🏖️", label: "Villa", description: "Luxury property, often with pool" },
  { id: 4, icon: "🏠", label: "Studio", description: "Open-plan single room" },
  { id: 5, icon: "🏘️", label: "Townhouse", description: "Multi-floor terraced house" },
  { id: 6, icon: "🏗️", label: "Other", description: "Commercial or other type" },
];

function Counter({ label, value, min = 0, onChange }: {
  label: string; value: number; min?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-none">
      <span className="text-sm font-medium text-fg">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-fg-muted hover:border-fg hover:text-fg disabled:opacity-40 transition-colors"
        >−</button>
        <span className="text-sm font-semibold text-fg w-5 text-center">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-fg-muted hover:border-fg hover:text-fg transition-colors"
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

  if (isLoading) return <p className="text-sm text-fg-muted py-8 text-center">Loading amenities…</p>;
  if (!amenityDefs?.length) return <p className="text-sm text-fg-muted">No amenities configured.</p>;

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

const STEPS = ["Type", "Rooms", "Details", "Amenities"];

export function PropertyCreateWizard() {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const createListing = useCreateListing();

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [createdAssetId, setCreatedAssetId] = useState<string | null>(null);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const [propertyType, setPropertyType] = useState<typeof PROPERTY_TYPES[0] | null>(null);
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

  const isSubmitting = createAsset.isPending || createListing.isPending;
  const priceValid = rentalType === RentalType.ShortTerm ? basePrice > 0 : baseMonthlyRate > 0;

  function canProceed() {
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

    if (step === 3) setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <Check size={24} className="text-success" />
        </div>
        <h2 className="text-2xl font-semibold text-fg mb-2">Property created!</h2>
        <p className="text-fg-muted mb-1"><strong>{title}</strong> is ready.</p>
        <p className="text-sm text-fg-muted mb-2">Open the property page to add photos and create bookings.</p>
        <div className="flex items-center justify-center gap-2 text-xs text-fg-muted mb-8">
          <Sparkles size={12} />
          <span>Tip: upload photos next — they're the first thing tenants notice</span>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate("/me/host/properties")}>Back to list</Button>
          <Button
            className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
            onClick={() => createdAssetId && navigate(`/me/host/properties/${createdAssetId}`)}
          >
            Open property →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="p-1.5 rounded-lg hover:bg-bg-subtle transition-colors text-fg-muted hover:text-fg"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="text-sm font-medium text-fg-muted">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all",
                i <= step ? "bg-brand" : "bg-border",
                i === step ? "flex-[2]" : "flex-1",
              )}
            />
          ))}
        </div>
      </div>

      {/* Step 0: Type */}
      {step === 0 && (
        <div>
          <h1 className="text-2xl font-semibold text-fg mb-1">What kind of property is it?</h1>
          <p className="text-sm text-fg-muted mb-6">This helps categorize it in your portfolio.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => setPropertyType(pt)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all",
                  propertyType?.id === pt.id
                    ? "border-fg bg-bg-subtle shadow-sm"
                    : "border-border hover:border-fg-subtle",
                )}
              >
                <span className="text-3xl">{pt.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-fg">{pt.label}</p>
                  <p className="text-xs text-fg-muted mt-0.5">{pt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Rooms */}
      {step === 1 && (
        <div>
          <h1 className="text-2xl font-semibold text-fg mb-1">Share the basics</h1>
          <p className="text-sm text-fg-muted mb-6">You can update this later from the property page.</p>
          <div className="bg-bg-card rounded-xl shadow-card px-5">
            <Counter label="Bedrooms" value={bedrooms} min={0} onChange={setBedrooms} />
            <Counter label="Beds" value={beds} min={1} onChange={setBeds} />
            <Counter label="Bathrooms" value={bathrooms} min={1} onChange={setBathrooms} />
            <Counter label="Max guests" value={maxOccupancy} min={1} onChange={setMaxOccupancy} />
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-fg mb-1">Give it a title</h1>
            <p className="text-sm text-fg-muted">A short title helps identify this property across your portfolio.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">Property name *</Label>
            <Input placeholder="e.g. Baan Rim Nam Villa, Unit 4A" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">Description</Label>
            <Textarea placeholder="Describe the property, its surroundings, what makes it special…" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Rental type *</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([RentalType.LongTerm, RentalType.ShortTerm] as const).map((rt, i) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setRentalType(rt)}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium transition-colors",
                      i === 0 && "border-r border-border",
                      rentalType === rt ? "bg-fg text-bg-card" : "hover:bg-bg-subtle text-fg-muted",
                    )}
                  >
                    {rt === RentalType.LongTerm ? "Long term" : "Short term"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {rentalType === RentalType.LongTerm ? (
                <>
                  <Label className="text-sm font-medium text-fg">Monthly rent (฿) *</Label>
                  <Input type="number" value={baseMonthlyRate || ""} onChange={(e) => setBaseMonthlyRate(Number(e.target.value))} placeholder="25000" min={1} />
                </>
              ) : (
                <>
                  <Label className="text-sm font-medium text-fg">Nightly rate (฿) *</Label>
                  <Input type="number" value={basePrice || ""} onChange={(e) => setBasePrice(Number(e.target.value))} placeholder="2500" min={1} />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">WiFi name</Label>
              <Input placeholder="Network name" value={wifiName} onChange={(e) => setWifiName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">WiFi password</Label>
              <Input placeholder="Password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">House rules</Label>
            <Textarea placeholder="No smoking indoors, quiet hours after 10 pm…" value={houseRules} onChange={(e) => setHouseRules(e.target.value)} className="min-h-[60px] resize-none" />
          </div>
        </div>
      )}

      {/* Step 3: Amenities */}
      {step === 3 && createdListingId && (
        <div>
          <h1 className="text-2xl font-semibold text-fg mb-1">What does this place offer?</h1>
          <p className="text-sm text-fg-muted mb-6">Select all amenities available. You can update these later.</p>
          <WizardAmenities listingId={createdListingId} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <div />
        <Button
          className="bg-brand hover:bg-[var(--color-primary-hover)] text-white px-6"
          onClick={handleNext}
          disabled={!canProceed() || isSubmitting}
        >
          {step === 2 ? (
            isSubmitting ? "Creating…" : "Create property"
          ) : step === 3 ? (
            <><Check size={14} className="mr-1.5" />Done</>
          ) : (
            <>Next <ArrowRight size={14} className="ml-1.5" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
