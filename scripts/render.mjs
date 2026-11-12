// Renders the profile README's two terminal cards into assets/.
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/render.mjs
//
// The workflow (.github/workflows/readme.yml) runs it on a schedule, so the
// uptime and the GitHub numbers stay current. No dependencies: Node 20.11+.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { fastfetch } from "./cards/fastfetch.mjs";
import { projectList } from "./cards/projects.mjs";
import { LOGIN } from "./content.mjs";
import { fetchStats } from "./github.mjs";

const assets = join(import.meta.dirname, "..", "assets");
const now = process.env.NOW ? new Date(process.env.NOW) : new Date();
const stats = await fetchStats(LOGIN);

mkdirSync(assets, { recursive: true });
writeFileSync(join(assets, "fastfetch.svg"), fastfetch(stats, now));
writeFileSync(join(assets, "projects.svg"), projectList());
console.log("rendered", JSON.stringify(stats));
