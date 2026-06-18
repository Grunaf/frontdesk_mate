export type PlaceCategory = 'bars' | 'food' | 'cafes' | 'sights' | 'essential';
export type PlaceTag = 'TOP PICK' | 'BONUS' | 'LATE NIGHT BITES' | 'ESSENTIAL';

export interface Place {
  id: string;
  category: PlaceCategory;
  tag: PlaceTag;
  name: string; // Оставляем оригинальное имя (оно не переводится)
  subCategoryKey: string; // Ключ перевода подкатегории
  descriptionKey: string; // Ключ перевода описания
  googleMapsUrl: string; // Deep-link для перехода на карту
  isSurvival: boolean; // Ключевой флаг для первой ночи гостя
  recommendedBy?: string;
}

export const LOCAL_PLACES: Place[] = [
  // === ESSENTIAL INFO & LOGISTICS (Survival Kit для первой ночи) ===
  {
    id: 'atm-dalmatinska',
    category: 'essential',
    tag: 'ESSENTIAL',
    name: 'ATM UniCredit / Raiffeisen',
    subCategoryKey: 'places.atm.sub',
    descriptionKey: 'places.atm.desc',
    googleMapsUrl: 'https://maps.google.com/?q=UniCredit+Bank+Dalmatinska+Sarajevo',
    isSurvival: true,
  },
  {
    id: 'konzum-dalmatinska',
    category: 'essential',
    tag: 'ESSENTIAL',
    name: 'Konzum (Dalmatinska)',
    subCategoryKey: 'places.konzum.sub',
    descriptionKey: 'places.konzum.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Konzum+Dalmatinska+Sarajevo',
    isSurvival: true,
  },
  {
    id: 'apoteka-titova',
    category: 'essential',
    tag: 'ESSENTIAL',
    name: 'Apoteka – Titova Street',
    subCategoryKey: 'places.apoteka.sub',
    descriptionKey: 'places.apoteka.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Apoteka+Titova+Sarajevo',
    isSurvival: true,
  },
  {
    id: 'u2-pizza',
    category: 'food',
    tag: 'LATE NIGHT BITES',
    name: 'U2 Pizza',
    subCategoryKey: 'places.u2.sub',
    descriptionKey: 'places.u2.desc',
    googleMapsUrl: 'https://maps.google.com/?q=U2+Pizza+Sarajevo',
    isSurvival: true, // Ночной спаситель, оставляем в Survival
  },

  // === FOOD ===
  {
    id: 'zeljo-cevapi',
    category: 'food',
    tag: 'TOP PICK',
    name: 'Željo',
    subCategoryKey: 'places.zeljo.sub',
    descriptionKey: 'places.zeljo.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Cevabdzinica+Zeljo+Sarajevo',
    isSurvival: false,
  },
  {
    id: 'pizzerija-mahir',
    category: 'food',
    tag: 'TOP PICK',
    name: 'Pizzerija Mahir',
    subCategoryKey: 'places.mahir.sub',
    descriptionKey: 'places.mahir.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Pizzerija+Mahir+Sarajevo',
    isSurvival: false,
  },
  {
    id: 'bakehouse-edin',
    category: 'food',
    tag: 'TOP PICK',
    name: 'Bakehouse Edin',
    subCategoryKey: 'places.edin.sub',
    descriptionKey: 'places.edin.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Pekara+Edin+Sarajevo',
    isSurvival: false,
  },

  // === BARS & NIGHTLIFE ===
  {
    id: 'pub-vucko',
    category: 'bars',
    tag: 'TOP PICK',
    name: 'Gastro Pub Vučko',
    subCategoryKey: 'places.vucko.sub',
    descriptionKey: 'places.vucko.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Gastro+Pub+Vucko+Sarajevo',
    isSurvival: false,
  },
  {
    id: 'zlatna-ribica',
    category: 'bars',
    tag: 'TOP PICK',
    name: 'Zlatna ribica',
    subCategoryKey: 'places.ribica.sub',
    descriptionKey: 'places.ribica.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Zlatna+ribica+Sarajevo',
    isSurvival: false,
    recommendedBy: 'Edin',
  },
  {
    id: 'kino-bosna',
    category: 'bars',
    tag: 'TOP PICK',
    name: 'Kino Bosna',
    subCategoryKey: 'places.kinobosna.sub',
    descriptionKey: 'places.kinobosna.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Kino+Bosna+Sarajevo',
    isSurvival: false,
  },

  // === CAFES & SWEETS ===
  {
    id: 'fabrika-coffee',
    category: 'cafes',
    tag: 'TOP PICK',
    name: 'Fabrika Coffee',
    subCategoryKey: 'places.fabrika.sub',
    descriptionKey: 'places.fabrika.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Fabrika+Coffee+Sarajevo',
    isSurvival: false,
  },
  {
    id: 'habitus-brunch',
    category: 'cafes',
    tag: 'TOP PICK',
    name: 'Habitus',
    subCategoryKey: 'places.habitus.sub',
    descriptionKey: 'places.habitus.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Habitus+Sarajevo',
    isSurvival: false,
  },

  // === SIGHTS & ACTIVITIES ===
  {
    id: 'yellow-fortress',
    category: 'sights',
    tag: 'TOP PICK',
    name: 'Yellow Fortress (Žuta Tabija)',
    subCategoryKey: 'places.yellowfort.sub',
    descriptionKey: 'places.yellowfort.desc',
    googleMapsUrl: 'https://maps.google.com/?q=Zuta+Tabija+Sarajevo',
    isSurvival: false,
  },
];
