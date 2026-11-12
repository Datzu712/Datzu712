// The ASCII logo, alive: its characters keep swapping for their neighbours in
// "ink", so the picture shimmers without losing its shape, and a gust of
// restlessness crosses it now and then. It is the idle shimmer of the site's
// logo (AsciiLogo.tsx in juanes.com) without its JavaScript: a README image
// runs none, so what the site rolls dice for on every tick is decided here,
// once, and written out as CSS animations on a loop.
import { run } from "./term.mjs";

const GUST_S = 5; // one gust crosses the logo every this long, in seconds
// How much busier the gust is than the calm around it. Low enough that the
// calm is never still: about half the swaps happen away from the gust.
const GUST_GAIN = 6;
// A character swaps once every this many gusts, one of these: neighbours do
// not keep step, and the whole picture only repeats every 6 gusts. With
// these, about one character in five is away from home at any moment, and
// twice as many where the gust is.
const EVERY = [1, 2, 3];
const FADE_S = 0.45; // how long one character takes to melt into the next
// how long a swapped character stays before going home, the melt in included
const HOLD_S = [0.9, 1.3, 1.7];
// A stand-in glows while it is there, so the gust reads as light crossing
// the logo: the blur of its halo, in pixels. 0 for no halo.
const GLOW_PX = 2.4;
// Characters that may stand in for each other, lightest to heaviest. A swap
// only moves one step along it, and the outline characters (` . - : /) are
// not in it, so the silhouette never moves.
const RAMP = "+os";
// The dice are loaded: the same logo always shimmers the same way, so
// rendering the card again does not change it.
const SEED = 712;

/**
 * A random number generator that gives the same numbers every time
 * (mulberry32).
 * @param {number} seed
 * @returns {() => number} the next number, from 0 up to 1
 */
function seeded(seed) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * How hard the gust blows on a character: a wave that travels across the
 * logo, left to right and a little downhill.
 * @param {number} col
 * @param {number} row
 * @param {number} t seconds into the loop
 * @returns {number} 0 in the calm, up to 1 at the crest
 */
const gust = (col, row, t) => Math.max(0, Math.sin(col * 0.16 + row * 0.1 - (t * 2 * Math.PI) / GUST_S)) ** 6;

/** `12.3456` as `12.35`, without trailing zeros */
const short = (n) => +n.toFixed(2);

/**
 * The two animations of one pace: a character melting into its stand-in,
 * holding and melting back, once per cycle.
 * @param {number} every how many gusts a cycle is, as an index into EVERY
 * @param {number} hold how long the stand-in stays, as an index into HOLD_S
 * @returns {string} the CSS of the class `.e{every}h{hold}`
 */
function pace(every, hold) {
    const cycle = EVERY[every] * GUST_S;
    const name = `e${every}h${hold}`;
    const pct = (s) => `${short((s / cycle) * 100)}%`;
    const away = `${pct(FADE_S)}, ${pct(HOLD_S[hold])}`; // the stand-in is all there
    const home = `0%, ${pct(HOLD_S[hold] + FADE_S)}, 100%`;
    return `
  .${name} :first-child { animation: ${name}-out ${cycle}s ease-in-out var(--at) infinite; }
  .${name} :last-child { animation: ${name}-in ${cycle}s ease-in-out var(--at) infinite; }
  @keyframes ${name}-out { ${home} { opacity: 1; } ${away} { opacity: 0; } }
  @keyframes ${name}-in { ${home} { opacity: 0; } ${away} { opacity: 1; } }`;
}

/**
 * Draws an ASCII logo that shimmers. Each restless character is two, one on
 * top of the other in the same cell: itself, and the stand-in that fades in
 * over it and out again. Under prefers-reduced-motion it is the plain logo.
 * One per card: the classes are not scoped.
 * @param {string[]} lines the logo, a string per row
 * @param {number} top the row of its first line
 * @param {string} fill its colour
 * @param {string} [glint] the stand-ins' colour: a lighter one makes every
 *   swap catch the light. Their halo is in `fill`.
 * @returns {{ body: string, css: string }} the logo's elements, and the CSS
 *   for the card's `<style>` that animates them
 */
export function shimmer(lines, top, fill, glint = fill) {
    const random = seeded(SEED);
    const pick = (/** @type {ArrayLike<unknown>} */ list) => Math.floor(random() * list.length);
    const restless = new RegExp(`[${RAMP}]`, "g");
    const still = new RegExp(`[^ ${RAMP}]+`, "g");
    const out = [];

    lines.forEach((line, i) => {
        const row = top + i;
        // the outline, in the runs between the restless characters
        for (const { 0: chars, index } of line.matchAll(still)) out.push(run(index, row, chars, fill));

        for (const { 0: home, index: col } of line.matchAll(restless)) {
            const every = pick(EVERY);
            const cycle = EVERY[every] * GUST_S;
            // when in its cycle it swaps: any time, but likelier in the gust
            let at;
            do at = random() * cycle;
            while (random() * (1 + GUST_GAIN) > 1 + GUST_GAIN * gust(col, i, at));

            const step = RAMP.indexOf(home);
            const neighbours = [RAMP[step - 1], RAMP[step + 1]].filter(Boolean);
            const standIn = neighbours[pick(neighbours)];
            // a negative delay: the loop is already running when the card loads
            out.push(
                `<g class="swap e${every}h${pick(HOLD_S)}" style="--at:${short(at - cycle)}s">` +
                    run(col, row, home, fill) +
                    run(col, row, standIn, glint) +
                    "</g>",
            );
        }
    });

    // the halo: wide enough around one character that the blur is not cut
    if (GLOW_PX) {
        out.unshift(
            `<filter id="glint" x="-150%" y="-50%" width="400%" height="200%">` +
                `<feDropShadow dx="0" dy="0" stdDeviation="${GLOW_PX}" flood-color="${fill}"/></filter>`,
        );
    }

    const paces = EVERY.flatMap((_, every) => HOLD_S.map((_, hold) => pace(every, hold)));
    return {
        body: out.join("\n"),
        css: `
  .swap :last-child { opacity: 0;${GLOW_PX ? " filter: url(#glint);" : ""} }${paces.join("")}
  @media (prefers-reduced-motion: reduce) {
    .swap :first-child, .swap :last-child { animation: none; }
  }`,
    };
}
