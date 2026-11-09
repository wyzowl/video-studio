// The values Wyzowl Video Studio's band (in hooks/index.tsx) keeps for the session: the studio it works in ('' outside
// one), the session's own videos (the only ones it shows), the page waiting for the person's review among them (from
// `studio.mjs ready`) and what the person dismissed (a page's path, or 'idle' for the dashboard band). The answer box (also in hooks/index.tsx) keeps which of Claude's answers to
// draw boxed, each by a fingerprint of its text.
export type StudioPath = string

/** A script, storyboard or video waiting for review: its page path, the band's words and its button's label. */
export type ReadyPage = { path: string; text: string; button: string }

declare module 'claude-code' {
  interface PluginState {
    'video-studio': { studio: StudioPath; videos: string[]; ready: ReadyPage | null; dismissed: string; boxed: StateFamily<boolean> }
  }
}
