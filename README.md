# Amanda Alves Realtor Website

Version 2.14: Open Admin → Bio page (or Website → Bio page section) to edit the intro label, heading, subtitle, full biography, photo, caption, accessible photo description, both button labels, and Bio SEO fields. Separate paragraphs with a blank line. New Bio photos compress automatically and save with your content in PostgreSQL, without Cloudinary. Click Save website changes after editing/uploading, then refresh `/bio`. Shared contact, navigation CTA, and footer settings remain in the existing Website editor. Existing database records automatically receive Bio defaults; no migration or reseeding is required.

Version 2.13 adds a dedicated `/bio` page, a Bio link in desktop/mobile navigation, the supplied biography verbatim, and an optimized full-frame family photograph. It continues from GitHub version 2.12 and preserves the campaign landing pages, QR sharing, CSV exports, and admin photo carousel. The Bio page's Make Your Move button opens the buyer/seller choice; no additional environment variables or migrations are required.

A mobile-first real estate website built with Next.js and ready for GitHub and Render. The public website works without a database. PostgreSQL is optional and only needed for the private lead-management dashboard.

## Database-free mode

When `DATABASE_URL` is not set, the site automatically runs in **email-only mode**:

- The public site and all first-person copy remain available.
- **Make Your Move** asks visitors to choose **Buy** or **Sell**, then opens the matching form.
- Successful inquiries are emailed to Amanda and the visitor receives an automatic confirmation.
- A branded QR-sharing card automatically links to the live website and lets visitors share the site, copy its link, or download a high-resolution QR code for print and social media.
- Amanda and family photos and the farmhouse acreage hero image are served from the website itself.
- `/api/health` returns a healthy email-only status, so Render can deploy the service normally.
- Up to five seller photos are automatically resized and compressed to JPEG in the browser, reprocessed on the server to remove metadata, and attached to the owner notification through Gmail. Without a database, photos are retained in Gmail only. With PostgreSQL enabled, the compressed photos are also saved directly with the private lead record and displayed in its thumbnail gallery. No Cloudinary account or persistent Render disk is needed for seller photos. Database storage includes a base64 encoding overhead of approximately 33%; monitor your database storage allowance as leads accumulate.

Email-only mode does not provide the private dashboard, saved lead history, online content editing, password login, database testimonials, or seller-photo storage. The `/admin` page explains this instead of producing an error.

## Render deployment without a database

1. Push the project files to GitHub.
2. In Render, create a **Web Service** from that repository or use **New → Blueprint** with the included `render.yaml`.
3. Use these commands if Render asks for them:

   ```text
   Build command: npm ci && npm run render:build
   Start command: npm start
   Health check: /api/health
   ```

4. Add the following Render environment variables. Do **not** add `DATABASE_URL` for email-only mode.

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | The final `https://...onrender.com` URL |
   | `GMAIL_CLIENT_ID` | Google Cloud OAuth client ID |
   | `GMAIL_CLIENT_SECRET` | Google Cloud OAuth client secret |
   | `GMAIL_REFRESH_TOKEN` | Offline OAuth refresh token for Amanda's Gmail |
   | `GMAIL_SENDER_EMAIL` | `amandaborgesalves@gmail.com` |
   | `LEAD_NOTIFICATION_EMAIL` | `amandaborgesalves@gmail.com` |
   | `SITE_PHONE` | Public business phone number |
   | `SITE_EMAIL` | `amandaborgesalves@gmail.com` |
   | `SITE_BROKERAGE_CONTACT` | Brokerage contact information/disclosure |

   `render.yaml` already supplies the verified Instagram URL, brokerage name, license number, service areas, and Node.js version. Review every public detail for brokerage compliance before launch.

5. Deploy, then open `/api/health`. A successful database-free deployment returns:

   ```json
   {"status":"ok","mode":"email-only","database":"disabled"}
   ```

6. Submit one Buy inquiry and one Sell inquiry. Confirm both the owner notification and visitor confirmation arrive.
7. Scroll to the contact section and test **Share My Website**, **Copy Website Link**, and **Download QR Code**. The QR code uses the live browser domain automatically.

### Gmail API setup for Render Free

Render Free blocks outbound SMTP ports, so Gmail SMTP and App Passwords cannot send from a free Render web service. This project sends through the Gmail API over HTTPS instead. In Google Cloud, enable the Gmail API, configure an OAuth consent screen, create a Web application OAuth client with `https://developers.google.com/oauthplayground` as an authorized redirect URI, and authorize only `https://www.googleapis.com/auth/gmail.send` with offline access. Use Google's OAuth 2.0 Playground with your own OAuth credentials to obtain the refresh token. Move an External OAuth app from **Testing** to **In production** before creating the final refresh token; Google expires Testing-mode authorizations for sensitive scopes after seven days.

Store `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` only as secret Render environment variables. Set `GMAIL_SENDER_EMAIL` and `LEAD_NOTIFICATION_EMAIL` to `amandaborgesalves@gmail.com`. Owner notifications use the visitor's address as `Reply-To`, and client confirmations use Amanda's address as `Reply-To`.

Email delivery is required in database-free mode because email is the inquiry record. If Gmail OAuth is missing or delivery to Amanda fails, the visitor sees a clear message to contact Amanda directly; the form does not falsely report success.

## Optional PostgreSQL dashboard

Version 2.10 exports every buyer/seller form field into its own labeled CSV column, including contact preferences and consent. Additional `Details:` columns retain original values and any historical/custom fields. Photo filenames are exported; image bytes remain in the private portal. Clicking a property thumbnail opens an in-page carousel with previous/next buttons, keyboard arrows, Escape to close, and photo downloads.

