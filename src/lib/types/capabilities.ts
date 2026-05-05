export interface CapabilitiesDto {
  userId: string;
  isAdmin: boolean;
  isLandlord: boolean;
  isTenant: boolean;
  isManager: boolean;
  stats: {
    ownedAssetsCount: number;
    managedAssetsCount: number;
    activeBookingsCount: number;
    pastBookingsCount: number;
  };
}
