// A terminal drawn in SVG: the palette, the character grid, and the few
// pieces both cards are made of.
//
// Everything sits on a monospace grid, and every run of text carries a
// textLength, so the columns line up whatever monospace font the visitor has.

/**
 * Whose prompt it is: `user@host`.
 * @typedef {object} Who
 * @property {string} user
 * @property {string} host
 */

/** the portfolio's palette */
export const C = {
    bg: "#0a0a0a",
    border: "#222222",
    text: "#e8e8e8",
    body: "#b4b4b4",
    muted: "#8a8a8a",
    dots: "#3a3a3a",
    accent: "#f5d800",
    glint: "#fdf5bf", // the accent catching the light: a swapped character of the logo
    green: "#3fb950",
};

const FONT_SIZE = 16;
/** how wide one character is, in pixels */
export const CHAR_W = FONT_SIZE * 0.6;
const LINE_H = 22; // one line
const BASELINE = 15; // from a line's top down to where its text sits
const PAD = 28;
/** how many characters fit across a card */
export const COLS = 98;
const WIDTH = Math.round(COLS * CHAR_W + PAD * 2);

// --- knobs: the entrance -------------------------------------------------------
// A card comes in the way its command would run: the command is typed, and
// what it prints appears under it line by line. Once, when the card loads.
const WAIT_S = 0.4; // before the first key
const KEY_S = 0.045; // one key...
const TYPING_MAX_S = 1.6; // ...but a long line is typed faster: nobody waits longer than this
const ENTER_S = 0.25; // between the last key and the first line printed
const LINE_S = 0.03; // one line printed

const FONT =
    "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace";

/**
 * Escapes a value for SVG text and attribute values.
 * @param {unknown} s
 * @returns {string}
 */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * How many columns a string takes on the grid.
 * @param {string} str
 * @returns {number} its characters, an emoji counting as one
 */
export const width = (str) => [...str].length;

/**
 * Where a grid column starts.
 * @param {number} col
 * @returns {number} x, in pixels
 */
export const colX = (col) => +(PAD + col * CHAR_W).toFixed(1);

/**
 * Where a grid row's text sits.
 * @param {number} row
 * @returns {number} the baseline's y, in pixels
 */
export const rowY = (row) => PAD + row * LINE_H + BASELINE;

/**
 * A run of text on the grid, exactly as wide as its characters whatever font
 * draws it.
 * @param {number} col the column it starts at, or ends at with `end`
 * @param {number} row
 * @param {string} str
 * @param {string} fill its colour
 * @param {object} [options]
 * @param {boolean} [options.end=false] right-align the text to `col`
 * @param {string} [options.cls] a CSS class, for the runs that animate
 * @returns {string} a `<text>` element, or "" for an empty string
 */
export function run(col, row, str, fill, { end = false, cls } = {}) {
    if (!str) return "";
    const length = +(width(str) * CHAR_W).toFixed(1);
    const anchor = end ? ' text-anchor="end"' : "";
    const className = cls ? ` class="${cls}"` : "";
    return `<text x="${colX(col)}" y="${rowY(row)}" fill="${fill}" textLength="${length}"${anchor}${className}>${esc(str)}</text>`;
}

/**
 * A horizontal rule, mid-line.
 * @param {number} from the column it starts at
 * @param {number} to the column it ends at
 * @param {number} row
 * @returns {string} a `<line>` element
 */
export function rule(from, to, row) {
    const y = rowY(row) - 5; // mid-line, for lowercase text
    return `<line x1="${colX(from)}" x2="${colX(to)}" y1="${y}" y2="${y}" stroke="${C.border}" stroke-width="1.5"/>`;
}

/**
 * `user@host`, in the distro's colour.
 * @param {Who} who
 * @param {number} col the column it starts at
 * @param {number} row
 * @returns {string} its `<text>` elements
 */
export function userAtHost(who, col, row) {
    const at = col + width(who.user);
    return [run(col, row, who.user, C.accent), run(at, row, "@", C.text), run(at + 1, row, who.host, C.accent)].join(
        "\n",
    );
}

/**
 * Where a prompt's command starts.
 * @param {Who} who
 * @returns {number} the column after `user@host ~ $ `
 */
const typedFrom = (who) => width(`${who.user}@${who.host} ~ $ `);

/**
 * A prompt line: `user@host ~ $ command  # comment`.
 * @param {Who} who
 * @param {number} row
 * @param {string} command what was typed; "" for an empty prompt
 * @param {object} [options]
 * @param {boolean} [options.cursor=false] end the line with a blinking cursor
 * @param {string} [options.comment] a shell comment after the command, without its `#`
 * @returns {string} the line's `<text>` elements
 */
