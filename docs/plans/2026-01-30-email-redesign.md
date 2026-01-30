# Email Design System Redesign

**Date:** 2026-01-30
**Status:** Implemented

## Overview

Redesigned all email templates to follow a minimal modern aesthetic that aligns with the Reflet brand identity. The new design features Instrument Serif for headings, Instrument Sans for body text, olive brand colors, and warm cream tones matching the app's design system.

## Design Principles

- **Minimal Modern**: Apple-style simplicity with generous whitespace
- **Brand-aligned**: Uses olive palette, Instrument fonts, and colors from globals.css
- **Content-first**: Clean structure that lets content breathe

## Color Palette (from globals.css oklch values)

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `olive.600` | `#5C6D4F` | Buttons, links, wordmark |
| `olive.700` | `#4A5840` | Button hover state |
| `background` | `#F7F7F4` | Email body background |
| `card` | `#FDFCFB` | Card/container background |
| `foreground` | `#1A1814` | Heading & body text |
| `muted` | `#F0EFEA` | Footer background |
| `mutedForeground` | `#7A7770` | Secondary text, disclaimers |
| `border` | `#E0DED9` | Container & section borders |

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Display/Headings | Instrument Serif | 28px | 400 |
| Wordmark | Instrument Serif | 24px | 400 |
| Body text | Instrument Sans | 15px | 400 |
| Buttons | Instrument Sans | 14px | 500 |
| Secondary text | Instrument Sans | 13px | 400 |

## Components

### Button
- Pill shape (`border-radius: 9999px`)
- Olive background (`#5C6D4F`)
- Centered alignment
- Padding: 12px 28px

### Footer
- Muted background (`#F0EFEA`)
- Branded "Reflet" wordmark in Instrument Serif
- Contact link with underline style

## Structure

```
+----------------------------------+
|  Reflet (wordmark, centered)     |  <- Instrument Serif, olive
|  ─────────────────────────────   |
+----------------------------------+
|                                  |
|  Heading (Instrument Serif)      |
|                                  |
|  Body text (Instrument Sans)     |
|                                  |
|      [ Pill Button ]             |  <- Centered, olive, pill
|                                  |
+----------------------------------+
|  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  |  <- Muted background
|  Reflet                          |
|  Des questions ? Contactez-nous  |
+----------------------------------+
```

## Files Modified

- `packages/email/src/templates/styles.ts` - Shared design system with brand colors
- `packages/email/src/templates/base-layout.tsx` - Layout with fonts, wordmark, branded footer
- `packages/email/src/templates/welcome-email.tsx` - Updated with centered button
- `packages/email/src/templates/invitation-email.tsx` - Updated with centered button
- `packages/email/src/templates/verification-email.tsx` - Updated with centered button
- `packages/email/src/templates/password-reset-email.tsx` - Updated with centered button
- `packages/email/package.json` - Added styles export

## Future Enhancements

- Replace wordmark with logo image when available
- Add organization-specific branding support (dynamic colors from org settings)
