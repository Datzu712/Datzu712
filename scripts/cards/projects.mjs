// Card 2: `ls -l projects/`. One line per project: status, name, what it is,
// and [open source] where the code is public.
import { profile, projects } from "../content.mjs";
import { C, COLS, card, prompt, run } from "../lib/term.mjs";

const NAME = 17; // column of the name
const LINE = 35; // column of the description

/**
 * Renders the project list card, from `projects` in content.mjs.
 * @returns {string} the card, as an SVG document
 */
export function projectList() {
    const out = [];
    let row = 0;

    out.push(prompt(profile, row, "ls -l projects/"));
    row += 2;
    for (const project of projects) {
        out.push(
            run(0, row, `[${project.status}]`, C.muted),
            run(NAME, row, `${project.name}/`, C.text),
            run(LINE, row, project.line, C.body),
        );
        if (project.open) out.push(run(COLS, row, "[open source]", C.green, { end: true }));
        row += 1;
    }
    row += 1;
    out.push(prompt(profile, row, "", { cursor: true }));
    row += 1;

    const label =
        "Projects. " +
        projects.map((p) => `${p.name} (${p.status}${p.open ? ", open source" : ""}): ${p.line}`).join(". ");
    return card({ rows: row, body: out.join("\n"), label });
}
