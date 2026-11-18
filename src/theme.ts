import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F7F2',
  card: '#FFFFFF',
  text: '#1C2A1E',
  muted: '#66756A',
  border: '#DCE4DA',
  primary: '#2F7D4F',
  primaryText: '#FFFFFF',
  chip: '#E6EEE4',
  danger: '#C2410C',
  warn: '#B45309',
  warnBg: '#FEF3C7',
  dangerBg: '#FFE4D6',
};

const dark: typeof light = {
  bg: '#121713',
  card: '#1C231E',
  text: '#E8EFE9',
  muted: '#9AA89D',
  border: '#2C362F',
  primary: '#4CAF74',
  primaryText: '#0B140E',
  chip: '#26302A',
  danger: '#FB923C',
  warn: '#FBBF24',
  warnBg: '#3A2E0E',
  dangerBg: '#3D1E10',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
