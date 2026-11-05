// The exact versions of everything Video Studio runs through npx, written out in full. Anthropic's plugin directory
// needs every package a launcher runs pinned to an exact version, and pinning keeps every studio on what Video Studio
// was tested with. To move to a newer HyperFrames: test it, then change it here and in the skills, commands and guides
// that name it (search the plugin for "hyperframes@" and the version number; a guide's Sources line names the version
// it was written from, so leave those), and recheck the guides against its changes.

/** HyperFrames, as npx runs it. */
export const HYPERFRAMES = "hyperframes@0.9.16";
/** Its version alone, as a studio records it. */
export const HYPERFRAMES_VERSION = HYPERFRAMES.split("@")[1];
/** HyperFrames' own switches, for everything Video Studio runs: no anonymous usage data, and no daily check for a newer
    release (Video Studio chooses the version). */
export const HYPERFRAMES_ENV = { HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1" };
/** The same switches, to go before a command. */
export const HYPERFRAMES_SWITCHES = Object.entries(HYPERFRAMES_ENV).map(([k, v]) => `${k}=${v}`).join(" ");
