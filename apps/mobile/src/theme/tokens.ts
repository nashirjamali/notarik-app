export const categories = [
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof categories)[number];

const category = {
  Groceries: "#009E73",
  Dining: "#E69F00",
  Transport: "#0072B2",
  Shopping: "#CC79A7",
  Bills: "#D55E00",
  Other: "#6B6B76",
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

const type = {
  label: 13,
  body: 16,
  title: 22,
  display: 28,
} as const;

export const light = {
  bg: "#F4F5FB",
  surface: "#FFFFFF",
  text: "#1C1B2E",
  muted: "#5C5A73",
  accent: "#3730A3",
  accentText: "#FFFFFF",
  border: "#E2E3F0",
  success: "#067647",
  warning: "#B45309",
  danger: "#B91C1C",
  category,
  spacing,
  radius,
  type,
};

export const dark = {
  ...light,
  bg: "#12121A",
  surface: "#1C1C28",
  text: "#F4F4FB",
  muted: "#A7A6BD",
  accent: "#A5B4FC",
  accentText: "#12121A",
  border: "#2E2E42",
  success: "#6EE7B7",
  warning: "#FCD34D",
  danger: "#FCA5A5",
};

export type Theme = typeof light;
