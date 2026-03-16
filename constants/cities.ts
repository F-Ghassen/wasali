export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
}

export const EU_ORIGIN_CITIES: City[] = [
  { id: 'paris', name: 'Paris', country: 'France', countryCode: 'FR', flag: '🇫🇷' },
  { id: 'lyon', name: 'Lyon', country: 'France', countryCode: 'FR', flag: '🇫🇷' },
  { id: 'marseille', name: 'Marseille', country: 'France', countryCode: 'FR', flag: '🇫🇷' },
  { id: 'toulouse', name: 'Toulouse', country: 'France', countryCode: 'FR', flag: '🇫🇷' },
  { id: 'nice', name: 'Nice', country: 'France', countryCode: 'FR', flag: '🇫🇷' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE', flag: '🇩🇪' },
  { id: 'munich', name: 'Munich', country: 'Germany', countryCode: 'DE', flag: '🇩🇪' },
  { id: 'frankfurt', name: 'Frankfurt', country: 'Germany', countryCode: 'DE', flag: '🇩🇪' },
  { id: 'hamburg', name: 'Hamburg', country: 'Germany', countryCode: 'DE', flag: '🇩🇪' },
  { id: 'cologne', name: 'Cologne', country: 'Germany', countryCode: 'DE', flag: '🇩🇪' },
  { id: 'milan', name: 'Milan', country: 'Italy', countryCode: 'IT', flag: '🇮🇹' },
  { id: 'rome', name: 'Rome', country: 'Italy', countryCode: 'IT', flag: '🇮🇹' },
  { id: 'madrid', name: 'Madrid', country: 'Spain', countryCode: 'ES', flag: '🇪🇸' },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', countryCode: 'ES', flag: '🇪🇸' },
  { id: 'brussels', name: 'Brussels', country: 'Belgium', countryCode: 'BE', flag: '🇧🇪' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', flag: '🇳🇱' },
  { id: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧' },
  { id: 'zurich', name: 'Zurich', country: 'Switzerland', countryCode: 'CH', flag: '🇨🇭' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', countryCode: 'SE', flag: '🇸🇪' },
];

export const TN_DESTINATION_CITIES: City[] = [
  { id: 'tunis', name: 'Tunis', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'sfax', name: 'Sfax', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'sousse', name: 'Sousse', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'gabes', name: 'Gabès', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'bizerte', name: 'Bizerte', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'kairouan', name: 'Kairouan', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'monastir', name: 'Monastir', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'nabeul', name: 'Nabeul', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'hammamet', name: 'Hammamet', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
  { id: 'gafsa', name: 'Gafsa', country: 'Tunisia', countryCode: 'TN', flag: '🇹🇳' },
];

export const ALL_CITIES = [...EU_ORIGIN_CITIES, ...TN_DESTINATION_CITIES];
