
// Resource units constants
export const RESOURCE_UNITS = [
  'units',
  'sets',
  'kits',
  'packages',
  'boxes',
  'pieces',
  'kilograms',
  'liters',
  'meters'
] as const

export type ResourceUnit = typeof RESOURCE_UNITS[number]