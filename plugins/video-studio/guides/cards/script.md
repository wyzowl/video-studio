# Card: the script

The script's guides on a page, for the script skill: read it once a session in their place, with the guide for the
video's type (`../story/types/`, its shapes and must-dos). Each section names its full guide, and when to open it. The
numbers are `../numbers.md`'s.

## Before writing

Know the brief well enough to say what it is and what it really does (the mechanism, step by step), who it's for, the
one message, the ask, the length and anything that must be in it, and the tone. When one is unclear, ask: a wrong
idea of what the product does sinks the whole film.

## The Story standard (`../story/principles.md`)

- **One clear message,** stated by the second beat; everything after supports it.
- **A promise kept:** the closing picture resolves the opening (the queue that opened the film is empty).
- **Benefit-led:** what the viewer gets, not features ("Your invoices chase themselves", not "automated reminder
  workflows"); the real product at the "how it works" beats, one benefit a beat; an abstract idea made concrete with a
  metaphor the picture can carry.
- **Flowing, not a slideshow:** each row picks up from the last, and sentences carry across rows ("Book a desk…",
  "…from anywhere…").
- **One ask at the end,** with the brand: a memorable line, then exactly what to do and where.
- **The usual shape** (a default; the type's guide has its own): the hook; the stakes (optional); the answer arrives,
  and the brand; how it works; the better world, mirroring the opening; the ask.
- An 8 is clear and well shaped, with one beat that drifts or an ending that could land harder. A feature tour, a slow
  start, a forgotten promise or a vague ending scores lower: the guide's "What lowers it" has each one's fix.

## The hook (`../story/hooks.md`)

- The promise is clear by 3 s (1.5 s in a vertical feed), in the viewer's language: a gap they want closed (a problem
  felt, a question, a claim that surprises, a future they want). Never "Welcome to…", "Introducing…", the company
  first, or a definition.
- The opening line and picture make the same move, and the ending pays the promise off.
- Write two or three openings from different patterns, the strongest in row 1 and the others in `summary`:
  - through the words: The Itch (a frustration they already feel), The Turn (the world has changed), The Open
    Question, The Upside-down (it contradicts a belief), The Number (one figure with stakes, sparingly), The Picture
    (an abstract idea made physical), The Name (a term worth knowing), The Call-out (exactly who it's for), The
    What-if, The Meet (a person whose story it is), The Cost (of ignoring it), The Before-and-after;
  - through the picture: The Swap, The Typed Thought, The Timeline, The Pile-up, The Shortlist, The Ask, The Mystery,
    The Roll-call, The Busy Room, The Cold Number, The Little Trick.
- Open `../story/hooks.md` while choosing them: each one's example line and scene pattern, and which suit the type.

## The words (`../story/narration.md`)

- **For the ear:** to one person, as "you", with contractions; one or two sentences a row, about 6–20 words, with
  phrase breaks the picture can land on; shorter than the video, with room to breathe; numbers written as they're
  said ("nearly two million"). Read it aloud.
- **Like a person:** plain verbs and specific nouns; none of the stock phrases ("unlock the power of", "seamless",
  "streamline your workflow", "game-changer", "elevate", "say goodbye to…", "look no further"); no stacked adjectives,
  triplets by reflex, filler ("really", "just", "simply") or borrowed drama ("Here's the thing:"); full stops and
  commas, dashes and exclamation marks rarely.
- **Words on screen:** a few key words that echo or sharpen what's said, as it's said, bold in the script. Without a
  voiceover they're the script: short lines, one idea each.
- When the user brings the words (theirs kept, or reshaped when they ask), open `../story/narration.md`.

## The numbers (`../numbers.md`)

- **Pace:** about 135 words a minute (2.25 a second); calm reads 120–130, brisk 150–160, rushed past 170.
- **A beat:** one or two sentences, 2–8 s; a scene usually 2–8 s too.
- **Reading:** 0.5 s to find a line and 0.3 s a word; a line holds that plus 0.5 s (1 s at least); something to take
  in (a figure and its label, a widget, a list) holds 3 s or twice its reading time.
- **On screen:** a headline of 2–7 words; about 12 words at once at most (captions and interface shown as a picture
  don't count); a line at headline size up to about 35 characters at 16:9, 25 at 1:1 and 4:5, 20 at 9:16.
- **The end:** the ask holds 2.5 s at least (a short film's, a twentieth of its length), with the brand.

`studio.mjs check <project> --script` measures the hook's length, the words each row puts on screen, the pace against
the brief's length and the longest beat, against these numbers.

---
Sources: Video Studio's own summary of its guides (`../story/`, `../numbers.md`); see each guide's sources.
