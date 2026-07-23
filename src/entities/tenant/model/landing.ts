/**
 * Resolved public card shape for landing gallery / previews.
 * Built from StayOffer + LandingRoomCard overrides (or legacy roomTypes).
 */
export interface LandingRoomType {
  id: string;
  engineRoomTypeId: string;
  title: string;
  description: string;
  priceFromEur?: number;
  imageUrl: string;
  requiresChatUpgrade?: boolean;
}

/** Landing presentation row — references a StayOffer and may override marketing fields. */
export interface LandingRoomCard {
  offerId: string;
  title?: string;
  description?: string;
  priceFromEur?: number;
  imageUrl?: string;
  requiresChatUpgrade?: boolean;
}

export interface TenantLandingSettings {
  roomsSectionTitle?: string;
  roomsSectionSubtitle?: string;
  /** @deprecated Migrated to settings.stayOffers + landing.roomCards on read/save. */
  roomTypes?: LandingRoomType[];
  roomCards?: LandingRoomCard[];
}
