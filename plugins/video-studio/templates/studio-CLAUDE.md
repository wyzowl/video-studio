# Wyzowl Video Studio

This folder is a Wyzowl Video Studio: videos are made in code with HyperFrames and rendered on this Mac.

- For any request to make, change, review or render a video, follow the **video-studio:production** skill. It
  brings in **video-studio:script**, **video-studio:storyboard**, **video-studio:build**, **video-studio:review** and
  **video-studio:brand-kit** when they're needed, and the plugin's guides for how things are made.
- Start a new video with `/video-studio:new-video`, add a brand with `/video-studio:new-brand`, and open the studio's
  pages (dashboard, brand pages, storyboards) with `/video-studio:dashboard`.
- Brands live in `brands/<brand>/brand.json`; videos live in `videos/<project>/`. New videos start on Video Studio's
  HyperFrames version, and each video keeps the version it was made with (its `package.json` scripts).
- Everything is made and rendered on this Mac by default; an outside service (HyperFrames' cloud rendering or
  publishing, a voice or media service) only if the user asks for it and connects their own account.
- Nothing is built until every storyboard scene is approved, and no final render is made until the draft is approved.
