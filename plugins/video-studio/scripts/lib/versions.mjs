// The exact versions of everything Video Studio runs through npx, written out in full. Anthropic's plugin directory
// needs every package a launcher runs pinned to an exact version, and pinning keeps every studio on what Video Studio
// was tested with. To move to a newer HyperFrames: test it, then change it here and in the skills and commands that
// name it (search the plugin for "hyperframes@"), with its skills' release tag to match.

/** HyperFrames, as npx runs it. */
export const HYPERFRAMES = "hyperframes@0.8.149";
/** Its version alone, as a studio records it. */
export const HYPERFRAMES_VERSION = HYPERFRAMES.split("@")[1];
/** HyperFrames' own switches, for everything Video Studio runs: no anonymous usage data, and no daily check for a newer
    release (Video Studio chooses the version). */
export const HYPERFRAMES_ENV = { HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1" };
/** The same switches, to go before a command. */
export const HYPERFRAMES_SWITCHES = Object.entries(HYPERFRAMES_ENV).map(([k, v]) => `${k}=${v}`).join(" ");

/** Setup's skill installs: the skills tool, and each skill's source at a fixed release (HyperFrames' skills at the tag
    of its version; the motion-design skill, which has no tags, as the archive of one commit), with the skills tool's
    anonymous usage data turned off. */
export const SKILL_INSTALLS = {
  hyperframes: "DISABLE_TELEMETRY=1 npx --yes skills@1.7.4 add heygen-com/hyperframes#v0.8.149 --skill '*' --agent claude-code --copy -y",
  motion:
    "DISABLE_TELEMETRY=1 npx --yes skills@1.7.4 add https://codeload.github.com/LottieFiles/motion-design-skill/tar.gz/f9a8a041b85185ee4881b3471d3415e939aac772 --skill motion-design --agent claude-code --copy -y",
};
