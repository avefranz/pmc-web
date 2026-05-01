import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { AmenityToggleGrid } from "@/components/shared/amenity-toggle-grid";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCreateAsset } from "@/lib/hooks/use-assets";
import { useCreateListing } from "@/lib/hooks/use-listings";
import { listingsApi } from "@/lib/api/listings.api";
import { RentalType } from "@/lib/types/enums";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

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

function Counter({
  label, value, min = 0,
  onChange,
}: { label: string; value: number; min?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-lg leading-none hover:border-primary hover:text-primary transition-colors disabled:opacity-30"
          disabled={value <= min}
        >−</button>
        <span className="w-5 text-center font-semibold text-base">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-lg leading-none hover:border-primary hover:text-primary transition-colors"
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
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!amenityDefs?.length) {
    return <p className="text-sm text-muted-foreground">No amenities configured in the system.</p>;
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

  // Step 0: type
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);

  // Step 1: rooms
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [maxOccupancy, setMaxOccupancy] = useState(2);

  // Step 2: listing info (title is used as internal name too)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rentalType, setRentalType] = useState<RentalType>(RentalType.LongTerm);
  const [basePrice, setBasePrice] = useState(0);       // nightly (ShortTerm)
  const [baseMonthlyRate, setBaseMonthlyRate] = useState(15000); // monthly (LongTerm)
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [houseRules, setHouseRules] = useState("");

  // 4 real steps (0-3), step 4 = done
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

    // Step 3 → 4 (done)
    if (step === 3) {
      setStep(4);
    }
  }

  function reset() {
    setStep(0);
    setPropertyType(null);
    setBedrooms(1); setBeds(1); setBathrooms(1); setMaxOccupancy(2);
    setTitle(""); setDescription("");
    setRentalType(RentalType.LongTerm); setBasePrice(0); setBaseMonthlyRate(15000);
    setWifiName(""); setWifiPassword(""); setHouseRules("");
    setCreatedAssetId(null);
    setCreatedListingId(null);
  }

  function handleClose() { reset(); onClose(); }

  function handleViewProperty() {
    const id = createdAssetId;
    handleClose();
    if (id) navigate(`/manager/assets/${id}`);
  }

  const isSubmitting = createAsset.isPending || createListing.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden [&>button]:hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            {/* Back button only for steps 1-2 (before creation) */}
            {step > 0 && step <= 2 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i < step ? "bg-primary w-5" : i === step ? "bg-primary w-8" : "bg-muted w-5"
                  )}
                />
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {step < totalSteps ? `Step ${step + 1} of ${totalSteps}` : "Done"}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-8 flex-1 min-h-0 flex flex-col overflow-y-auto">

          {/* Step 0: property type */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-1">What kind of property is it?</h2>
              <p className="text-muted-foreground mb-6">
                This helps categorize it in your portfolio.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setPropertyType(pt)}
                    className={cn(
                      "flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm",
                      propertyType?.id === pt.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <span className="text-3xl">{pt.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{pt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{pt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: rooms & capacity */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-1">Share the basics about the place</h2>
              <p className="text-muted-foreground mb-8">
                You can update this later from the property page.
              </p>
              <div className="divide-y border rounded-xl px-4">
                <Counter label="Bedrooms" value={bedrooms} min={0} onChange={setBedrooms} />
                <Counter label="Beds" value={beds} min={1} onChange={setBeds} />
                <Counter label="Bathrooms" value={bathrooms} min={1} onChange={setBathrooms} />
                <Counter label="Max guests" value={maxOccupancy} min={1} onChange={setMaxOccupancy} />
              </div>
            </div>
          )}

          {/* Step 2: title, price, wifi */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-1">Now, let's give it a title</h2>
              <p className="text-muted-foreground mb-6">
                A short title helps identify this property across your portfolio.
              </p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Property name *</Label>
                  <Input
                    placeholder="e.g. Baan Rim Nam Villa, Unit 4A"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the property, its surroundings, what makes it special..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Rental type *</Label>
                    <div className="flex rounded-lg border overflow-hidden">
                      {([RentalType.LongTerm, RentalType.ShortTerm] as const).map((rt) => (
                        <button
                          key={rt}
                          type="button"
                          onClick={() => setRentalType(rt)}
                          className={cn(
                            "flex-1 py-2 text-sm font-medium transition-colors",
                            rentalType === rt
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {rt === RentalType.LongTerm ? "Long term" : "Short term"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rentalType === RentalType.LongTerm
                        ? "Monthly rent — tenants stay 1+ months on a contract. Billed daily (monthly ÷ 30)."
                        : "Nightly rate — tenants stay days to weeks. Total = nightly rate × nights."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {rentalType === RentalType.LongTerm ? (
                      <>
                        <Label>Monthly rent (฿) *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">฿</span>
                          <Input
                            type="number"
                            className="pl-7"
                            value={baseMonthlyRate || ""}
                            onChange={(e) => setBaseMonthlyRate(Number(e.target.value))}
                            placeholder="e.g. 25000"
                            min={1}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Per month — divided by 30 for daily billing</p>
                      </>
                    ) : (
                      <>
                        <Label>Nightly rate (฿) *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">฿</span>
                          <Input
                            type="number"
                            className="pl-7"
                            value={basePrice || ""}
                            onChange={(e) => setBasePrice(Number(e.target.value))}
                            placeholder="e.g. 2500"
                            min={1}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Per night × number of nights = total rent</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>WiFi name</Label>
                    <Input placeholder="Network name" value={wifiName} onChange={(e) => setWifiName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WiFi password</Label>
                    <Input placeholder="Password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>House rules</Label>
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

          {/* Step 3: Amenities — no back button, asset+listing already created */}
          {step === 3 && createdListingId && (
            <div>
              <h2 className="text-2xl font-bold mb-1">What does this place offer?</h2>
              <p className="text-muted-foreground mb-6">
                Select all amenities available at the property. You can update these later.
              </p>
              <WizardAmenities listingId={createdListingId} />
            </div>
          )}

          {/* Done — step 4 */}
          {step === 4 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Property created!</h2>
              <p className="text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">{title}</span> is ready.
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Open the property page to add photos, invite a landlord, and create bookings.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-primary mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                Tip: upload photos next — they're the first thing tenants notice
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>Later</Button>
                <Button onClick={handleViewProperty}>Open property →</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — only for steps 0-3 */}
        {step <= 3 && (
          <div className="px-6 py-4 border-t flex justify-end bg-muted/20">
            {step < 3 ? (
              <Button onClick={handleNext} disabled={!canProceed() || isSubmitting} size="lg">
                {step === 2
                  ? isSubmitting ? "Creating..." : "Create property"
                  : <>Next <ArrowRight className="h-4 w-4 ml-1.5" /></>}
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { handleClose(); if (createdAssetId) navigate(`/manager/assets/${createdAssetId}`); }}>
                  Open property →
                </Button>
                <Button onClick={() => setStep(4)} size="lg">
                  Done <Check className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
