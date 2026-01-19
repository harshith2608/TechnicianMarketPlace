export const COUNTRY_CODES = [
  { id: 'IN', name: 'India', code: '+91', pattern: /^\d{10}$/, flag: '🇮🇳' },
  { id: 'US', name: 'United States', code: '+1', pattern: /^\d{10}$/, flag: '🇺🇸' },
  { id: 'GB', name: 'United Kingdom', code: '+44', pattern: /^\d{10}$/, flag: '🇬🇧' },
  { id: 'CA', name: 'Canada', code: '+1', pattern: /^\d{10}$/, flag: '🇨🇦' },
  { id: 'AU', name: 'Australia', code: '+61', pattern: /^\d{9}$/, flag: '🇦🇺' },
  { id: 'DE', name: 'Germany', code: '+49', pattern: /^\d{10}$/, flag: '🇩🇪' },
  { id: 'FR', name: 'France', code: '+33', pattern: /^\d{9}$/, flag: '🇫🇷' },
  { id: 'JP', name: 'Japan', code: '+81', pattern: /^\d{10}$/, flag: '🇯🇵' },
  { id: 'SG', name: 'Singapore', code: '+65', pattern: /^\d{8}$/, flag: '🇸🇬' },
  { id: 'AE', name: 'Dubai', code: '+971', pattern: /^\d{9}$/, flag: '🇦🇪' },
  { id: 'PK', name: 'Pakistan', code: '+92', pattern: /^\d{10}$/, flag: '🇵🇰' },
  { id: 'BD', name: 'Bangladesh', code: '+880', pattern: /^\d{10}$/, flag: '🇧🇩' },
  { id: 'LK', name: 'Sri Lanka', code: '+94', pattern: /^\d{9}$/, flag: '🇱🇰' },
  { id: 'TH', name: 'Thailand', code: '+66', pattern: /^\d{9}$/, flag: '🇹🇭' },
  { id: 'MY', name: 'Malaysia', code: '+60', pattern: /^\d{9}$/, flag: '🇲🇾' },
];

export const getCountryByCode = (code) => {
  return COUNTRY_CODES.find(country => country.code === code);
};

export const getCountryByName = (name) => {
  return COUNTRY_CODES.find(country => country.name === name);
};
