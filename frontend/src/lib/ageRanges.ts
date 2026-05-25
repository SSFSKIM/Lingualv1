export type AgeRange = {
  label: string;
  midpoint: number;
};

export const AGE_RANGES: AgeRange[] = [
  { label: 'Under 12', midpoint: 10 },
  { label: '12 – 17', midpoint: 14 },
  { label: '18 – 24', midpoint: 21 },
  { label: '25 – 30', midpoint: 27 },
  { label: '31 – 39', midpoint: 35 },
  { label: '40 – 49', midpoint: 44 },
  { label: '50 – 59', midpoint: 54 },
  { label: '60+', midpoint: 65 },
];

export function ageToRangeLabel(age: number | null | undefined): string {
  if (!age) return '';
  if (age < 12) return 'Under 12';
  if (age <= 17) return '12 – 17';
  if (age <= 24) return '18 – 24';
  if (age <= 30) return '25 – 30';
  if (age <= 39) return '31 – 39';
  if (age <= 49) return '40 – 49';
  if (age <= 59) return '50 – 59';
  return '60+';
}
