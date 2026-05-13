import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAsset } from "@/lib/hooks/use-assets";
import { useReferences } from "@/lib/hooks/use-references";
import { listingsApi } from "@/lib/api/listings.api";
import { Stepper } from "@/components/shared/stepper";
import { useQueryClient } from "@tanstack/react-query";

function resolveName(name: Record<string, string> | string): string {
  if (typeof name === "string") return name;
  return name["en"] ?? name["th"] ?? Object.values(name)[0] ?? "";
}

export function PropertyCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createAsset = useCreateAsset();
  const { data: refs } = useReferences();

  const [internalName, setInternalName]     = useState("");
  const [assetTypeId, setAssetTypeId]       = useState<number | null>(null);
  const [monthlyRate, setMonthlyRate]       = useState("");
  const [depositAmount, setDepositAmount]   = useState("");
  const [bedrooms, setBedrooms]             = useState(1);
  const [bathrooms, setBathrooms]           = useState(1);
  const [beds, setBeds]                     = useState(1);
  const [maxOccupancy, setMaxOccupancy]     = useState(2);
  const [isPending, setIsPending]           = useState(false);

  const monthlyRateNum = Number(monthlyRate.replace(/[^0-9]/g, ""));

  const canSubmit =
    internalName.trim().length > 0 &&
    assetTypeId !== null &&
    monthlyRateNum > 0 &&
    !isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || assetTypeId === null) return;
    setIsPending(true);
    try {
      const { id } = await createAsset.mutateAsync({
        internalName: internalName.trim(),
        assetTypeId,
        bedrooms,
        bathrooms,
        beds,
        maxOccupancy,
      });

      const firstCategory = refs?.propertyCategories?.[0]?.id ?? 1;
      await listingsApi.create({
        assetId: id,
        title: internalName.trim(),
        description: "",
        houseRules: "",
        wifiName: "",
        wifiPassword: "",
        propertyCategoryId: firstCategory,
        instantBookEnabled: false,
        basePrice: monthlyRateNum,
        baseMonthlyRate: monthlyRateNum,
        depositAmount: depositAmount ? Number(depositAmount.replace(/[^0-9]/g, "")) : undefined,
      });
      qc.invalidateQueries({ queryKey: ["listings"] });

      toast.success("Property created — complete the details below");
      navigate(`/me/host/properties/${id}`);
    } catch {
      toast.error("Failed to create property");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <Link
        to="/me/host/properties"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors mb-8"
      >
        <ArrowLeft size={16} />Back to properties
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bg-subtle flex items-center justify-center">
          <Home size={20} className="text-fg-muted" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-fg">Add a property</h1>
          <p className="text-sm text-fg-muted">You can add photos, description and rules after.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium text-fg">
              Property name <span className="text-danger">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Villa Sukhumvit 11, Studio 4B…"
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-fg-muted">Internal reference — not shown to guests.</p>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">
              Property type <span className="text-danger">*</span>
            </Label>
            <Select
              value={assetTypeId?.toString() ?? ""}
              onValueChange={(v) => setAssetTypeId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {(refs?.unitTypes ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {resolveName(t.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-fg block">
              Pricing <span className="text-danger">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="monthlyRate" className="text-xs text-fg-muted">Monthly rent (฿)</Label>
                <Input
                  id="monthlyRate"
                  inputMode="numeric"
                  placeholder="35,000"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deposit" className="text-xs text-fg-muted">Security deposit (฿)</Label>
                <Input
                  id="deposit"
                  inputMode="numeric"
                  placeholder="70,000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-fg block">Size</Label>
            <Stepper label="Bedrooms"      value={bedrooms}     onChange={setBedrooms}     min={0} max={20} />
            <Stepper label="Bathrooms"     value={bathrooms}    onChange={setBathrooms}    min={0} max={20} />
            <Stepper label="Beds"          value={beds}         onChange={setBeds}         min={1} max={20} />
            <Stepper label="Max occupancy" value={maxOccupancy} onChange={setMaxOccupancy} min={1} max={50} />
          </div>

        </div>

        <div className="px-5 pb-5">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-11 text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create property →"}
          </Button>
        </div>
      </form>
    </div>
  );
}
