import { INTEGRATIONS } from './integrations';

const HOSTEL_METADATA = {
  idBookingEngine: 'SFTNHx',
} as const;

export const HOSTEL_CONFIG = {
  checkInTime: process.env.NEXT_PUBLIC_HOSTEL_CHECK_IN_TIME,
  checkOutTime: process.env.NEXT_PUBLIC_HOSTEL_CHECK_OUT_TIME,
  cityTax: process.env.NEXT_PUBLIC_HOSTEL_CITY_TAX,
  selfCheckInTimeAfter: process.env.NEXT_PUBLIC_HOSTEL_SELF_CHECK_IN_TIME_AFTER,
  laundryCost: process.env.NEXT_PUBLIC_HOSTEL_LAUNDRY_COST,
  bookingUrl: `${INTEGRATIONS.cloudbeds.baseUrl}/${HOSTEL_METADATA.idBookingEngine}`,
  heroBgUrl: process.env.NEXT_PUBLIC_HOSTEL_HERO_BG_URL,

  reception: {
    time: {
      open: process.env.NEXT_PUBLIC_HOSTEL_RECEPTION_TIME_OPEN,
      close: process.env.NEXT_PUBLIC_HOSTEL_RECEPTION_TIME_CLOSE,
    },
  },
  sources: {
    recommendation: {
      map: process.env.NEXT_PUBLIC_HOSTEL_SOURCES_RECOMMENDATION_MAP,
    },
  },
  wifi: {
    name: process.env.NEXT_PUBLIC_HOSTEL_WIFI_NAME,
    password: process.env.NEXT_PUBLIC_HOSTEL_WIFI_PASSWORD,
  },
  doors: {
    codes: {
      mainDoor: process.env.NEXT_PUBLIC_HOSTEL_WIFI_DOORS_CODES_MAIN,
      subDoor: process.env.NEXT_PUBLIC_HOSTEL_WIFI_DOORS_CODES_SUBDOOR,
    },
  },
  contacts: {
    phone: {
      raw: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_PHONE_RAW,
      mask: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_PHONE_MASK,
      get href() {
        return `tel:+${this.raw}`;
      },
    },
    taxiPhone: {
      raw: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_TAXI_RAW,
      mask: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_TAXI_MASK,
      get href() {
        return `tel:+${this.raw}`;
      },
    },
    email: {
      display: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_EMAIL,
      get href() {
        return `mailto:${this.display}`;
      },
    },
    address: {
      display: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_ADDRESS_DISPLAY,
      googleMapsHref: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_MAPS_URL,
    },
    socials: {
      instagram: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_INSTAGRAM,
      facebook: process.env.NEXT_PUBLIC_HOSTEL_CONTACTS_FACEBOOK,
    },
  },
};
