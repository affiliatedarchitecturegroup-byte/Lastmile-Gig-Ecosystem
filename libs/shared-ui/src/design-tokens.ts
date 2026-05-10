/**
 * Lastmile Gig Design System Tokens
 *
 * These tokens are the single source of truth for the visual identity
 * of the Lastmile Gig platform across Next.js, Angular, and React Native.
 *
 * @see docs/specs/03_FRONTEND_SPEC.md - Section 5.1
 */

// --- Color Palette ---

export const colors = {
  // Core Brand
  black: '#090909',
  black2: '#111111',
  black3: '#1a1a1a',
  yellow: '#FFD700',
  yellow2: '#FFC200',
  white: '#F5F5F0',

  // Nature / Sustainability
  olive: '#6B7C45',
  oliveLight: '#8A9E5A',
  green: '#3D6B20',
  greenLight: '#6DAB40',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutral
  gray50: '#FAFAFA',
  gray100: '#F4F4F5',
  gray200: '#E4E4E7',
  gray300: '#D4D4D8',
  gray400: '#A1A1AA',
  gray500: '#71717A',
  gray600: '#52525B',
  gray700: '#3F3F46',
  gray800: '#27272A',
  gray900: '#18181B',
} as const;

// --- Typography ---

export const fonts = {
  display: "'Bebas Neue', sans-serif",
  body: "'Space Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
  '6xl': '3.75rem', // 60px
  '7xl': '4.5rem',  // 72px
} as const;

export const fontWeights = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

// --- Spacing (4px base) ---

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

// --- Border Radius ---

export const borderRadius = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// --- Shadows ---

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
} as const;

// --- Breakpoints ---

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// --- Z-Index Scale ---

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// --- Animation Durations ---

export const transitions = {
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// --- CSS Custom Properties Generator ---

export function generateCSSVariables(): string {
  return `
:root {
  /* Colors */
  --color-black: ${colors.black};
  --color-black-2: ${colors.black2};
  --color-black-3: ${colors.black3};
  --color-yellow: ${colors.yellow};
  --color-yellow-2: ${colors.yellow2};
  --color-white: ${colors.white};
  --color-olive: ${colors.olive};
  --color-olive-light: ${colors.oliveLight};
  --color-green: ${colors.green};
  --color-green-light: ${colors.greenLight};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --color-info: ${colors.info};

  /* Typography */
  --font-display: ${fonts.display};
  --font-body: ${fonts.body};
  --font-mono: ${fonts.mono};

  /* Spacing */
  --space-1: ${spacing[1]};
  --space-2: ${spacing[2]};
  --space-3: ${spacing[3]};
  --space-4: ${spacing[4]};
  --space-6: ${spacing[6]};
  --space-8: ${spacing[8]};
  --space-12: ${spacing[12]};
  --space-16: ${spacing[16]};

  /* Border Radius */
  --radius-sm: ${borderRadius.sm};
  --radius-md: ${borderRadius.md};
  --radius-lg: ${borderRadius.lg};

  /* Transitions */
  --transition-fast: ${transitions.fast};
  --transition-normal: ${transitions.normal};
  --transition-slow: ${transitions.slow};
  --transition-easing: ${transitions.easing};
}
  `.trim();
}
