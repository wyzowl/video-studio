# Sharing outside the studio

How someone outside the studio (a client, say) reviews a script, storyboard or video, and how their feedback comes back.

The pages only run on the user's Mac, so someone outside the studio (a client, say) reviews a download instead:
the download button at the top of a script or storyboard page (**Download PDF**), or of a video's review page
(**Download video**). Each PDF asks for replies by row or scene number. The user puts the feedback that comes back on
the same page, usually pasted into **Anything else?**, which asks for changes just as a note does, and saves it, so it
reaches you the usual way.

- If the user asks you for a PDF, run `node PLUGIN/scripts/studio.mjs pdf /videos/<project>/script/v<N>/` (or
  `…/storyboard/v<N>/`). It saves the PDF in that version's folder and prints its path: give it as a link. For a
  video under review, give its file (`video` in its `review.json`).
- If they paste or attach outside feedback in the chat instead, go straight on: treat it as that version's review
  (changes, unless they say it's approved) and say where each point applies (row, scene or moment). The page won't
  show a saved review, so say in the next version's `changes` that the feedback came from outside the studio.

---
Sources: Video Studio's own guidance.
