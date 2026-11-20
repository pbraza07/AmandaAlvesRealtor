# Meeting Studio / Fireflies

Owner workflow: Admin → Meeting Studio → Connect Fireflies → Upload and transcribe → Review → Save reviewed report → Download branded PDF. The PDF includes the site's Amanda Alves Realtor wordmark, existing brokerage logo, forest green/gold palette, meeting overview, agenda/topics, notes, action items and optional transcript. No separate LLM or Zapier account is used.

## Standing requirement for meeting minutes

Compile each meeting in its spoken language with enough context for a reader who was absent to understand what participants discussed, why a decision mattered, and what they agreed to do. Use complete, constructive sentences. Consider the full conversation from opening through closing, including later corrections and conditions. Keep proposals, confirmed commitments and unresolved questions distinct. Attribute responsibilities, amounts and deadlines only when the meeting supplies them. Preserve the speaker-attributed, timestamped transcript and owner-reviewed edits. Apply the same compiled text in the review screen and the Amanda Alves branded PDF.

## Connection

Set `FIREFLIES_ENCRYPTION_KEY` to a randomly generated secret of at least 32 characters. Keep it stable: rotating it requires owners to reconnect Fireflies. Each signed-in admin can enter an API key in Meeting Studio. Keys are verified against Fireflies' `user` query and AES-256-GCM encrypted in PostgreSQL. Keys are never returned to the browser. Alternatively set `FIREFLIES_API_KEY` server-side for a shared account. That takes precedence over individual connections.

Use a single Fireflies seat for the owner. Free supports API access and a limited upload trial. The official pricing page listed Pro at $18/month or $10/month billed annually on November 19, 2026. Do not purchase a plan automatically. Standard transcription and summaries avoid advanced AskFred/AI Skills charges. Fireflies' documentation is inconsistent about upload overages; verify the account's actual allowance and billing settings. The website cannot enforce provider-side billing limits.

## Data and processing

- MP3, M4A, MP4, WAV and OGG, maximum 60 MB per file; bounded body reads and extension/signature checks. Compressed MP3/M4A is preferable for long recordings.
- PostgreSQL temporarily holds original audio, avoiding another storage service. A transaction-scoped advisory lock limits concurrent stored recordings to four (maximum 240 MB).
- Fireflies downloads via a separate, random 256-bit bearer token and `download_auth`. The private URL requires that token and expires after 48 hours. No client-supplied remote URL is fetched by the application.
- Saving the last audio chunk also queues delivery in PostgreSQL. A background worker claims the job and sends it to Fireflies. Closing the browser after the saved confirmation or restarting the service leaves the job available. Confirmed rate-limit and pre-connection failures retry after one, five and fifteen minutes. An uncertain receipt goes to reconciliation to avoid spending on a duplicate.
- Studio checks Fireflies for the unique tracking ID in the meeting title. The Render worker checks confirmed uploads and pending summaries every two minutes. Unconfirmed submissions and interrupted uploads are checked every ten minutes for seven days. The owner can also refresh in Meeting Studio.
- Raw audio is cleared when the transcript is retrieved. The background worker also purges expired audio. Interrupted partial saves become eligible for re-upload after thirty minutes.
- Transcript, summary and owner edits remain in PostgreSQL until the owner deletes the report. Deletion/disconnection on this site does not delete Fireflies' copy. Manage that in Fireflies.
- SHA-256 duplicate detection per owner prevents resubmission. Upstream failures/timeouts use CHECK_REQUIRED; check the Fireflies upload queue for an existing or pending recording. The owner can retry the saved audio before expiry. Each explicit retry first searches for a completed transcript and requeues the retained recording. Long-running provider jobs display a delayed status after two hours and an actionable status after seven days.
- Each refresh is claimed atomically and spaced by at least 45 seconds. READY reports are cached. Owner-reviewed content is protected from callbacks. Downloads create PDFs from cached content without new Fireflies calls.

## API documentation

- https://docs.fireflies.ai/graphql-api/mutation/upload-audio
- https://docs.fireflies.ai/graphql-api/query/transcript
- https://docs.fireflies.ai/schema/summary
- https://docs.fireflies.ai/graphql-api/webhooks-v2
- https://fireflies.ai/pricing

## Verification

Run `npm test` and `npm run build`. Tests cover encryption/tamper rejection, media validation, bounded reads, unauthenticated endpoints, isolated upload correlation, summary readiness, refresh throttling, cached results, edit protection and multilingual multi-page PDFs. A real upload requires the owner's actual Fireflies key and recording; mocked tests do not establish subscription entitlements or live API compatibility.
