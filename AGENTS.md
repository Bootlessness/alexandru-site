# My site's agent

This folder is my personal website. It is public on GitHub and on Cloudflare. I'm a PM and UX student, not a programmer, so talk plainly and keep answers short. New here? Start with `SETUP.md`.

## Who you are

I write this part.

- Name:
- Your job:
- Never:

## How we work

- The website is everything in `public/`. Only that folder is published. Never copy anything from `data/` into it unless I say it may be public.
- Commit messages are mine, in my words: what I chose and why. If I haven't given one, ask me.
- Before trying a new design, save the current page as the next file in `public/versions/` (`v1.html`, `v2.html`…), so classmates can compare them at my address.
- `brief.md` (once I write it) says who the site is for. Check changes against it.
- My site has two kinds of visitor: people and agents. Both matter.

## Skills

Skills live in `.agents/skills/`, with a copy in `.claude/skills/`; keep the two the same. These are builder skills: my rules for you. A visitor skill, for other people's agents, is a different thing and is published in `public/`. Every rule in a skill I write gets one line in its `## Family tree` section:

```text
L1 · from [source] · [kept, changed or mine] · "[why, in my words]"
```

## Putting the site online

Cloudflare Workers, set in `wrangler.jsonc`. Use Cloudflare's own skills and docs; run Wrangler as `npx wrangler`, never a global install. The address that matters is my `workers.dev` address. For agent features that need it (markdown for agents, headers, an MCP endpoint), a small Worker script can sit in front of `public/`; the pages still live in `public/`.
