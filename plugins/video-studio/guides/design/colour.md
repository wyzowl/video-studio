# Colour

Using colour in a video frame. The brand kit's colours are exact and come first (`brand.json` `colours` and
`backgrounds`); these notes are about applying them. Contrast numbers are in `../numbers.md`.

## Roles first

Give each colour a job before using it: the **ground**, the **text**, the **focal** colour and the **accent**, plus
any **state** colours (success, warning) the content really has. Declare them once for the film and don't invent
colours element by element.

- **One accent,** unless the brand clearly has more. It marks the one thing that matters in a frame; used
  everywhere, it marks nothing. Never body text.
- **Keep saturation where it counts:** strong colour on the focal element, quieter colour elsewhere.
- **Tonal steps before effects:** separate surfaces with a step of the same hue (a slightly lighter card on its
  ground) before reaching for a shadow or a glow.
- **Tinted neutrals:** greys and near-blacks leaning a little towards the brand's hue look designed; dead grey and
  pure `#000` or `#fff` look unconsidered, unless the brand uses them.
- **The same ground across scenes** by default, with a deliberate change of polarity (a light scene among dark ones)
  for rhythm.

## Presence

Muted is fine; flat isn't. Every frame has at least one colour that pulls the eye.
- The accent is visible: about 15–25% strength in atmosphere (a glow, a wash), full strength on the focal element.
  Under about 10% it disappears in compression.
- **Dark grounds** make accent glows and light type pop. **Light grounds** need more structure (bolder rules and
  borders, 2 px and up), full-strength accent hits and a little texture (fine grain, a pattern), or they look like
  an empty slide. Don't swap a light brand to dark: make light look cinematic.
- Light or dark by the content when the brand allows either: food, wellness and children's subjects usually light;
  technology, cinema and finance often dark.

## Gradients and banding

Video compression turns smooth gradients into visible bands, worst in large, dark, slow gradients across the whole
frame.
- Prefer a radial gradient, a solid ground with a local glow, or a gradient with real texture in it, to a
  full-frame linear gradient on a dark ground.
- Add a fine, still grain over large gradients (an SVG `feTurbulence` noise layer at 2–4% opacity): noise breaks the
  steps up before the encoder sees them, the same idea as dithering an image.
- Render masters at delivery quality, and check gradients in the render itself, not the browser.

## Without a brand

When a video has no brand kit, choose one hue for the film and build the ground, text and accent from it at
different lightnesses (OKLCH makes the steps even), tinting the neutrals towards it. Then question the defaults
generated designs reach for: cyan on near-black, purple-to-blue gradients, neon accents, a cream ground with a
terracotta accent, near-black with one acid-green accent. Each is right for some subjects; use one only when it's
chosen for this one.

## On footage and photographs

- Words over a picture are measured against the real pixels behind them; a calm area of the picture, a scrim (a
  soft dark or light gradient behind the words) or a solid panel keeps them readable.
- Light text over a person or a bright wall washes out: move it onto a darker area or give it an opaque panel.
- Shift the text colour a touch against the scene's cast (a warmer white on a cool scene, a cooler one on a warm
  scene) when the brand allows.

---
Sources: written for Video Studio from HyperFrames' house style and video composition notes in hyperframes-creative,
and the error-diffusion dithering in media-use (v0.8.149, Apache-2.0, © HeyGen), Anthropic's frontend-design skill
(Apache-2.0, © Anthropic) and DiffusionStudio's text-to-lottie colour notes (MIT, © Diffusion Studio Inc.), changed:
rewritten for Video Studio; the dithering kept only as the idea behind breaking up banding. See NOTICE.
