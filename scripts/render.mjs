// Renders the profile README's two terminal cards (assets/*.svg).
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/render.mjs
//
// The workflow (.github/workflows/readme.yml) runs it on a schedule, so the
// uptime and the GitHub numbers stay current. No dependencies: Node 20+.
//
// Everything sits on a monospace grid, and every run of text carries a
// textLength, so the columns line up whatever monospace font the visitor has.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// --- what the cards say -------------------------------------------------------
// Kept in step by hand with the portfolio (juanes.com, src/data).
const LOGIN = "Datzu712";

const profile = {
  user: "juanes",
  host: "meddyg",
  born: "2006-02-20",
  // the first line of code: mid-2019 is the conservative middle of that year
  codingSince: "2019-06-01",
  bands: [
    "nirvana",
    "korn",
    "linkin park",
    "metallica",
    "slipknot",
    "system of a down",
    "limp bizkit",
    "queen",
    "arctic monkeys",
  ],
};

/** the top of the fastfetch panel; Kernel, Uptime and Listening are computed */
const about = [
  ["OS", "Arch Linux, btw"],
  ["Host", "Costa Rica, UTC-6"],
  ["Kernel", null],
  ["Uptime", null],
  ["Role", "CTO @ Meddyg"],
  ["Studying", "Software Engineering, Fidélitas"],
  ["Listening", null],
];

const reads = [
  ["Specs.Auth", "OAuth2 (all 7,000 RFCs), OIDC"],
  ["Specs.Health", "FHIR R5, SMART on FHIR, HL7, IHE"],
  ["Main language", "TypeScript"],
  ["Stack", "NestJS, React, PostgreSQL, Keycloak"],
  ["Learning", "Rust"],
];

const contact = [
  ["Email", "juan@meddyg.com"],
  ["LinkedIn", "in/juanescr"],
  ["Web", "juanes.meddyg.com"],
];

/** `line` has 48 characters at most, or it runs into [open source] */
const projects = [
  { status: "production", name: "ngdose", line: "strangling a 13-year-old CakePHP app, live" },
  { status: "production", name: "radiation-group", line: "a certificate portal, and an AI that can't write" },
  { status: "public draft", name: "hix", line: "a FHIR R5 spec for exchanging clinical documents", open: true },
  { status: "first release", name: "hix-hie", line: "the services that run HIX" },
  { status: "released", name: "nodecord", line: "enterprise DI for Discord bots. built it anyway", open: true },
  { status: "wip", name: "fidechat", line: "the same chat app, built three times", open: true },
  { status: "paused", name: "mind-body", line: "a gym app whose AI coach reads your routines", open: true },
];

const archLogo = [
  "                   -`",
  "                  .o+`",
  "                 `ooo/",
  "                `+oooo:",
  "               `+oooooo:",
  "               -+oooooo+:",
  "             `/:-:++oooo+:",
  "            `/++++/+++++++:",
  "           `/++++++++++++++:",
  "          `/+++ooooooooooooo/`",
  "         ./ooosssso++osssssso+`",
  "        .oossssso-````/ossssss+`",
  "       -osssssso.      :ssssssso.",
  "      :osssssss/        osssso+++.",
  "     /ossssssss/        +ssssooo/-",
  "   `/ossssso+/:-        -:/+osssso+-",
  "  `+sso+:-`                 `.-/+oso:",
  " `++:.                           `-/+/",
  " .`                                 `/",
];

