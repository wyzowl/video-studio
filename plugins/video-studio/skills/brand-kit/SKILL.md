---
name: brand-kit
description: Create or update a brand kit in a Wyzowl Video Studio - logo files, colours, fonts, motion identity and rules in brands/<brand>/brand.json, shown on the brand's own page. Use when the user adds a brand, names a new brand for a video, or asks to change a brand.
---

# Brand kit

A brand kit keeps every video on brand, and lets the next video reuse it. It lives in `brands/<slug>/`:

```
brands/<slug>/
  brand.json   the kit: the one source of truth (format below)
  logos/       the brand's own logo files (SVG preferred)
  fonts/       font files the studio may use
  refs/        screenshots and reference images
```

The studio pages render each kit as a brand page at `/brands/<slug>/`. `PLUGIN` is this plugin's folder ("Plugin
files" in the session-start note).

## Create a kit

1. **Gather** (AskUserQuestion where choices help): the brand's name, its website, logo files, and any guidelines,
   colours or fonts they already know. Make the slug from the name (kebab-case).
2. **Read the website** if there is one: `node PLUGIN/scripts/site-palette.mjs <url>`. You get the colours its CSS uses
   most (with their CSS variable names), the fonts, and logo candidates. Look at the site itself too, to see which
   colour is the ground, which is text and which is the accent.
3. **Propose, then confirm.** Show the user the colour roles (background, text, one accent unless the brand clearly
   has more), the display and body fonts, and how the logo is used, and let them correct you. Candidates from CSS are
   evidence, not truth.
4. **Logos.** Never redraw or retype a logo. Use the files the user gives you. If they have none, offer to download
   the logo from their website, but only with their OK, preferring SVG. If only a small raster image exists, ask for a
   proper file. Note which logo goes on light and on dark backgrounds.
5. **Fonts.** Only use font files the user is allowed to use.
   - Google Fonts (SIL Open Font License) can be downloaded with the user's OK. Prefer the variable version.
   - Commercial fonts must come from the user, as licensed files.
   - If neither is possible, propose the closest free match and say so on the kit.
   - Record each font's licence.
6. **Motion identity.** Propose one personality, signature eases (GSAP names, such as `expo.out` for arrivals,
   `power3.inOut` for travel and `sine.inOut` for ambient), a three-step duration palette, one entrance pattern and an
   ambient layer, all from the brand's feel. The user confirms.
7. **Copy the files** into `logos/`, `fonts/` and `refs/`, then **write `brand.json` last**: writing it publishes the
   brand page, and the studio tells you its address.
8. **Show the brand page** `/brands/<slug>/` (see "Showing a page" in the production skill): beside the chat, with
   its card. Ask the user to check it and tell you anything to change.

## Update a kit

Change the files first, then edit `brand.json` and set `updated` to today. A brand page that's open refreshes itself;
if it isn't open, show it again. Videos already delivered keep their own copies of the brand's fonts and logos.

## brand.json

```json
{
  "name": "Example Co",
  "summary": "Specialty coffee roaster. Warm, crafted, unhurried.",
  "website": "https://example.com",
  "updated": "2026-10-14",
  "sources": ["Website CSS, 14 Oct 2026", "Brand guidelines PDF supplied by the client"],
  "colours": [
    { "name": "Forest", "hex": "#0F3D2E", "role": "Background", "notes": "The ground for most scenes" },
    { "name": "Cream", "hex": "#F4EDE1", "role": "Text" },
    { "name": "Copper", "hex": "#C8743B", "role": "Accent", "notes": "The one accent. Never body text." }
  ],
  "fonts": [
    { "role": "Display", "family": "Fraunces", "file": "fonts/Fraunces-VF.woff2", "weight": 800, "variable": true,
      "axes": "wght 100–900", "variation": "\"wght\" 800", "licence": "SIL OFL 1.1", "notes": "Headlines" },
    { "role": "Body", "family": "Inter", "file": "fonts/InterVariable.woff2", "weight": 400, "variable": true,
      "licence": "SIL OFL 1.1" }
  ],
  "logos": [
    { "file": "logos/example-co-cream.svg", "on": "dark", "name": "Primary, for dark backgrounds" },
    { "file": "logos/example-co-forest.svg", "on": "light", "name": "For light backgrounds" }
  ],
  "motion": {
    "personality": "Calm precision",
    "easing": [
      { "use": "Arrivals", "ease": "power3.out" },
      { "use": "Travel", "ease": "power2.inOut" },
      { "use": "Ambient", "ease": "sine.inOut" }
    ],
    "durations": [
      { "name": "Quick", "seconds": 0.3 },
      { "name": "Standard", "seconds": 0.6 },
      { "name": "Slow", "seconds": 1.2 }
    ],
    "spring": "stiffness 180, damping 26 (no visible bounce)",
    "entrance": "Rise 16 px and fade, staggered 60 ms",
    "ambient": "A slow drift on the paper texture",
    "notes": "Nothing bouncy except a tiny overshoot on UI."
  },
  "rules": ["One accent colour: copper.", "Cream text on forest, never the reverse for body copy."],
  "graphicLanguage": ["Rounded 12 px cards", "Hand-drawn coffee-bean line icons"],
  "voice": "Friendly and plain-spoken, a little poetic.",
  "references": [{ "file": "refs/homepage.png", "caption": "Homepage" }],
  "style": { "card": "#F4EDE1", "radius": "12px", "labelFont": "IBM Plex Mono" }
}
```

- `colours[].role` drives the pages: the colour whose role mentions background, ground or primary paints the brand's
  card, and the accent marks the brand on the dashboard.
- `logos[].on` is `light`, `dark` or `brand` (shown on the brand's ground colour); add `"background": "#hex"` to force
  a specific panel colour.
- `fonts[].file` is optional for fonts installed on the machine. `variation` holds `font-variation-settings` for
  variable fonts. `sample` overrides the specimen sentence.
- `style` dresses the library items (widgets, layouts, text effects, transitions and data) in the brand: `card` is the colour of widget cards
  (without it, the background colour), `radius` the corner rounding of cards and windows (take it from the website's
  cards or buttons; default 16px), and `labelFont` the family for small capitals labels, such as a mono (include its
  file under `fonts` with the role `Label`). The rest comes from the colours (text, secondary text, accent), the
  display and body fonts, and the "Travel" ease. Open the library in the brand to check it.
- Everything except `name` is optional, but a kit isn't ready for a video until it has colours, fonts and a logo (or
  the user has agreed to go without one).
