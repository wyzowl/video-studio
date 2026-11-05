# Brand, and the Brand accuracy standard

Using a brand kit well, and the standard the review's **Brand accuracy** score is judged against. Making and
changing a kit is the brand-kit skill's job (`brand.json`, its files and its page); this page is about a video using
it.

## The Brand accuracy standard

### What good looks like

- **The kit's colours, exactly,** in their roles: the ground on the ground, text in the text colour, the accent on
  the one thing that matters, with the kit's rules kept (`brand.json` `rules`). No colours from outside the kit
  except what the content really needs (a state colour, a photograph's own colours).
- **The kit's fonts,** in their roles and weights, from the kit's files; the variable font resting on the brand's
  weight.
- **The real logo,** from the kit's files, the right version for its ground, never redrawn, retyped, recoloured,
  stretched or crowded, with clear space around it; the kit's ident sound when it lands (`../audio/sfx.md`).
- **The brand's motion identity:** its personality, eases, durations and entrance (`brand.json` `motion`) as the
  film's defaults (`../motion/quality.md`).
- **Its grounds and graphic language:** scenes stand on the kit's backgrounds as the kit says to use them, and
  shapes, icons and corners follow its `graphicLanguage` and `style`.
- **Its voice** in the words on screen (`brand.json` `voice`).
- **Its real things:** the real product, screens, people and places (below).
- It looks like the brand on its best day, not a template with the brand's colours poured in.

### How to get there

- **Brief and script:** the brand named, its kit ready (colours, fonts and a logo, or the user's OK to go without);
  the voice and any rules read before writing.
- **Storyboard:** frames built in the kit's fonts, colours, backgrounds and logo files, with real assets in place or
  marked as placeholders.
- **Build:** colours and fonts taken from the kit as variables, never retyped by eye; the logo from its file; library
  items dressed by the kit (fix the kit's `style` rather than restyling an item by hand).
- **Review:** compare every key frame against the brand page: colours, type, logo use, grounds, motion.

### What lowers it

| What you see | Usual cause | Fix |
|---|---|---|
| A colour that isn't the brand's | a colour picked by eye, or a library default | the kit's colours as variables |
| The wrong font or weight | a fallback font; a missing file; a weight the font doesn't have | the kit's font files, loaded and waited for (`../format.md`, "Fonts") |
| A logo that looks off | redrawn, recoloured, stretched, the wrong version for the ground, crowded | the kit's file, the version for that ground, with clear space |
| Generic | the brand's colours over a template look | the brand's graphic language, grounds and motion; real assets |
| Motion that isn't theirs | default eases and durations | the kit's `motion` |
| Fake product | an invented interface or stock picture standing in for the real thing | the real screens and pictures, or a marked placeholder |

### How it's scored

| Score | Means |
|---|---|
| 9–10 | Unmistakably the brand: exact colours, fonts and logo, its motion and voice, its real product, at its best |
| 8 | On brand, with a small slip (a colour role, a weight, a looser logo space) |
| 6–7 | Recognisably the brand's colours and logo, but generic in its look or motion |
| 4–5 | Off-brand in places: wrong colours or fonts, a logo misused, invented assets |
| 1–3 | Not the brand: wrong logo, wrong colours, or another company's look |

The checks measure what they can: colours and fonts outside the kit (Video Studio's checks, once built) and
contrast (`../cli.md`). The review judges the rest against the brand page.

## Real assets

- **The real logo,** always from the kit's files (`logos/`). If one is missing, ask, or leave a clearly marked
  placeholder: never draw or type one.
- **The real product:** its interface from the user's screenshots, recordings or a capture of their site
  (`../cli.md`, "capture"), with the user's OK. An interface rebuilt in HTML for animation copies the real one
  faithfully, with real content in it; never invent features or screens the product doesn't have.
- **Real photographs and footage** from the user or the brand's own site with their OK; never stock pictures or
  generated images standing in for the brand's own.
- **Real people and places** only as the user supplies them.
- **No other company's marks:** another brand's logo, product or interface appears only when the brief needs it and
  the user supplies it (a partner logo, an integration they have the right to show).
- **Real facts:** figures and claims exactly as given (`data.md`, "Truth first").

---
Sources: Video Studio's own standard and production rules, with HyperFrames' notes on applying a design spec in
hyperframes-creative (v0.8.149, Apache-2.0, © HeyGen) rewritten in it. See NOTICE.
