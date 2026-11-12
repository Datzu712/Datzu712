export const LOGIN = "Datzu712";

export const profile = {
    name: "Juan Esteban Sánchez",
    user: "juanes",
    host: "meddyg",
    fastfetchComment: "neofetch is for losers (and archived since 2024)",
    born: "2006-02-20",
    // first time I started coding in javascript creating discord bots lmfao
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

/**
 * The top of the fastfetch panel. A text is shown as it is, a list takes
 * turns, and null is worked out when the card is rendered.
 * @type {[key: string, value: string | string[] | null][]}
 */
export const about = [
    ["OS", "Arch Linux, btw"],
    ["Host", "Costa Rica, UTC-6"],
    ["Kernel", null],
    ["Uptime", null],
    ["Role", "CTO @ Meddyg"],
    ["Studying", "Software Engineering, Fidélitas"],
    ["Listening", profile.bands],
];

export const reads = [
    ["Specs.Auth", "OAuth2 (all 7,000 RFCs), OIDC"],
    ["Specs.Health", "FHIR R5, SMART on FHIR, HL7, IHE"],
    ["Main language", "TypeScript"],
    ["Stack", "NestJS, React, PostgreSQL, Keycloak"],
    ["Learning", "Rust"],
];

export const contact = [
    ["Email", "juan@meddyg.com"],
    ["LinkedIn", "in/juanescr"],
    ["Web", "juanes.meddyg.com"],
];

/** `line` has 48 characters at most, or it runs into [open source] */
export const projects = [
    { status: "production", name: "ngdose", line: "strangling a 13-year-old CakePHP app, live" },
    { status: "production", name: "radiation-group", line: "a certificate portal, and an AI that can't write" },
    { status: "public draft", name: "hix", line: "a FHIR R5 spec for exchanging clinical documents", open: true },
    { status: "first release", name: "hix-hie", line: "the services that run HIX" },
    { status: "released", name: "nodecord", line: "enterprise DI for Discord bots. built it anyway", open: true },
    { status: "wip", name: "fidechat", line: "the same chat app, built three times", open: true },
    { status: "paused", name: "mind-body", line: "a gym app whose AI coach reads your routines", open: true },
];
