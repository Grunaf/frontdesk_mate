import type { CityPackId, Place } from '@/entities/hostel';
import { MIN_PLACES_FOR_PACK } from './constants';

/**
 * Dev-only fallback when Supabase is not configured.
 * Production guest runtime loads places from city_packs.content in DB.
 */
const DEV_ENV_PLACES: Partial<Record<CityPackId, Place[]>> = {
  sarajevo: [
    {
      id: 'atm-dalmatinska',
      category: 'essential',
      name: 'ATM UniCredit / Raiffeisen',
      descriptionKey: 'places.atm.desc',
      googleMapsUrl: 'https://maps.google.com/?q=UniCredit+Bank+Dalmatinska+Sarajevo',
      iconId: 'atm',
      isTopPick: false,
      needNow: true,
    },
    {
      id: 'konzum-dalmatinska',
      category: 'essential',
      name: 'Konzum (Dalmatinska)',
      descriptionKey: 'places.konzum.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Konzum+Dalmatinska+Sarajevo',
      iconId: 'grocery',
      isTopPick: false,
      needNow: true,
    },
    {
      id: 'apoteka-titova',
      category: 'essential',
      name: 'Apoteka – Titova Street',
      descriptionKey: 'places.apoteka.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Apoteka+Titova+Sarajevo',
      iconId: 'pharmacy',
      isTopPick: false,
      needNow: true,
    },
    {
      id: 'u2-pizza',
      category: 'food',
      name: 'U2 Pizza',
      descriptionKey: 'places.u2.desc',
      googleMapsUrl: 'https://maps.google.com/?q=U2+Pizza+Sarajevo',
      isTopPick: false,
      needNow: true,
    },
    {
      id: 'zeljo-cevapi',
      category: 'food',
      name: 'Željo',
      descriptionKey: 'places.zeljo.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Cevabdzinica+Zeljo+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
    {
      id: 'pizzerija-mahir',
      category: 'food',
      name: 'Pizzerija Mahir',
      descriptionKey: 'places.mahir.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Pizzerija+Mahir+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
    {
      id: 'bakehouse-edin',
      category: 'food',
      name: 'Bakehouse Edin',
      descriptionKey: 'places.edin.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Pekara+Edin+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
    {
      id: 'pub-vucko',
      category: 'bars',
      name: 'Gastro Pub Vučko',
      descriptionKey: 'places.vucko.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Gastro+Pub+Vucko+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
    {
      id: 'zlatna-ribica',
      category: 'bars',
      name: 'Zlatna ribica',
      descriptionKey: 'places.ribica.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Zlatna+ribica+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
    {
      id: 'kino-bosna',
      category: 'bars',
      name: 'Kino Bosna',
      descriptionKey: 'places.kinobosna.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Kino+Bosna+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
    {
      id: 'fabrika-coffee',
      category: 'cafes',
      name: 'Fabrika Coffee',
      descriptionKey: 'places.fabrika.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Fabrika+Coffee+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
    {
      id: 'yellow-fortress',
      category: 'sights',
      name: 'Yellow Fortress (Žuta Tabija)',
      descriptionKey: 'places.yellowfort.desc',
      googleMapsUrl: 'https://maps.google.com/?q=Zuta+Tabija+Sarajevo',
      isTopPick: true,
      needNow: false,
    },
  ],
};

export function getDevEnvCityPackPlaces(cityPackId: CityPackId): Place[] {
  return DEV_ENV_PLACES[cityPackId] ?? [];
}

export function hasDevEnvCityPackPlaces(cityPackId: CityPackId): boolean {
  return getDevEnvCityPackPlaces(cityPackId).length >= MIN_PLACES_FOR_PACK;
}
