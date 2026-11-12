// Dates, read in Costa Rica.

/**
 * Shifts a moment to Costa Rica's clock, so the UTC getters read local dates
 * and the uptime ticks over at local midnight (and on the right day in
 * February). Costa Rica has no daylight saving: it is always UTC-6.
 * @param {Date} date a real moment
 * @returns {Date} the same moment, six hours back: read it with getUTC*() only
 */
export const local = (date) => new Date(date.getTime() - 6 * 3_600_000);

/**
 * How long it has been since a date, in calendar terms.
 * @param {string} fromIso the day it started, as `yyyy-mm-dd`
 * @param {Date} today a day from `local()`
 * @returns {{ y: number, m: number, d: number }} whole years, months and days
 */
export function span(fromIso, today) {
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

/**
 * A count with its noun: "1 year", "8 months".
 * @param {number} n
 * @param {string} word the noun, singular
 * @returns {string}
 */
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * A short date: "nov 8".
 * @param {Date} day a day from `local()`
 * @returns {string}
 */
export const monthDay = (day) => `${MONTHS[day.getUTCMonth()]} ${day.getUTCDate()}`;
