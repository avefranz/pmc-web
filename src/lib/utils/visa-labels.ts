import { VisaType } from "@/lib/types/enums";

// BUG-367: single source of truth for visa-type labels. Previously the
// booking-request modal showed terse labels ("Non-Immigrant O") while the
// contract-sign page showed the informative ones ("Non-Immigrant O
// (Family/Retirement)") — same enum, divergent copy across screens. Both
// surfaces now import this map; prefer the more descriptive labels.
export const VISA_LABELS: Record<VisaType, string> = {
  [VisaType.VisaExempt]: "Visa Exempt (30 days)",
  [VisaType.Tourist]: "Tourist Visa (TR)",
  [VisaType.NonImmigrantB]: "Non-Immigrant B (Business)",
  [VisaType.NonImmigrantO]: "Non-Immigrant O (Family/Retirement)",
  [VisaType.NonImmigrantOA]: "Non-Immigrant O-A (Long Stay)",
  [VisaType.Education]: "Education Visa (ED)",
  [VisaType.SpecialTourist]: "Special Tourist Visa (STV)",
  [VisaType.Other]: "Other",
};
