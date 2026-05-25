export const Colors = {
  navy:      '#1A3A5C',
  blue:      '#2E6DA4',
  blueLight: '#DCE6F0',
  bg:        '#F7F9FC',
  white:     '#FFFFFF',
  text:      '#1A1A1A',
  muted:     '#666666',
  green:     '#27AE60',
  red:       '#C0392B',
  orange:    '#E67E22',
  purple:    '#8E44AD',
} as const;

export type ColorKey = keyof typeof Colors;
