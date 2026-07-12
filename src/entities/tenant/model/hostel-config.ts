import type { HostelBookingConfig } from './booking';

export interface HostelContactLink {
  raw?: string;
  mask?: string;
  formatPreset?: string;
  href: string;
}

export interface HostelConfig {
  checkInTime?: string;
  checkOutTime?: string;
  propertyTimeZone?: string;
  cityTax?: string;
  selfCheckInTimeAfter?: string;
  laundryCost?: string;
  booking: HostelBookingConfig;
  heroBgUrl?: string;
  logoUrl?: string;
  reception: {
    time: {
      open?: string;
      close?: string;
    };
    whatsapp: HostelContactLink;
    whatsappEnabled: boolean;
    canHelpWithTaxi: boolean;
    availabilityHint?: string;
  };
  sources: {
    recommendation: {
      map?: string;
    };
  };
  wifi: {
    name?: string;
    password?: string;
  };
  contacts: {
    phone: HostelContactLink;
    taxiPhone: HostelContactLink;
    email: {
      display?: string;
      href: string;
    };
    address: {
      display?: string;
      googleMapsHref?: string;
    };
    socials: {
      instagram?: string;
      facebook?: string;
    };
    guestChat: {
      href: string;
    };
    feedbackPhone: HostelContactLink;
  };
}
