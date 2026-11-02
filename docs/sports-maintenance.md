# Sports roster maintenance

Amanda Sports Refresh is an enabled weekly ChatGPT maintenance task, scheduled Monday mornings in America/New_York. It researches sources and prepares verified changes; this repository does not scrape arbitrary pages or infer promotions from last season's roster. A scheduled run still depends on source and connector availability. Failed runs must report the concrete failure and leave the last verified data live. No new paid API is required.

## Research

Start with a fresh checkout of `pbraza07/AmandaAlvesRealtor` main. Read all four `data/sports/*.json` catalogs and `refresh-log.json`. Check every represented senior men's competition against current official league/federation/club sources. Confirm the current season and complete roster, including promotions, relegations, withdrawals, renamed clubs and relocated home bases. Opening an old season page alone is insufficient. Verify new base coordinates; retain unchanged coordinates. Distances use approximate home-base city centers, not stadium routes. Preserve documented home-match exceptions.

Revisit the unverified Portugal futsal second tier and Costa Rica basketball second tier. Do not invent a second division for NBA, NFL, MLB or NHL. Costa Rica first-tier volleyball currently uses explicitly labeled specialist reporting; never relabel it official without replacing its reference. Missing or inaccessible evidence must preserve the entire competition and its previous verification date.

## Candidate and evidence

Copy the four country catalogs to a temporary directory outside `data/sports`, and edit only the candidates. Maintain stable sport/competition IDs. A newly verified second tier may be added with its full roster, source, season, count and updated translated note/status. Entire sport/competition removal needs a separately reviewed change. Keep all 400 living guides and unrelated site settings untouched.

Each competition requires `expectedTeamCount` equal to its complete roster length. Preserve `verifiedAt` in candidates; the refresh command sets the date only after matching evidence. For each source check, write a JSON manifest:

```json
{
  "runAt": "2026-11-09T14:00:00Z",
  "checks": [{
    "country": "florida",
    "competitionId": "USE_ACTUAL_CATALOG_ID",
    "status": "verified",
    "checkedAt": "2026-11-09T13:45:00Z",
    "sourceUrl": "https://official-league.example/current-roster",
    "season": "USE_CONFIRMED_SEASON",
    "expectedTeamCount": 30,
    "rosterHash": "SHA256_FROM_CANDIDATE",
    "summary": "Describe the current-season roster evidence and any confirmed changes."
  }]
}
```

The example date, URL, count and IDs are placeholders, not source evidence. Compute candidate hashes using exported `rosterFingerprint` from `lib/sports-refresh.ts` on each candidate competition (SHA-256 of canonical sorted team records). `npm run sports:refresh -- --fingerprints` prints hashes for current checkout catalogs only. Do not substitute the old hash for an edited roster.

Use `status: "unavailable"` and a concrete explanatory summary for a failed source check; omit season/count/hash. Omitted checks are counted as not checked. Never advance dates just because the task ran. The validator enforces manifest consistency; source truth still requires research.

## Validate, apply, publish

```sh
npm run sports:validate
npm run sports:refresh -- --candidate-dir /tmp/amanda-sports-candidate --evidence /tmp/amanda-sports-evidence.json
npm run sports:refresh -- --candidate-dir /tmp/amanda-sports-candidate --evidence /tmp/amanda-sports-evidence.json --apply
npm test
npm run build
```

Dry run does not write. Apply rejects incomplete/duplicate rosters, invalid coordinates, mismatched counts/hashes/sources/seasons, unverified changes and backwards verification dates. It stages all four catalogs and the audit log, and rolls back writes on handled errors. Repository review/tests and a single commit provide the publication boundary; do not run concurrent local applies.

`refresh-log.json` retains the latest 24 attempts applied through the tool, including source-check summaries, failures, verified/not-checked counts and roster differences. Verified competitions store their evidence hash and source summary. If validation fails before apply, preserve catalogs and report the error; do not fabricate a successful audit entry. Per-league verification dates appear on city cards and full guides; the footer shows the oldest league date.

Inspect the diff and commit only validated data/log changes to main with an expected-head check. A push automatically deploys Render service `srv-dakq9qh5efls73d8i370` in workspace `tea-da643qgu01pc73951gdg`. Do not start a duplicate deployment. Verify deployment success and representative live city guides before claiming an update is live. Report meaningful changes, remaining verification gaps and any source/test/deploy failures. No email or third-party messages are authorized by this maintenance task.
