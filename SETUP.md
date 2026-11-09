# Setup, with your agent

For the agent: walk me through these one step at a time. Check what is already done before each step, say what the next step is for in one line, and wait for me. I type my own passwords and sign-ins. Use the current docs of each tool rather than old memory. Stuck for more than five minutes? Tell me to ask Xule or my neighbour. You may be reading this through the course MCP or from a plain web address: the steps are the same.

1. **GitHub.** An account (a pseudonym is fine). In Settings, Emails, tick "Keep my email addresses private" and "Block command line pushes that expose my email". Then apply for the GitHub Student Developer Pack (education.github.com/pack): benefits for later, nothing today waits for it.
2. **Tools.** Check for git, the GitHub CLI (`gh`) and Node.js LTS; help me install what is missing. On a Mac, git may first ask to install Apple's command line tools: start that now, it takes a while.
3. **Who I am to git.** I set my name and my GitHub noreply email with `git config --global`. Never set them for me.
4. **Sign in.** I run `gh auth login`, then `gh auth setup-git`.
5. **My copy.** Make a new folder named with my first name, such as `mika-site`, and put the starter in it: download `https://pmux.research-memex.org/starter.zip` and unpack it there (the course tools' `start` answer has the commands, and the core files inline if the download fails). Check `.gitignore` is there, then commit. Then `gh repo create mika-site --public --source=. --push`. Open that folder in you.
6. **Cloudflare.** An account at dash.cloudflare.com (email, then verify it). Then add Cloudflare's own plugin or skills to you, from github.com/cloudflare/skills: the plugin for Claude Code or Codex, otherwise `npx skills add https://github.com/cloudflare/skills`.
7. **Online.** Set `name` in `wrangler.jsonc` to my repository's name and commit it. Then, in the Cloudflare dashboard: Workers & Pages, Create application, import my GitHub repository, Deploy. From then on, every push goes live. (Or, if I prefer: `npx wrangler login`, then `npx wrangler deploy`.)
8. **Check.** I open my `workers.dev` address on my phone. I change my name in `public/index.html`, write the commit message, and you push it. It goes live within a minute or two.

Then read `AGENTS.md`: that is how we work from here.

**If command-line tools are still installing at 11:40:** don't wait. Create the repository in the browser at github.com/new (public, named like `mika-site`), upload the starter's files there, and import that repository in the Cloudflare dashboard (step 7). The site goes live from GitHub without git on this laptop. Keep working in GitHub's web editor, with me drafting, until the local tools are ready; then clone the repository and carry on here.
