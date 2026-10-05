# Security and privacy

Please report a suspected vulnerability privately using this repository's GitHub
security advisory interface when available. Do not put API keys, bridge tokens,
private screenshots, accessibility dumps, or account data into a public issue.
If private reporting is unavailable, open a public issue containing only a
high-level description and ask for a private reporting channel.

This plugin executes a bounded set of actions through the existing Codex
Computer Use surface. The current Computer Use authorization policy still
applies. Review [the data boundary](docs/PRIVACY.md) before enabling optional
remote Jev planning. Windows descriptor protection relies on the user's existing
profile ACLs; the plugin does not install or enforce custom Windows ACLs.

Before contributing, run `npm test` and `npm run check:release`. The release
check reports paths and line numbers without printing matched credentials. It
is a heuristic check of the current publication tree, not proof that arbitrary
text is anonymous or an audit of past Git history. Never commit a credential
even temporarily; if one has been exposed, revoke it before attempting cleanup.
