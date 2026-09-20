export const colors = {
  background: "#F8F8F6",
  border: "#DDDCD9",
  brand: "#59724B",
  brandForeground: "#FFFFFF",
  card: "#FFFFFF",
  foreground: "#1D1E21",
  muted: "#F1F0EE",
  mutedForeground: "#5E6065",
} as const;

export const fonts = {
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  sans: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export const baseStyles = {
  body: {
    backgroundColor: colors.background,
    fontFamily: fonts.sans,
    margin: 0,
    padding: "48px 16px",
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: "8px",
    color: colors.brandForeground,
    display: "inline-block",
    fontFamily: fonts.sans,
    fontSize: "14px",
    fontWeight: "500" as const,
    padding: "10px 24px",
    textDecoration: "none",
  },

  buttonWrapper: {
    margin: "28px 0 8px",
    textAlign: "center" as const,
  },
  container: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    margin: "0 auto",
    maxWidth: "560px",
    overflow: "hidden" as const,
  },

  // Content
  content: {
    padding: "40px 40px 48px",
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
    color: colors.brand,
    fontFamily: fonts.display,
    fontSize: "16px",
    fontWeight: "400" as const,
    letterSpacing: "-0.01em",
    margin: "0 0 8px",
  },
  footerLink: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "12px",
    textDecoration: "underline",
  },
  footerText: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "12px",
    lineHeight: "1.6",
    margin: 0,
  },

  // Header - no border for clean dark mode compatibility
  header: {
    padding: "28px 40px 24px",
    textAlign: "center" as const,
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
  hr: {
    border: "none",
    borderTop: `1px solid ${colors.border}`,
    margin: "28px 0",
  },
  link: {
    color: colors.brand,
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.6",
    wordBreak: "break-all" as const,
  },

  // Secondary elements
  linkText: {
    color: colors.mutedForeground,
    fontFamily: fonts.sans,
    fontSize: "13px",
    lineHeight: "1.6",
    margin: "0 0 6px",
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
  paragraph: {
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: "15px",
    lineHeight: "1.7",
    margin: "0 0 16px",
  },
  wordmark: {
    color: colors.brand,
    fontFamily: fonts.display,
    fontSize: "24px",
    fontWeight: "400" as const,
    letterSpacing: "-0.02em",
    margin: 0,
  },
} as const;
