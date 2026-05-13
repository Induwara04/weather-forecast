import type { SriLankaLocation } from '../types';

export const sriLankaLocations: SriLankaLocation[] = [
  {
    id: 'latonia-gardens',
    name: 'Latonia Gardens',
    district: 'Colombo Fringe',
    latitude: 6.8539097,
    longitude: 79.974176,
    focus: true,
  },
  {
    id: 'colombo',
    name: 'Colombo',
    district: 'Western',
    latitude: 6.9271,
    longitude: 79.8612,
  },
  {
    id: 'ratnapura',
    name: 'Ratnapura',
    district: 'Sabaragamuwa',
    latitude: 6.6828,
    longitude: 80.3992,
  },
  {
    id: 'kegalle',
    name: 'Kegalle',
    district: 'Sabaragamuwa',
    latitude: 7.2513,
    longitude: 80.3464,
  },
  {
    id: 'galle',
    name: 'Galle',
    district: 'Southern',
    latitude: 6.0535,
    longitude: 80.221,
  },
  {
    id: 'matara',
    name: 'Matara',
    district: 'Southern',
    latitude: 5.9485,
    longitude: 80.5353,
  },
  {
    id: 'trincomalee',
    name: 'Trincomalee',
    district: 'Eastern',
    latitude: 8.5874,
    longitude: 81.2152,
  },
  {
    id: 'batticaloa',
    name: 'Batticaloa',
    district: 'Eastern',
    latitude: 7.7102,
    longitude: 81.6924,
  },
  {
    id: 'kandy',
    name: 'Kandy',
    district: 'Central',
    latitude: 7.2906,
    longitude: 80.6337,
  },
  {
    id: 'nuwara-eliya',
    name: 'Nuwara Eliya',
    district: 'Central Highlands',
    latitude: 6.9497,
    longitude: 80.7891,
  },
  {
    id: 'jaffna',
    name: 'Jaffna',
    district: 'Northern',
    latitude: 9.6615,
    longitude: 80.0255,
  },
];

export const homeLocation =
  sriLankaLocations.find((location) => location.focus) ?? sriLankaLocations[0];
