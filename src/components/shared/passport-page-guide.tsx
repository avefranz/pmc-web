/**
 * PassportPageGuide — shows which passport pages to photograph for TM-30 immigration reporting.
 *
 * Required for Thailand TM-30:
 *  1. Bio data page  — name, photo, passport number, nationality, expiry
 *  2. Thai visa page — visa type, validity (Non-B, Tourist, OA…)  |  skip if visa-exempt
 *  3. Entry stamp    — most recent Thai entry date, port, authorised stay
 */

const PAGES = [
  {
    key: "bio",
    label: "Bio data page",
    sublabel: "Name, photo & number",
    required: "Always",
    src: "https://upload.wikimedia.org/wikipedia/commons/0/02/Bio_data_page_of_German_Passport.png",
    alt: "Example passport biographical data page showing photo, name, and MRZ",
  },
  {
    key: "visa",
    label: "Thai visa page",
    sublabel: "Visa type & validity",
    required: "If you have a visa sticker",
    src: "https://upload.wikimedia.org/wikipedia/commons/8/82/Thai_Visa_on_Arrival.jpg",
    alt: "Example Thai visa on arrival sticker in a passport",
  },
  {
    key: "entry",
    label: "Entry stamp",
    sublabel: "Most recent Thai entry",
    required: "Always",
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Thailand_Entry_Stamp_%282022%29.jpg",
    alt: "Example Thai immigration entry stamp",
  },
];

export function PassportPageGuide() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-fg-muted">Which pages to photograph:</p>
      <div className="grid grid-cols-3 gap-2">
        {PAGES.map((p) => (
          <div key={p.key} className="flex flex-col gap-1.5">
            <div className="aspect-[3/4] rounded-lg border border-border overflow-hidden bg-bg-subtle">
              <img
                src={p.src}
                alt={p.alt}
                className="w-full h-full object-cover object-top"
                loading="lazy"
                onError={(e) => {
                  // Fallback: hide broken image, show placeholder bg
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-[10px] font-semibold text-fg leading-tight">{p.label}</p>
              <p className="text-[9px] text-fg-muted leading-tight">{p.sublabel}</p>
              <p className="text-[9px] text-fg-subtle leading-tight italic">{p.required}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-fg-muted">
        Smartphone quality is fine. Stored encrypted, visible only to you and your landlord.
      </p>
    </div>
  );
}
