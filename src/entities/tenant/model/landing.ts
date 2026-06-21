export interface LandingRoomType {
  id: string;
  engineRoomTypeId: string;
  title: string;
  description: string;
  priceFromEur?: number;
  imageUrl: string;
  requiresChatUpgrade?: boolean;
}

export interface TenantLandingSettings {
  roomsSectionTitle?: string;
  roomsSectionSubtitle?: string;
  roomTypes?: LandingRoomType[];
}
