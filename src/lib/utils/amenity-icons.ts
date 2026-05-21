import {
  Wifi, ChefHat, Car, Waves, Snowflake, Tv, Dumbbell, Bath,
  TreePine, Flame, Laptop, Camera, Zap, Shirt, Coffee,
  Utensils, BedDouble, Thermometer, Lock, Sun, Wind,
  Droplets, Package, Shield, PawPrint, type LucideIcon,
} from "lucide-react";

// keyword arrays mapped to lucide icons — order matters (first match wins)
const MAP: [string[], LucideIcon][] = [
  [["pet", "dog", "cat", "animal"],                               PawPrint],
  [["wifi", "wi-fi", "internet", "wireless"],                     Wifi],
  [["air con", "aircon", "a/c", "air conditioning", "hvac"],      Snowflake],
  [["pool", "swimming"],                                           Waves],
  [["kitchen", "cook"],                                            ChefHat],
  [["coffee", "espresso", "nespresso"],                            Coffee],
  [["dining", "restaurant"],                                       Utensils],
  [["parking", "garage", "car park"],                              Car],
  [["tv", "television", "netflix", "cable", "smart tv"],          Tv],
  [["gym", "fitness", "exercise", "workout"],                      Dumbbell],
  [["bathtub", "jacuzzi", "hot tub", "bath"],                     Bath],
  [["garden", "yard", "lawn"],                                     TreePine],
  [["hot water", "water heater", "boiler"],                        Flame],
  [["desk", "workspace", "work area", "office"],                   Laptop],
  [["cctv", "camera", "surveillance"],                             Camera],
  [["generator", "backup power"],                                  Zap],
  [["washer", "laundry", "washing machine", "dryer"],              Shirt],
  [["bed linen", "linen", "bedding", "towel"],                     BedDouble],
  [["heat", "heater", "heating"],                                  Thermometer],
  [["refrigerator", "fridge", "freezer"],                          Snowflake],
  [["balcony", "terrace", "patio", "porch", "deck", "rooftop"],   Sun],
  [["storage", "closet", "wardrobe"],                              Package],
  [["security", "guard", "gated"],                                 Shield],
  [["drinking water", "water"],                                    Droplets],
  [["fan", "ventilation"],                                         Wind],
  [["lock", "safe", "locker"],                                     Lock],
];

export function amenityIcon(name: string): LucideIcon | null {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of MAP) {
    if (keywords.some((k) => lower.includes(k))) return icon;
  }
  return null;
}
