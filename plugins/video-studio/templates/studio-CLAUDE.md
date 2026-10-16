# Wyzowl Video Studio

This folder is a Wyzowl Video Studio: videos are made in code with HyperFrames and rendered on this Mac.

- For any request to make, change, review or render a video, follow the **video-studio:production** skill. It
  brings in **video-studio:storyboard** and **video-studio:brand-kit** when they're needed.
- Start a new video with `/video-studio:new-video`, add a brand with `/video-studio:new-brand`, and open the studio's
  pages (dashboard, brand pages, storyboards) with `/video-studio:dashboard`.
- Brands live in `brands/<brand>/brand.json`; videos live in `videos/<project>/`. `studio.json` holds the HyperFrames
  version used for new videos.
- Render locally only: never use HyperFrames cloud rendering or publishing.
- Nothing is built until every storyboard scene is approved, and no final render is made until the draft is approved.
