export const categories = [
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof categories)[number];

const primitives = {
  neutral: {
    '01': { '100': '#FEFEFE', '95': '#FEFEFEF2', '20': '#FEFEFE33', '10': '#FEFEFE1A' },
    '02': { '100': '#F3F5F7', '50': '#F3F5F780' },
    '03': { '100': '#E8ECEF', '75': '#E8ECEFBF', '50': '#E8ECEF80' },
    '04': { '100': '#6C7275', '75': '#6C7275BF', '50': '#6C727580', '25': '#6C727540', '15': '#6C727526' },
    '05': { '100': '#343839', '50': '#34383980' },
    '06': { '100': '#232627', '95': '#232627F2', '90': '#232627E5', '50': '#23262780' },
    '07': { '100': '#141718', '95': '#141718F2', '90': '#141718E5', '50': '#14171880' },
  },
  primary: {
    '01': { '100': '#8E55EA', '50': '#8E55EA80', '10': '#8E55EA1A', '5': '#8E55EA0D' },
    '02': '#3FDD78',
  },
  accents: {
    '01': '#D84C10',
    '02': '#3E90F0',
    '03': '#8E55EA',
    '04': '#8C6584',
    '05': '#DDA73F',
  },
  status: {
    successSubtle: '#ECFCF1',
    warningSubtle: '#FCF6EC',
    dangerSubtle: '#FBEDE7',
  },
  category: {
    groceries: '#29B26E',
    dining: '#FF9433',
    transport: '#338CFF',
    shopping: '#ED59A6',
    bills: '#F2BF1A',
    other: '#999EA8',
  },
} as const;

const category = {
  Groceries: primitives.category.groceries,
  Dining: primitives.category.dining,
  Transport: primitives.category.transport,
  Shopping: primitives.category.shopping,
  Bills: primitives.category.bills,
  Other: primitives.category.other,
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
  bg: primitives.neutral['02']['100'],
  surface: primitives.neutral['01']['100'],
  text: primitives.neutral['07']['100'],
  muted: primitives.neutral['04']['100'],
  accent: primitives.primary['01']['100'],
  accentText: primitives.neutral['01']['100'],
  border: primitives.neutral['03']['100'],
  success: primitives.primary['02'],
  warning: primitives.accents['05'],
  danger: primitives.accents['01'],
  scrim: primitives.neutral['07']['50'],
  glass: primitives.neutral['01']['20'],
  borderStrong: primitives.neutral['04']['25'],
  category,
  spacing,
  radius,
  type,
};

export const dark = {
  bg: primitives.neutral['07']['100'],
  surface: primitives.neutral['06']['100'],
  text: primitives.neutral['01']['100'],
  muted: primitives.neutral['04']['100'],
  accent: primitives.primary['01']['100'],
  accentText: primitives.neutral['07']['100'],
  border: primitives.neutral['05']['100'],
  success: primitives.primary['02'],
  warning: primitives.accents['05'],
  danger: primitives.accents['01'],
  scrim: primitives.neutral['07']['90'],
  glass: primitives.neutral['07']['50'],
  borderStrong: primitives.neutral['04']['50'],
  category,
  spacing,
  radius,
  type,
};

export type Theme = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  scrim: string;
  glass: string;
  borderStrong: string;
  category: {
    Groceries: string;
    Dining: string;
    Transport: string;
    Shopping: string;
    Bills: string;
    Other: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
  };
  type: {
    label: number;
    body: number;
    title: number;
    display: number;
  };
};