export function prompt(who, row, command, { cursor = false, comment } = {}) {
    // the columns where each part starts
    const dollar = width(`${who.user}@${who.host} `);
    const typed = typedFrom(who);
    const end = typed + width(command);

    return [
        userAtHost(who, 0, row),
        run(dollar, row, "~ $", C.muted),
        run(typed, row, command, C.text),
        comment && run(end + 2, row, `# ${comment}`, C.muted),
        cursor && run(end, row, "_", C.accent, { cls: "blink" }),
    ]
        .filter(Boolean)
        .join("\n");
}

/**
 * A card's entrance: its command is typed, key by key, and then what it
 * printed appears line by line. Nothing on the card is animated for it: two
 * covers in the card's own colour sit on top and step out of the way, one
 * across the command and one down the output, and a cursor rides the first.
 * Without animations, or under prefers-reduced-motion, the covers are not
 * there and the card is simply whole.
 * @param {number} from the column the command starts at
 * @param {number} keys how many characters are typed
 * @param {number} rows how many lines tall the card is
 * @param {number} wait seconds before the first key
 * @returns {{ body: string, css: string }} the covers and the cursor, to draw
 *   over everything else, and the CSS that moves them
 */
function entrance(from, keys, rows, wait) {
    const sec = (n) => `${+n.toFixed(2)}s`;
    const typing = Math.min(keys * KEY_S, TYPING_MAX_S);
    const enter = wait + typing + ENTER_S; // when the command runs
    const lines = rows - 1; // every line under the command

    const typedW = +(keys * CHAR_W).toFixed(1);
    const typedEnd = +(colX(from) + typedW).toFixed(1);
    const top = PAD + LINE_H;
    const bottom = PAD + rows * LINE_H;
    const side = PAD - 10; // past the text, for what glows; short of the border
    return {
        body: [
            `<rect class="typing" x="${colX(from)}" y="${PAD}" width="${typedW}" height="${LINE_H}" fill="${C.bg}"/>`,
            run(from, 0, "_", C.accent, { cls: "caret" }),
            `<rect class="printing" x="${side}" y="${top}" width="${WIDTH - side * 2}" height="${bottom - top}" fill="${C.bg}"/>`,
        ].join("\n"),
        // each cover shrinks away from the edge it is pinned to, a character
        // or a line at a time; where it ends up is where it rests: gone
        css: `
  .typing { transform: scaleX(0); transform-origin: ${typedEnd}px 0; animation: typing ${sec(typing)} steps(${keys}) ${sec(wait)} backwards; }
  @keyframes typing { from { transform: scaleX(1); } }
  .caret { opacity: 0; animation: caret-on ${sec(enter)} steps(1), caret-go ${sec(typing)} steps(${keys}) ${sec(wait)} both; }
  @keyframes caret-on { from, to { opacity: 1; } }
  @keyframes caret-go { to { transform: translateX(${typedW}px); } }
  .printing { transform: scaleY(0); transform-origin: 0 ${bottom}px; animation: printing ${sec(lines * LINE_S)} steps(${lines}) ${sec(enter)} backwards; }
  @keyframes printing { from { transform: scaleY(1); } }
  @media (prefers-reduced-motion: reduce) {
    .typing, .caret, .printing { animation: none; }
  }`,
    };
}

/**
 * The card itself: a dark, bordered terminal where one command was run. Its
 * first line is the prompt with the command, typed as the card loads; `body`
 * is what the command printed, from the line after.
 * @param {object} card
 * @param {Who} card.who whose terminal it is
 * @param {string} card.command what was typed
 * @param {string} [card.comment] a shell comment after the command, without its `#`
 * @param {number} [card.wait] seconds before the first key
 * @param {number} card.rows how many lines tall it is, the prompt included
 * @param {string} card.body the elements drawn under the prompt
 * @param {string} card.label what a screen reader gets instead of the drawing
 * @param {string} [card.css] whatever the card animates beyond its entrance
 *   and the cursor; it must hold still under prefers-reduced-motion on its own
 * @returns {string} the whole `<svg>` document
 */
export function card({ who, command, comment, wait = WAIT_S, rows, body, label, css = "" }) {
    const height = PAD * 2 + rows * LINE_H;
    const keys = width(command) + (comment ? width(`  # ${comment}`) : 0);
    const enters = entrance(typedFrom(who), keys, rows, wait);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" aria-label="${esc(label)}" font-family="${FONT}" font-size="${FONT_SIZE}">
<style>
  text { white-space: pre; }
  .blink { animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .blink { animation: none; }
  }${enters.css}${css}
</style>
<rect x="0.75" y="0.75" width="${WIDTH - 1.5}" height="${height - 1.5}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
${prompt(who, 0, command, { comment })}
${body}
${enters.body}
</svg>
`;
}
