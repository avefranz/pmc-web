// Section registry. To add a new section:
//   1. Create a file in this folder exporting `xxxSection: SectionDef`.
//   2. Add it to the array below in the order you want it to render.
//   3. If the section maps to an API call in edit mode, add the case in
//      `use-editor.ts` → `commitSection`.
//
// That's the whole contract. No other files need to change.

import type { SectionDef } from "../types";
import { specsSection } from "./specs";
import { locationSection } from "./location";
import { titleSection } from "./title";
import { pricingSection } from "./pricing";
import { photosSection } from "./photos";
import { checkinSection } from "./checkin";
import { rulesSection } from "./rules";
import { petsSection } from "./pets";
import { cancelSection } from "./cancel";
import { utilitiesSection } from "./utilities";
import { utilityAccountsSection } from "./utility-accounts";
import { amenitiesSection } from "./amenities";
import { identitySection } from "./identity";
import { contactSection } from "./contact";
import { paymentSection } from "./payment";

export const SECTIONS: SectionDef[] = [
  specsSection,
  locationSection,
  pricingSection,
  photosSection,
  checkinSection,
  rulesSection,
  petsSection,
  cancelSection,
  utilitiesSection,
  utilityAccountsSection,
  amenitiesSection,
  identitySection,
  contactSection,
  paymentSection,
  titleSection,
];
