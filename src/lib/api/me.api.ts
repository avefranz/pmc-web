import { authApi } from "./auth.api";
import { assetsApi } from "./assets.api";
import { bookingsApi } from "./bookings.api";
import type { CapabilitiesDto } from "../types/capabilities";

const USE_MOCK = import.meta.env.VITE_CAPS_MOCK !== "false";

export const meApi = {
  async getCapabilities(): Promise<CapabilitiesDto> {
    if (!USE_MOCK) {
      const { apiClient } = await import("./client");
      const r = await apiClient.get("/me/capabilities");
      return r.data.data;
    }
    return deriveCapabilities();
  },
};

async function deriveCapabilities(): Promise<CapabilitiesDto> {
  const me = await authApi.me();
  const [assets, bookings] = await Promise.all([
    assetsApi.getAll().catch(() => [] as any[]),
    bookingsApi.getMy().catch(() => [] as any[]),
  ]);

  const isAdmin = me.roles.includes("Admin");
  const ownedAssets = assets.filter((a: any) => a.ownerId === me.id);

  return {
    userId: me.id,
    isAdmin,
    isLandlord: ownedAssets.length > 0 || me.roles.includes("Landlord"),
    isTenant: bookings.length > 0 || me.roles.includes("Tenant"),
    isManager: isAdmin,
    stats: {
      ownedAssetsCount: ownedAssets.length,
      managedAssetsCount: assets.length - ownedAssets.length,
      activeBookingsCount: bookings.filter((b: any) => b.status === "Active").length,
      pastBookingsCount: bookings.filter((b: any) => b.status !== "Active").length,
    },
  };
}
