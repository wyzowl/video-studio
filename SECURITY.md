# Security

If you find a security problem in Wyzowl Video Studio, please tell us privately, so it can be fixed before it's
widely known.

## Reporting a problem

Use the contact form at https://wyzowl.com/contact-us/ and say that it's a security report about Wyzowl Video Studio.
Please don't report it in a public GitHub issue.

It helps if you include:

- what the problem is, and what someone could do with it;
- the steps to reproduce it;
- the version of Video Studio (Studio health, at `/health`, shows it) and of macOS;
- whether you'd like to be credited when it's fixed.

We look into every report, tell you what we find, and let you know when a fix is released.

## Supported versions

Security fixes go into the latest release. To update, run these in a terminal, then start a new Claude Code session:

```bash
claude plugin marketplace update wyzowl
```

```bash
claude plugin update video-studio@wyzowl
```

## What's covered

The plugin in `plugins/video-studio`: its scripts, hooks, skills, commands and studio pages, including the page server
it runs on your Mac and its licence check with Wyzowl's library service. A problem in HyperFrames or another tool that
Video Studio installs belongs with that project, but tell us too if it affects Video Studio.
