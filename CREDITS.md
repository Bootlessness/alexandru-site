# Where the skills come from

The two skills in `.agents/skills/` and `.claude/skills/` are copied unchanged from their authors' public repositories, on 28 October 2026. Both folders hold identical copies.

| Skill | Author and source | Version copied | Licence |
|---|---|---|---|
| `prototype` | Emil Kowalski, [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/2d228630ba1446365f614a108cb8252f1feda202/skills/prototype) | commit `2d22863`, 11 October 2026 | MIT, `LICENSE` in the skill's folder |
| `design-taste-frontend` (Taste Skill) | Leonxlnx, [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill) | v2.1.5, commit `12af471`, 25 October 2026 | MIT, `LICENSE` in the skill's folder |

Taste Skill's folder is named after the skill (`design-taste-frontend`) rather than its folder in the source repository (`taste-skill`), because agents expect the folder name to match the skill's name.

Putting the site online uses Cloudflare's own skills, installed into your agent from [cloudflare/skills](https://github.com/cloudflare/skills) during setup (`SETUP.md`, step 6), not copied here.

Skills you write yourself, or borrow from a classmate, keep their own history in a `## Family tree` section inside the skill.