// --- GitHub ---------------------------------------------------------------------
async function github(path, init = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": "profile-readme",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** The numbers in the GitHub block. Throws rather than guess: a failed run
 *  leaves yesterday's cards in place. */
async function fetchStats() {
  const query = `query ($login: String!) {
    user(login: $login) {
      followers { totalCount }
      repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 100) {
        totalCount
        nodes { name stargazerCount pushedAt }
      }
      contributionsCollection { contributionCalendar { totalContributions } }
    }
  }`;
  const { data, errors } = await github("/graphql", {
    method: "POST",
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  if (errors?.length || !data?.user) {
    throw new Error(`GraphQL: ${JSON.stringify(errors ?? data)}`);
  }
  const { user } = data;
  const repos = user.repositories.nodes;

  // The last push anywhere public, including other people's repos (HIX lives
  // under meddyg). The events feed only goes back a few weeks, so fall back
  // to the most recently pushed repo of his own.
  // This repo never counts: the workflow pushes to it every day.
  let last = repos
    .filter((r) => r.pushedAt && r.name !== LOGIN)
    .map((r) => ({ at: r.pushedAt, repo: r.name }))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  try {
    const events = await github(`/users/${LOGIN}/events/public?per_page=100`);
    const push = events.find((e) => e.type === "PushEvent" && e.repo?.name !== `${LOGIN}/${LOGIN}`);
    if (push && (!last || push.created_at > last.at)) {
      last = { at: push.created_at, repo: push.repo.name.split("/").pop() };
    }
  } catch (err) {
    console.warn(`events feed unavailable, using repositories: ${err.message}`);
  }

  return {
    repos: user.repositories.totalCount,
    stars: repos.reduce((sum, r) => sum + r.stargazerCount, 0),
    followers: user.followers.totalCount,
    contributions: user.contributionsCollection.contributionCalendar.totalContributions,
    lastPush: last ?? null,
  };
}

// --- palette (the portfolio's) ----------------------------------------------------
const C = {
  bg: "#0a0a0a",
  border: "#222222",
  text: "#e8e8e8",
  body: "#b4b4b4",
  muted: "#8a8a8a",
  dots: "#3a3a3a",
  accent: "#f5d800",
  green: "#3fb950",
};

// --- grid ---------------------------------------------------------------------------
const FS = 16;
const CW = FS * 0.6; // one character
const LH = 22; // one line
const PAD = 28;
const COLS = 98;
const WIDTH = Math.round(COLS * CW + PAD * 2);
const BAND_S = 5; // each band's turn, in seconds

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const X = (col) => +(PAD + col * CW).toFixed(1);
const Y = (row) => PAD + row * LH + 15;

/** a run of text at a grid column; `end` right-aligns it to that column */
function run(col, row, str, fill, { end = false, cls } = {}) {
  if (!str) return "";
  const len = +([...str].length * CW).toFixed(1);
  return `<text x="${X(col)}" y="${Y(row)}" fill="${fill}" textLength="${len}" lengthAdjust="spacing"${
    end ? ' text-anchor="end"' : ""
  }${cls ? ` class="${cls}"` : ""}>${esc(str)}</text>`;
}

/** a horizontal rule from one column to another, mid-line */
const rule = (from, to, row) =>
  `<line x1="${X(from)}" x2="${X(to)}" y1="${Y(row) - 5}" y2="${Y(row) - 5}" stroke="${C.border}" stroke-width="1.5"/>`;

/** `user@host`, in the distro's colour; returns the column after it */
function userAtHost(col, row, out) {
  out.push(run(col, row, profile.user, C.accent));
  out.push(run(col + profile.user.length, row, "@", C.text));
  out.push(run(col + profile.user.length + 1, row, profile.host, C.accent));
  return col + profile.user.length + 1 + profile.host.length;
}

/** `user@host ~ $ command  # comment` */
function prompt(row, command, { cursor = false, comment } = {}) {
  const out = [];
  let col = userAtHost(0, row, out) + 1;
  out.push(run(col, row, "~ $", C.muted));
  col += 4;
  if (command) {
    out.push(run(col, row, command, C.text));
    col += command.length;
  }
  if (comment) out.push(run(col + 2, row, `# ${comment}`, C.muted));
  if (cursor) out.push(run(col, row, "_", C.accent, { cls: "blink" }));
  return out.join("\n");
}

function card(rows, body, label) {
  const height = PAD * 2 + rows * LH;
  const turn = 100 / profile.bands.length; // one band's share of the loop, in %
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" aria-label="${esc(label)}" font-family="'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace" font-size="${FS}">
<style>
  text { white-space: pre; }
  .blink { animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .band { opacity: 0; animation: band ${profile.bands.length * BAND_S}s linear infinite; }
  @keyframes band {
    0% { opacity: 0; } 1% { opacity: 1; }
    ${(turn - 1).toFixed(2)}% { opacity: 1; } ${turn.toFixed(2)}% { opacity: 0; }
    100% { opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .blink, .band { animation: none; }
    .band:first-of-type { opacity: 1; }
  }
</style>
<rect x="0.75" y="0.75" width="${WIDTH - 1.5}" height="${height - 1.5}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
${body}
</svg>
`;
}

// --- time -----------------------------------------------------------------------------
// Costa Rica has no daylight saving: local time is always UTC-6. Shifting the
// clock lets the UTC getters read local dates, so the uptime ticks over at
// local midnight (and on the right day in February).
const local = (date) => new Date(date.getTime() - 6 * 3_600_000);

/** whole years, months and days from an ISO date to a (shifted) day */
function span(fromIso, today) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  let y = today.getUTCFullYear() - from.getUTCFullYear();
  let m = today.getUTCMonth() - from.getUTCMonth();
  let d = today.getUTCDate() - from.getUTCDate();
  if (d < 0) {
    m -= 1;
    // days in the month before today's
    d += new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)).getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y, m, d };
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// --- card 1: fastfetch ------------------------------------------------------------------
function fastfetch(stats, now) {
  const INFO = 42; // first column of the panel: the logo is 38 wide
  const END = COLS; // right edge
  const today = local(now);
  const out = [];
  let row = 0;

  out.push(prompt(row, "fastfetch", { comment: "neofetch is for losers (and archived since 2024)" }));
  row += 2;
  const top = row;

  /** key: ........ value, the value flush right */
  const kv = (key, value, valueFill = C.text) => {
    const k = `${key}:`;
    const dots = END - INFO - k.length - [...value].length - 2;
    out.push(run(INFO, row, k, C.accent));
    out.push(run(INFO + k.length + 1, row, ".".repeat(Math.max(dots, 2)), C.dots));
    out.push(run(END, row, value, valueFill, { end: true }));
    row += 1;
  };
  const section = (title) => {
    row += 1;
    out.push(run(INFO, row, title, C.text));
    out.push(rule(INFO + title.length + 1, END, row));
    row += 1;
  };

  out.push(rule(userAtHost(INFO, row, out) + 1, END, row));
  row += 1;

  const age = span(profile.born, today);
  const coding = span(profile.codingSince, today);
  const computed = {
    // an Arch kernel string: the version is the years coding
    Kernel: `fullstack ${coding.y}.0-arch1`,
    Uptime: `${plural(age.y, "year")}, ${plural(age.m, "month")}, ${plural(age.d, "day")}`,
  };
  for (const [key, value] of about) {
    if (key !== "Listening") {
      kv(key, value ?? computed[key]);
      continue;
    }
    // the bands take turns, as they do on the site
    const k = `${key}:`;
    const widest = Math.max(...profile.bands.map((b) => b.length)) + 2;
    out.push(run(INFO, row, k, C.accent));
    out.push(run(INFO + k.length + 1, row, ".".repeat(END - INFO - k.length - widest - 2), C.dots));
    profile.bands.forEach((band, i) => {
      out.push(
        `<g class="band" style="animation-delay:${i * BAND_S}s">${run(END, row, `♪ ${band}`, C.text, { end: true })}</g>`,
      );
    });
    row += 1;
  }

  section("Reads");
  for (const [key, value] of reads) kv(key, value);

  section("GitHub");
  {
    // three numbers on one line, in thirds
    const third = (END - INFO) / 3;
    const cells = [
      ["Repos", String(stats.repos)],
      ["Stars", String(stats.stars)],
      ["Followers", String(stats.followers)],
    ];
    cells.forEach(([key, value], i) => {
      const from = Math.round(INFO + i * third);
      const to = Math.round(INFO + (i + 1) * third) - (i < 2 ? 3 : 0);
      const k = `${key}:`;
      out.push(run(from, row, k, C.accent));
      out.push(run(from + k.length + 1, row, ".".repeat(Math.max(to - from - k.length - value.length - 2, 1)), C.dots));
      out.push(run(to, row, value, C.text, { end: true }));
      if (i < 2) out.push(run(to + 1, row, "|", C.dots));
    });
    row += 1;
  }
  kv("Contributions", `${stats.contributions.toLocaleString("en-US")} in the last year`);
  if (stats.lastPush) {
    const at = local(new Date(stats.lastPush.at));
    kv("Last push", `${stats.lastPush.repo}, ${MONTHS[at.getUTCMonth()]} ${at.getUTCDate()}`);
  }

  section("Contact");
  for (const [key, value] of contact) kv(key, value, key === "Web" ? C.accent : C.text);

  const rows = row;

  // the logo, centred against the panel
  const logoTop = top + Math.max(0, Math.round((rows - top - archLogo.length) / 2));
  archLogo.forEach((line, i) => {
    const lead = line.length - line.trimStart().length;
    out.push(run(lead, logoTop + i, line.trim(), C.accent));
  });

  const label =
    "fastfetch for Juan Esteban Sánchez. " +
    [...about.filter(([, v]) => v), ...reads, ...contact].map(([k, v]) => `${k}: ${v}`).join(". ");
  return card(rows, out.join("\n"), label);
}

// --- card 2: ls -l projects/ -----------------------------------------------------------
function ls() {
  const NAME = 17;
  const LINE = 35;
  const out = [];
  let row = 0;

  out.push(prompt(row, "ls -l projects/"));
  row += 2;
  for (const p of projects) {
    out.push(run(0, row, `[${p.status}]`, C.muted));
    out.push(run(NAME, row, `${p.name}/`, C.text));
    out.push(run(LINE, row, p.line, C.body));
    if (p.open) out.push(run(COLS, row, "[open source]", C.green, { end: true }));
    row += 1;
  }
  row += 1;
  out.push(prompt(row, "", { cursor: true }));
  row += 1;

  const label =
    "Projects. " +
    projects.map((p) => `${p.name} (${p.status}${p.open ? ", open source" : ""}): ${p.line}`).join(". ");
  return card(row, out.join("\n"), label);
}

// --- main ---------------------------------------------------------------------------------
const assets = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const now = process.env.NOW ? new Date(process.env.NOW) : new Date();
const stats = await fetchStats();

mkdirSync(assets, { recursive: true });
writeFileSync(join(assets, "fastfetch.svg"), fastfetch(stats, now));
writeFileSync(join(assets, "projects.svg"), ls());
console.log("rendered", JSON.stringify(stats));
