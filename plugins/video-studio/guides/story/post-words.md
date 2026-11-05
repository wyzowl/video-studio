# Post words

The words that go out with the finished video, in `renders/delivery.json` (the production skill's "Deliverables"):
`title`, `description` and `altText`. The delivery page shows each with a Copy button. They're written for the
platform the brief names, in the brand's voice, in words that sound like a person (`narration.md`).

## The description

Where the video will be posted decides its shape:
- **A social post** (a feed, a vertical app):
  - **A first line that survives the "more" cut:** the platform shows a line or two before folding the rest, so the
    first line carries the hook or the payoff on its own, in about 125 characters at most. Never "Check out our new
    video!".
  - **One ask:** one thing to do (watch to the end, comment with a word, visit the link, follow), not three.
  - **Words people search for:** the plain names of the problem and the topic, worked into the sentences rather than
    stuffed at the end.
  - **A few hashtags:** three to five, specific ones over generic ones, at the end; none on a professional network
    unless the brand uses them.
- **A web page or a video platform:** a sentence or two saying what the viewer will see and learn, with the topic's
  plain search words in the first sentence, and the ask with where to go.
- **An internal or event video:** a sentence on what it is and who it's for.

No claim, figure or quote in the description that isn't in the video or the brief.

## The title

What the video is, in the viewer's words, under about 60 characters: the benefit or the question, not the company's
internal name for it. For a platform that shows a title, it often works as the hook in words.

## The alt text

One sentence saying what's seen, for someone who can't see it: the main thing happening and any words that matter on
screen. Not the description again, and not "a video of".

## Shape of the file

```json
{
  "title": "How to stop chasing invoices",
  "description": "First line that stands alone. Then a sentence or two. Then the one ask, with where to go.\n\n#invoicing #smallbusiness #cashflow",
  "altText": "A cluttered desk of overdue invoices clears as each one is marked paid, ending on the brand's logo."
}
```

---
Sources: Video Studio's own guidance, written for its delivery page. See NOTICE.
