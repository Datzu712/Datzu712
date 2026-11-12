// Card 1: `fastfetch`. The logo on the left, and on the right a panel of
// `key: ........ value` rows in four blocks: about, Reads, GitHub, Contact.
import { about, contact, profile, reads } from "../content.mjs";
import { archLogo } from "../lib/arch-logo.mjs";
import { C, COLS, card, prompt, rule, run, userAtHost, width } from "../lib/term.mjs";
import { local, monthDay, plural, span } from "../lib/time.mjs";

const LEFT = 42; // first column of the panel: the logo is 38 wide
const RIGHT = COLS; // its right edge
const CELL_GAP = 3; // " | " between two cells on one line
const TURN_S = 5; // how long each value of a rotating row shows, in seconds

/**
 * `key: ......`, the dots stopping a space short of where the value starts.
 * @param {number} from the column the key starts at
 * @param {number} to the column the value ends at
 * @param {number} row
 * @param {string} key
 * @param {number} valueWidth how many columns the value takes
 * @returns {string} the key and its dots, as `<text>` elements
 * @throws {Error} if the value leaves no room for the dots
 */
function keyAndDots(from, to, row, key, valueWidth) {
    const label = `${key}:`;
    const dotsFrom = from + width(label) + 1;
    const dots = to - valueWidth - 1 - dotsFrom;
    if (dots < 1) throw new Error(`content.mjs: the value of "${key}" is ${1 - dots} too long for its row`);
    return [run(from, row, label, C.accent), run(dotsFrom, row, ".".repeat(dots), C.dots)].join("\n");
}

/**
 * Runs that take turns in the same place: each fades in, holds and fades
 * out, one after another, on a loop. Under prefers-reduced-motion only the
 * first shows. One set per card: the class is not scoped.
 * @param {string[]} runs the `<text>` elements, drawn on top of each other
 * @returns {{ body: string, css: string }} the wrapped runs, and the CSS for
 *   the card's `<style>` that animates them
 */
function takingTurns(runs) {
    const share = 100 / runs.length; // one run's part of the loop, in %
    return {
        body: runs.map((r, i) => `<g class="band" style="animation-delay:${i * TURN_S}s">${r}</g>`).join("\n"),
        css: `
  .band { opacity: 0; animation: band ${runs.length * TURN_S}s linear infinite; }
  @keyframes band {
    0% { opacity: 0; } 1% { opacity: 1; }
    ${(share - 1).toFixed(2)}% { opacity: 1; } ${share.toFixed(2)}% { opacity: 0; }
    100% { opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .band { animation: none; }
    .band:first-of-type { opacity: 1; }
  }`,
    };
}

/**
 * The panel to the right of the logo. It is written top to bottom: each
 * method draws at the current row and moves on to the next.
 * @param {string[]} out where the drawn elements are pushed
 * @param {number} startRow the row of its first line
 */
function panel(out, startRow) {
    let row = startRow;
    let css = "";
    return {
        /** the next free row: once the panel is written, how tall the card is */
        get row() {
            return row;
        },
        /** the CSS its rotating rows need */
        get css() {
            return css;
        },
        /** `user@host` and a rule to the edge */
        header() {
            const name = `${profile.user}@${profile.host}`;
            out.push(userAtHost(profile, LEFT, row), rule(LEFT + width(name) + 1, RIGHT, row));
            row += 1;
        },
        /**
         * Starts a block: a blank line, then its title and a rule to the edge.
         * @param {string} title
         */
        section(title) {
            row += 1;
            out.push(run(LEFT, row, title, C.text), rule(LEFT + width(title) + 1, RIGHT, row));
            row += 1;
        },
        /**
         * `key: ........ value`, the value flush right.
         * @param {string} key
         * @param {string} value
         * @param {string} [valueFill] the value's colour
         */
        field(key, value, valueFill = C.text) {
            out.push(keyAndDots(LEFT, RIGHT, row, key, width(value)), run(RIGHT, row, value, valueFill, { end: true }));
            row += 1;
        },
        /**
         * `key: ........` and the values taking turns in the same place.
         * @param {string} key
         * @param {string[]} values
         */
        rotating(key, values) {
            const turns = takingTurns(values.map((value) => run(RIGHT, row, value, C.text, { end: true })));
            out.push(keyAndDots(LEFT, RIGHT, row, key, Math.max(...values.map(width))), turns.body);
            css += turns.css;
            row += 1;
        },
        /**
         * Several short `key: .. value` pairs on one line, in equal parts.
         * @param {[key: string, value: string][]} pairs
         */
        cells(pairs) {
            const part = (RIGHT - LEFT) / pairs.length;
            pairs.forEach(([key, value], i) => {
                const last = i === pairs.length - 1;
                const from = Math.round(LEFT + i * part);
                const to = Math.round(LEFT + (i + 1) * part) - (last ? 0 : CELL_GAP);
                out.push(keyAndDots(from, to, row, key, width(value)), run(to, row, value, C.text, { end: true }));
                if (!last) out.push(run(to + 1, row, "|", C.dots));
            });
            row += 1;
        },
    };
}

/**
 * Renders the fastfetch card.
 * @param {import("../github.mjs").Stats} stats the numbers in its GitHub block
 * @param {Date} now the moment it is rendered: the uptime is counted to it
 * @returns {string} the card, as an SVG document
 */
export function fastfetch(stats, now) {
    const today = local(now);
    const out = [];

    out.push(prompt(profile, 0, "fastfetch", { comment: profile.fastfetchComment }));
    const top = 2;
    const info = panel(out, top);

    info.header();
    const age = span(profile.born, today);
    const coding = span(profile.codingSince, today);
    const computed = {
        // an Arch kernel string: the version is the years coding
        Kernel: `fullstack ${coding.y}.0-arch1`,
        Uptime: `${plural(age.y, "year")}, ${plural(age.m, "month")}, ${plural(age.d, "day")}`,
    };
    for (const [key, value] of about) {
        // a list takes turns: the bands, as they do on the site
        if (Array.isArray(value))
            info.rotating(
                key,
                value.map((band) => `♪ ${band}`),
            );
        else info.field(key, value ?? computed[key]);
    }

    info.section("Reads");
    for (const [key, value] of reads) info.field(key, value);

    info.section("GitHub");
    info.cells([
        ["Repos", String(stats.repos)],
        ["Stars", String(stats.stars)],
        ["Followers", String(stats.followers)],
    ]);
    info.field("Contributions", `${stats.contributions.toLocaleString("en-US")} in the last year`);
    if (stats.lastPush) {
        info.field("Last push", `${stats.lastPush.repo}, ${monthDay(local(new Date(stats.lastPush.at)))}`);
    }

    info.section("Contact");
    for (const [key, value] of contact) info.field(key, value, key === "Web" ? C.accent : C.text);

    const rows = info.row;

    // the logo, centred against the panel
    const logoTop = top + Math.max(0, Math.round((rows - top - archLogo.length) / 2));
    archLogo.forEach((line, i) => {
        const drawn = line.trimStart();
        out.push(run(line.length - drawn.length, logoTop + i, drawn, C.accent));
    });

    const written = [...about, ...reads, ...contact].filter(([, value]) => typeof value === "string");
    const label = `fastfetch for ${profile.name}. ` + written.map(([key, value]) => `${key}: ${value}`).join(". ");
    return card({ rows, body: out.join("\n"), label, css: info.css });
}
