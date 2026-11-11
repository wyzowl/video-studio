# Video Studio's guides

How Video Studio makes a film: one subject to a guide, written once. The skills (production, script, storyboard,
build, review, brand-kit) say what to do and when; these guides say how, and the review scores against the standards
here. Each stage reads its card first (`cards/`: the essentials of its guides on a page, and when to open each in
full); beyond that, read what the job in hand needs.

| Subject | Start at |
|---|---|
| Each stage's card: the script, storyboard, build and review guides' essentials | `cards/` |
| How a video's files are built for HyperFrames 0.9.16 | `format.md` |
| The HyperFrames commands Video Studio uses | `cli.md` |
| Video Studio's numbers: pace, reading time, sizes, safe areas, loudness (the checks read them from `rules.json`) | `numbers.md` |
| The animation libraries: GSAP, Lottie, three.js, canvas, WebGPU, anime.js, Web Animations, CSS | `runtimes/` |
| Motion: principles, timing, choreography, camera, transitions, scene patterns, techniques | `motion/` |
| Design: type, readability, layout, colour, data, brand, illustration, characters, generative | `design/` |
| Story: the message, hooks, words, beats, post words, types of video | `story/` |
| Captions | `captions/` |
| Sound: mixing, sound effects, music, sync | `audio/` |
| A long film, built a scene per file by helpers at the same time | `long-film.md` |
| Footage: editing, its storyboard and build, cut-outs, grading, cards over footage | `footage/` |
| The studio: sharing outside it, the user in the HyperFrames app, tidying up | `studio/` |
| The library, and HyperFrames' registry | `library.md` |
| Bringing work in from Figma or Remotion | `imports/` |

## The standards

Each of the review's scores has one standard, in one place: what good looks like, how to get there, what lowers it
and how it's scored. The script, storyboard and build work to it, the review scores against it, and the checks
measure whatever in it can be measured. A score of 8 or more on each is the bar before the user sees a draft.

| Score | The question | Standard |
|---|---|---|
| Hook | Do the first seconds earn the rest? | `story/hooks.md` |
| Reads at a glance | Does every word read at a glance, on a phone, in time? | `design/readability.md` |
| Motion quality | Weight, a job for every move, one personality, invisible seams | `motion/quality.md` |
| Variety | Something new every few seconds, no device repeated | `motion/variety.md` |
| Composition | One focal point, balance, margins and safe areas, a system | `design/layout.md` |
| Brand accuracy | The kit's colours, fonts, logo, motion and real assets | `design/brand.md` |
| Sync | Words on the spoken word, cuts at phrase gaps, scenes on the bar | `audio/sync.md` |
| Story | One clear message, a hook whose promise is paid off, one clear ask | `story/principles.md` |

## Agency-grade

Every Video Studio film is agency-grade: what a good studio would deliver to a client. That means a world made for
this film (its places, objects and atmosphere drawn in the brand's style, not a template or a row of icons), rich but
clear (one hero in each frame, with depth around it), alive (every move with weight and a job, and the world moving
softly between them), finished (real words, real assets, nothing that looks like a placeholder), and sounding as good
as it looks (SFX Kit on the moments, a mix that sits under the voice). The standards say how each part is judged; a
plain film that only avoids faults isn't agency-grade.

## Defaults, not bans

Everything in these guides is a default: where a film starts. The brief, the brand kit or the user can choose
otherwise, and the guides say what each choice costs rather than forbidding it. When the brief or the approved plan
asks for something a guide or a standard advises against (interface pulsing on the beat, a hard-cut style, an end
card that holds briefly), the plan wins, and the review judges it as what was asked for. The checks follow the same
line: what looks broken, can't be read or can't be heard is a fix; a style norm is a note. What's never compromised is
HyperFrames' contract (`format.md`): a frame drawn from anything but the time renders wrong.

Where things come from, by default: the user's own files (voiceover, footage, logos, music), the brand kit, SFX Kit,
the score kit and Video Studio's library, all on this Mac. An outside service (an AI voice, a stock library, a design
tool's account) is used only when the user asks for it and connects their own account, under that service's terms.

The sources the guides were written from, and their licences, are in `NOTICE`.
