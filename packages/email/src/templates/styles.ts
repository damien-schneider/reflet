/**
 * Shared email design system
 * Minimal modern aesthetic aligned with Reflet brand identity
 *
 * Colors derived from globals.css oklch values:
 * - background: oklch(0.97 0.005 85) → #F7F7F4
 * - foreground: oklch(0.15 0.015 75) → #1A1814
 * - muted-foreground: oklch(0.5 0.01 75) → #7A7770
 * - border: oklch(0.88 0.008 85) → #E0DED9
 * - olive-600: oklch(0.466 0.025 107.3) → #5C6D4F
 * - olive-700: oklch(0.394 0.023 107.4) → #4A5840
 */

// Brand Colors (matching globals.css)
export const colors = {
  // Brand olive palette
  olive: {
    100: "#F4F5F2",
    200: "#E8EAE4",
    600: "#5C6D4F",
    700: "#4A5840",
    800: "#3A4532",
  },

  // Semantic colors from globals.css
  background: "#F7F7F4",
  foreground: "#1A1814",
  card: "#FDFCFB",
  muted: "#F0EFEA",
  mutedForeground: "#7A7770",
  border: "#E0DED9",
} as const;

// Typography
export const fonts = {
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  sans: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

// Shared component styles
export const baseStyles = {
  // Layout
  body: {
    backgroundColor: colors.background,
    fontFamily: fonts.sans,
    margin: 0,
    padding: "48px 16px",
  },
  container: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    margin: "0 auto",
    maxWidth: "560px",
    overflow: "hidden" as const,
  },

  // Header - no border for clean dark mode compatibility
  header: {
    padding: "28px 40px 24px",
    textAlign: "center" as const,
  },
  wordmark: {
    color: colors.olive[600],
    fontFamily: fonts.display,
    fontSize: "24px",
    fontWeight: "400" as const,
    letterSpacing: "-0.02em",
    margin: 0,
  },

  // Content
  content: {
    padding: "40px 40px 48px",
  },

  // Typography
  heading: {
    color: colors.foreground,
    fontFamily: fonts.display,
    fontSize: "28px",
    fontWeight: "400" as const,
    letterSpacing: "-0.02em",
    lineHeight: "1.2",
    margin: "0 0 20px",
  },
  paragraph: {
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: "15px",
    lineHeight: "1.7",
    margin: "0 0 16px",
  },
  list: {
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: "15px",
    lineHeight: "1.7",
    margin: "0 0 28px",
    paddingLeft: "20px",
  },
  listItem: {
    margin: "8px 0",
  },

  // Button - centered
  buttonWrapper: {
    textAlign: "center" as const,
    margin: "28px 0 8px",
  },
  button: {
    backgroundColor: "#6B7C5E",
    borderRadius: "8px",
    color: "#FFFFFF",
    display: "inline-block",
    fontFamily: fonts.sans,
    fontSize: "14px",
    fontWeight: "500" as const,
    padding: "10px 24px",
    textDecoration: "none",
  },

  // Secondary elements
  linkText: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.6",
    margin: "0 0 6px",
  },
  link: {
    color: colors.olive[600],
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.6",
    wordBreak: "break-all" as const,
  },
  hr: {
    border: "none",
    borderTop: `1px solid ${colors.border}`,
    margin: "28px 0",
  },
  disclaimer: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.6",
    margin: 0,
  },
  expiryText: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.6",
    margin: "20px 0 0",
    textAlign: "center" as const,
  },

  // Footer - unique branded design
  footer: {
    backgroundColor: colors.muted,
    padding: "24px 40px",
    textAlign: "center" as const,
  },
  footerBrand: {
    color: colors.olive[600],
    fontFamily: fonts.display,
    fontSize: "16px",
    fontWeight: "400" as const,
    letterSpacing: "-0.01em",
    margin: "0 0 8px",
  },
  footerText: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "12px",
    lineHeight: "1.6",
    margin: 0,
  },
  footerLink: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "12px",
    textDecoration: "underline",
  },
} as const;
