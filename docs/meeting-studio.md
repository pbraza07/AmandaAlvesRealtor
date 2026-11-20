# Meeting Studio / Fireflies

Owner workflow: Admin → Meeting Studio → Connect Fireflies → Upload and transcribe → Review → Save reviewed report → Download branded PDF. The PDF includes the site's Amanda Alves Realtor wordmark, existing brokerage logo, forest green/gold palette, meeting overview, agenda/topics, notes, action items and optional transcript. No separate LLM or Zapier account is used.

## Connection

Set `FIREFLIES_ENCRYPTION_KEY` to a randomly generated secret of at least 32 characters. Keep it stable: rotating it requires owners to reconnect Fireflies. Each signed-in admin can enter an API key in Meeting Studio. Keys are verified against Fireflies' `user` query and AES-256-GCM encrypted in PostgreSQL. Keys are never returned to the browser. Alternatively set `FIREFLIES_API_KEY` server-side for a shared account. That takes precedence over individual connections.

Use a single Fireflies seat for the owner. Free supports API access and a limited upload trial. The official pricing page listed Pro at $18/month or $10/month billed annually on November 19, 2026. Do not purchase a plan automatically. Standard transcription and summaries avoid advanced AskFred/AI Skills charges. Fireflies' documentation is inconsistent about upload overages; verify the account's actual allowance and billing settings. The website cannot enforce provider-side billing limits.

## Data and processing

- MP3, M4A, WAV and OGG, maximum 60 MB per file; bounded body reads and extension/signature checks. Compressed MP3/M4A is preferable for long recordings.
- PostgreSQL temporarily holds original audio, avoiding another storage service. A transaction-scoped advisory lock limits concurrent stored recordings to four (maximum 240 MB).
- Fireflies downloads via a separate, random 256-bit bearer token and `download_auth`. The private URL requires that token and expires after 48 hours. No client-supplied remote URL is fetched by the application.
- Per-upload Fireflies callback uses a unique secret token. Its legacy `meetingId` payload is intentional: Fireflies documents that uploadAudio's per-request callback still uses V1 independently of saved V2 webhooks. No account-wide webhook configuration is required.
- Transcript results are verified against a unique upload marker in Fireflies' title. Keep this marker until the report is ready.
- A callback fetches the result. If the summary is still pending, the open dashboard checks at one-minute intervals. The dashboard also supports manual refresh. Without an open dashboard, a late summary is fetched when the owner returns and refreshes. There is no persistent background worker or scheduled poller.
- Raw audio is cleared when the transcript is retrieved. Expired raw bytes are purged when Meeting Studio history is loaded or another recording is uploaded. The 48-hour access expiry is immediate; physical deletion of abandoned files occurs on that next activity, not on a scheduled timer.
- Transcript, summary and owner edits remain in PostgreSQL until the owner deletes the report. Deletion/disconnection on this site does not delete Fireflies' copy. Manage that in Fireflies.
- SHA-256 duplicate detection per owner prevents resubmission. Upstream failures/timeouts use CHECK_REQUIRED; refresh before deleting/re-uploading, because the provider might already have accepted the upload. The site never retries the paid upload mutation automatically.
- Each refresh is claimed atomically and spaced by at least 45 seconds. READY reports are cached. Owner-reviewed content is protected from callbacks. Downloads create PDFs from cached content without new Fireflies calls.

## API documentation

- https://docs.fireflies.ai/graphql-api/mutation/upload-audio
- https://docs.fireflies.ai/graphql-api/query/transcript
- https://docs.fireflies.ai/schema/summary
- https://docs.fireflies.ai/graphql-api/webhooks-v2
- https://fireflies.ai/pricing

## Verification

Run `npm test` and `npm run build`. Tests cover encryption/tamper rejection, media validation, bounded reads, unauthenticated endpoints, isolated upload correlation, summary readiness, refresh throttling, cached results, edit protection and multilingual multi-page PDFs. A real upload requires the owner's actual Fireflies key and recording; mocked tests do not establish subscription entitlements or live API compatibility.