To enable the private dashboard later:

1. Create a Render PostgreSQL database.
2. Add its Internal Database URL to the web service as `DATABASE_URL`.
3. Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Render. The password must be at least **6 characters**; a longer unique password is recommended.
4. Redeploy. The build automatically applies migrations and creates or updates the administrator, so a paid Render Shell is not required.
5. After a successful deploy, remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from Render and redeploy. The secure password hash remains in PostgreSQL.

The normal build command stays the same:

```text
npm ci && npm run render:build
```

When `DATABASE_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are present, that command performs the equivalent of:

```bash
ADMIN_EMAIL="your-email@example.com" ADMIN_PASSWORD="your-password" npm run db:seed
```

without requiring Shell access. With PostgreSQL enabled, the dashboard provides saved leads, notes, statuses, follow-ups, CSV export, editable site content, testimonials, and password reset. Configure Cloudinary only if dashboard image and seller-photo uploads are needed.

## Local setup

Email-only development requires Node.js 22.14.0 and no PostgreSQL installation:

```bash
cp .env.example .env
npm install
npm run dev
```

Fill in the Gmail OAuth and `SITE_*` settings in `.env`, then open `http://localhost:3000`.

For local dashboard development, also set `DATABASE_URL`, then run:

```bash
npx prisma migrate deploy
ADMIN_EMAIL="your-email@example.com" ADMIN_PASSWORD="your-password" npm run db:seed
```

## Important publishing checks

- Verify the brokerage legal name, contact information, license number, cellphone, email, Instagram URL, service areas, advertising disclosures, privacy terms, and Fair Housing language.
- Have the brokerage or qualified Florida counsel review legal and advertising copy.
- Test Buy and Sell submissions on a phone and desktop browser.
- Confirm secrets do not appear in page source, Git history, URLs, analytics, or screenshots.
- Keep Render, GitHub, Google, Cloudinary, and database accounts protected with MFA.

## Commands

```bash
npm run dev          # local development
npm test             # automated tests
npm run typecheck    # TypeScript validation
npm run build        # production build; works without DATABASE_URL
npm run render:build # optional migration/seed followed by production build
npm start            # production server
npm run db:seed      # create/update admin when PostgreSQL is enabled
```


## Lifestyle site consolidation (v2.17.0)

The root URL is the consolidated lifestyle site, with Florida buyer/seller forms, four destination explorers, and curated travel interest collection. `/lifestyle` permanently redirects to `/`; existing destination URLs remain valid. The original Florida-only source is retained at `archive/florida-only-v2.14` (commit `cda10b9735db1f51000b4e169e7fdf202de8f2ad`). The active Render service and database are retained; no records are deleted.

Match percentages measure selected editorial preferences met; they are not property, price, or suitability guarantees. No preferences means no score. Airport distances are approximate great-circle distances, not road travel times. Destination photos have source and licensing details at `/photo-credits` and `public/images/places/CREDITS.md`. Travel inquiries use the existing lead storage and owner notification pipeline, with explicit information consent and no booking/payment.


## Website languages (v2.18.0)

Visitor-facing pages support English, Spanish, and Brazilian Portuguese through the top-right flag controls. The language is stored in a first-party cookie and rendered on the server, with instant React updates when switching. The dictionaries in `lib/i18n/translations.json` cover current public copy, all 52 destination profiles, forms, filter help, and legal pages. New published copy should receive matching dictionary entries. Proper names, original photo attribution titles, and visitor-entered content are preserved. Translation does not send page text or form data to an external translation service.

Dropdown labels are translated while canonical values remain unchanged for lead processing. Language changes preserve current form state and filters; shared explorer and QR links include the language. `websiteLanguage` records the selected language with new inquiries.


## Full destination index and ranking (v2.19.0)

The explorer uses all 61,939 active populated-place records in the imported GeoNames snapshot: Florida 8,874; Spain 30,674; Portugal 16,610; Costa Rica 5,781. This includes cities, towns, villages, neighborhoods and named communities, including the Spanish and Portuguese islands. The original 52 editorial profiles are merged into their GeoNames identities without duplicate candidates and preserve their public IDs. Names missing from the source can still be sent to Amanda through the consultation path.

Lifestyle preferences **only rank** candidates; they never exclude partial or zero matches. Explicit name searches and saved-place views narrow the display. Percentages count confirmed selected tags over all selected tags. Unassessed criteria are flagged rather than represented as verified lifestyle findings. New places use conservative documented geographic proxies; no affordability, schools, family services, sun, or quality-of-life rating is invented from a name or a zero population value. Source details are available at `/explorer-sources`.

`/api/explorer` serves 24-item pages and viewport-aware clusters covering every candidate, with at most 180 map symbols per response. `/api/explorer/place/[id]` returns full local details. Optional photo enrichment validates Wikipedia coordinates against the indexed place and requires Commons author/license metadata; unavailable imagery remains clearly labeled regional inspiration. The compressed country files stay on the server and are never sent wholesale to the browser.

Refresh with `python scripts/import-city-index.py` from an environment with NumPy and SciPy plus the repository's Node dev dependencies. The script downloads public source snapshots, removes historical/abandoned/destroyed and exact duplicate entries, normalizes missing population/elevation, computes approximate coast distances and records input SHA-256 hashes, counts and licenses in the manifest. No live API key, new paid service, database migration or customer-data write is required.
