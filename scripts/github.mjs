/**
 * The last public push.
 * @typedef { object } LastPush
 * @property { string } at when, as an ISO timestamp
 * @property { string } repo the repository's name, without its owner
 */

/**
 * The live numbers in the fastfetch card's GitHub block.
 * @typedef { object } Stats
 * @property { number } repos public repositories the account owns
 * @property { number } stars across those repositories
 * @property { number } followers
 * @property { number } contributions in the last year, as the profile's calendar counts them
 * @property { LastPush | null } lastPush null if nothing public was ever pushed
 */

/** how long GitHub gets to answer a request, headers and body, in ms */
const TIMEOUT_MS = 15_000;

/**
 * Calls the GitHub API with the token in `GITHUB_TOKEN`.
 * @param { string } path from the API's root, e.g. `/graphql`
 * @param { RequestInit } [init] passed to `fetch`: the method and the body
 * @returns { Promise<any> } the parsed JSON body
 * @throws { Error } if the token is missing, GitHub answers with an error
 *   status, or it has not answered in full within `TIMEOUT_MS`
 */
async function github(path, init = {}) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN is not set");
    const res = await fetch(`https://api.github.com${path}`, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "user-agent": "profile-readme",
        },
    });
    if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${await res.text()}`);
    return res.json();
}

const QUERY = `query ($login: String!) {
  user(login: $login) {
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 100) {
      totalCount
      nodes { nameWithOwner stargazerCount pushedAt }
    }
    contributionsCollection { contributionCalendar { totalContributions } }
  }
}`;

/**
 * The last push anywhere public: to his own repos, or to other people's (HIX
 * lives under meddyg), which only the events feed knows about. That feed goes
 * back a few weeks at most, and the card can do without it. The profile repo
 * never counts: the workflow pushes to it on every refresh.
 * @param { string } login the account
 * @param {{ nameWithOwner: string, pushedAt: string | null }[]} ownRepos the account's own public repositories
 * @returns { Promise<LastPush | null> } null if there is no push to show
 */
async function lastPush(login, ownRepos) {
    // every push known, as { at, repo: "owner/name" }
    const pushes = ownRepos.filter((r) => r.pushedAt).map((r) => ({ at: r.pushedAt, repo: r.nameWithOwner }));
    try {
        const events = await github(`/users/${login}/events/public?per_page=100`);
        for (const event of events) {
            if (event.type === "PushEvent") pushes.push({ at: event.created_at, repo: event.repo.name });
        }
    } catch (err) {
        console.warn(`events feed unavailable, using repositories: ${err.message}`);
    }
    const last = pushes.filter((push) => push.repo !== `${login}/${login}`).sort((a, b) => b.at.localeCompare(a.at))[0];
    return last ? { at: last.at, repo: last.repo.split("/").pop() } : null;
}

/**
 * Reads the account's numbers from GitHub.
 * @param { string } login the account
 * @returns { Promise<Stats> }
 * @throws { Error } rather than guess: a failed run leaves yesterday's cards in place
 */
export async function fetchStats(login) {
    const { data, errors } = await github("/graphql", {
        method: "POST",
        body: JSON.stringify({ query: QUERY, variables: { login } }),
    });
    if (errors?.length || !data?.user) {
        throw new Error(`GraphQL: ${JSON.stringify(errors ?? data)}`);
    }
    const { user } = data;
    const ownRepos = user.repositories.nodes;

    return {
        repos: user.repositories.totalCount,
        stars: ownRepos.reduce((sum, r) => sum + r.stargazerCount, 0),
        followers: user.followers.totalCount,
        contributions: user.contributionsCollection.contributionCalendar.totalContributions,
        lastPush: await lastPush(login, ownRepos),
    };
}
