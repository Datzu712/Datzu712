// Card 2: `ls -l projects/`. One line per project: status, name, what it is,
// and [open source] where the code is public.
import { profile, projects } from "../content.mjs";
import { liveDot, liveDotCss, spinner, spinnerCss } from "../lib/glyphs.mjs";
import { C, COLS, card, prompt, run } from "../lib/term.mjs";

const NAME = 17; // column of the name
const LINE = 35; // column of the description
// It is typed once the fastfetch card above it has printed, so the two read
// as one session: seconds before the first key.
const WAIT_S = 3;

/**
 * The statuses that say something is happening right now carry a sign that
 * moves, inside the brackets: `[● production]`, `[⠋ wip]`. The rest hold still.
 * @type {Record<string, { draw: (col: number, row: number) => string, css: string }>}
 */
const SIGNS = {
    production: { draw: (col, row) => liveDot(col, row, C.green), css: liveDotCss },
    wip: { draw: (col, row) => spinner(col, row, C.text), css: spinnerCss },
};

/**
 * Renders the project list card, from `projects` in content.mjs.
 * @returns {string} the card, as an SVG document
 */
export function projectList() {
    const out = [];
    const css = new Set(); // of the signs it draws, each once
    let row = 2; // under the prompt and a blank line

    for (const project of projects) {
        const sign = SIGNS[project.status];
        if (sign) {
            // "[", the sign, a space, and the status from the fourth column
            out.push(run(0, row, "[", C.muted), sign.draw(1, row), run(3, row, `${project.status}]`, C.muted));
            css.add(sign.css);
        } else {
            out.push(run(0, row, `[${project.status}]`, C.muted));
        }
        out.push(run(NAME, row, `${project.name}/`, C.text), run(LINE, row, project.line, C.body));
        if (project.open) out.push(run(COLS, row, "[open source]", C.green, { end: true }));
        row += 1;
    }
    row += 1;
    out.push(prompt(profile, row, "", { cursor: true }));
    row += 1;

    const label =
        "Projects. " +
        projects.map((p) => `${p.name} (${p.status}${p.open ? ", open source" : ""}): ${p.line}`).join(". ");
    return card({
        who: profile,
        command: "ls -l projects/",
        wait: WAIT_S,
        rows: row,
        body: out.join("\n"),
        label,
        css: [...css].join(""),
    });
}
