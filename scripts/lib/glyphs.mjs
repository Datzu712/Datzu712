import { CHAR_W, colX, rowY } from "./term.mjs";

/** `1.2345` as `1.23`, without trailing zeros */
const short = (n) => +n.toFixed(2);

// Bars that jump between heights like the block characters of a terminal
// visualizer (▂▅▇). One bar per entry: the heights it goes through, in eighths
// of a capital letter, and how long the round takes. No two rounds are as
// long, so the bars never fall into step.
const BARS = [
    { levels: [3, 6, 4, 7, 5, 8, 4, 2], round: 1.6 },
    { levels: [6, 8, 5, 7, 3, 6, 8, 4], round: 1.84 },
    { levels: [4, 7, 8, 5, 6, 3, 5, 7], round: 1.44 },
    { levels: [2, 4, 3, 6, 2, 5, 3, 1], round: 2 },
];
const BAR_H = 12; // a full bar: about a capital letter
const BAR_GAP = 3; // between two bars

/** how many columns the equalizer takes */
export const EQUALIZER_COLS = BARS.length;

/**
 * An equalizer: music is playing.
 * @param {number} col the column of its first bar
 * @param {number} row
 * @param {string} fill its colour
 * @returns {string} a `<g>` element; it needs `equalizerCss`
 */
export function equalizer(col, row, fill) {
    // drawn from the baseline up, so the bars grow from where the text sits
    const bars = BARS.map(
        (_, i) =>
            `<rect x="${short(i * CHAR_W + BAR_GAP / 2)}" y="${-BAR_H}" width="${short(CHAR_W - BAR_GAP)}" height="${BAR_H}"/>`,
    );
    return `<g class="eq" transform="translate(${colX(col)} ${rowY(row)})" fill="${fill}">${bars.join("")}</g>`;
}

export const equalizerCss =
    BARS.map(({ levels, round }, i) => {
        const steps = levels.map(
            (level, k) => `${short((k / levels.length) * 100)}% { transform: scaleY(${level / 8}); }`,
        );
        return `
  .eq :nth-child(${i + 1}) { transform: scaleY(${levels[0] / 8}); animation: eq${i} ${round}s steps(1) infinite; }
  @keyframes eq${i} { ${steps.join(" ")} }`;
    }).join("") +
    `
  @media (prefers-reduced-motion: reduce) {
    .eq :nth-child(n) { animation: none; }
  }`;

const GRAPH_H = 14; // the tallest bar of a graph: most of a line
const FLAT_H = 1.5; // a bar of nothing: a mark on the baseline

/**
 * A graph of bars like a line of block characters (▁▃▅▇), the bars spread
 * edge to edge over the columns it is given. Each is as tall as its value
 * against the largest, in eighths, on a square-root scale: with one huge
 * value a plain scale would flatten all the others. Anything above zero
 * shows; zero is a mark on the baseline.
 * @param {number} col the column it starts at
 * @param {number} row
 * @param {number} cols how many columns wide it is
 * @param {number[]} values
 * @param {string} fill the bars' colour
 * @param {string} flat the colour of the marks where there is nothing
 * @returns {string} a `<g>` element
 */
export function barGraph(col, row, cols, values, fill, flat) {
    const most = Math.max(...values, 1);
    const pitch = (cols * CHAR_W) / values.length; // from one bar to the next
    const bars = values.map((value, i) => {
        const h = value ? (Math.max(1, Math.round(Math.sqrt(value / most) * 8)) / 8) * GRAPH_H : FLAT_H;
        const colour = value ? "" : ` fill="${flat}"`;
        return `<rect x="${short(i * pitch + BAR_GAP / 2)}" y="${-h}" width="${short(pitch - BAR_GAP)}" height="${h}"${colour}/>`;
    });
    return `<g transform="translate(${colX(col)} ${rowY(row)})" fill="${fill}">${bars.join("")}</g>`;
}

const SWATCH_H = 16; // a block of colour: most of a line
const SWATCH_UP = 12; // its top above the baseline, so it sits mid-line

/**
 * A block of one colour, like a run of full blocks (███).
 * @param {number} col the column it starts at
 * @param {number} row
 * @param {number} cols how many columns wide it is
 * @param {string} fill its colour
 * @returns {string} a `<rect>` element
 */
export function swatch(col, row, cols, fill) {
    return `<rect x="${colX(col)}" y="${rowY(row) - SWATCH_UP}" width="${short(cols * CHAR_W)}" height="${SWATCH_H}" fill="${fill}"/>`;
}

const DOT_R = 3.3;
const DOT_UP = 5; // its middle above the baseline: half a lowercase letter

/**
 * A dot that breathes: this is running right now.
 * @param {number} col
 * @param {number} row
 * @param {string} fill its colour
 * @returns {string} a `<circle>` element; it needs `liveDotCss`
 */
export function liveDot(col, row, fill) {
    return `<circle class="live" cx="${short(colX(col) + CHAR_W / 2)}" cy="${rowY(row) - DOT_UP}" r="${DOT_R}" fill="${fill}"/>`;
}

export const liveDotCss = `
  .live { animation: live 2.6s ease-in-out infinite; }
  @keyframes live { 50% { opacity: 0.3; } }
  @media (prefers-reduced-motion: reduce) {
    .live { animation: none; }
  }`;

// A braille spinner (⠋⠙⠹⠸⠼⠴⠦⠧): six dots in two columns, three of them lit,
// the lit ones going round.
const SPIN_S = 0.9; // one turn
const SPIN_R = 1.3; // a dot
// where the dots are in the cell: x from its left edge, y above the baseline
const SPIN_X = [2.9, 6.7];
const SPIN_UP = [9.6, 5.6, 1.6];
// the dots clockwise from the top left, as [column, line]
const SPIN_ROUND = [
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 2],
    [0, 1],
];

/**
 * A spinner: this is being worked on.
 * @param {number} col
 * @param {number} row
 * @param {string} fill its colour
 * @returns {string} a `<g>` element; it needs `spinnerCss`
 */
export function spinner(col, row, fill) {
    const dots = SPIN_ROUND.map(([x, y], k) => {
        // each dot is lit for half a turn, a sixth of a turn after the one
        // before; standing still, the first three are
        const delay = short((k / SPIN_ROUND.length - 1) * SPIN_S);
        return `<circle cx="${SPIN_X[x]}" cy="${-SPIN_UP[y]}" r="${SPIN_R}" opacity="${k < 3 ? 1 : 0}" style="animation-delay:${delay}s"/>`;
    });
    return `<g class="spin" transform="translate(${colX(col)} ${rowY(row)})" fill="${fill}">${dots.join("")}</g>`;
}

export const spinnerCss = `
  .spin circle { animation: spin ${SPIN_S}s steps(1) infinite; }
  @keyframes spin { 0% { opacity: 1; } 50%, 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .spin circle { animation: none; }
  }`;
