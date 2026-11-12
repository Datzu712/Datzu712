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
    green: "#3fb950",
};

const FONT_SIZE = 16;
const CHAR_W = FONT_SIZE * 0.6; // one character
const LINE_H = 22; // one line
const BASELINE = 15; // from a line's top down to where its text sits
const PAD = 28;
/** how many characters fit across a card */
export const COLS = 98;
const WIDTH = Math.round(COLS * CHAR_W + PAD * 2);

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
const colX = (col) => +(PAD + col * CHAR_W).toFixed(1);

/**
 * Where a grid row's text sits.
 * @param {number} row
 * @returns {number} the baseline's y, in pixels
 */
const rowY = (row) => PAD + row * LINE_H + BASELINE;

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
    const typed = dollar + width("~ $ ");
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
 * The card itself: a dark, bordered terminal with `body` drawn on it.
 * @param {object} card
 * @param {number} card.rows how many lines tall it is
 * @param {string} card.body the elements drawn on it
 * @param {string} card.label what a screen reader gets instead of the drawing
 * @param {string} [card.css] whatever the card animates beyond the cursor; it
 *   must hold still under prefers-reduced-motion on its own
 * @returns {string} the whole `<svg>` document
 */
export function card({ rows, body, label, css = "" }) {
    const height = PAD * 2 + rows * LINE_H;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" aria-label="${esc(label)}" font-family="${FONT}" font-size="${FONT_SIZE}">
<style>
  text { white-space: pre; }
  .blink { animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .blink { animation: none; }
  }${css}
</style>
<rect x="0.75" y="0.75" width="${WIDTH - 1.5}" height="${height - 1.5}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
${body}
</svg>
`;
}
