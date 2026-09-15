# Amanda Alves Realtor Website & Lead Studio

A production-ready, mobile-first real estate website and private lead-management dashboard built with Next.js, TypeScript, PostgreSQL, Prisma, Cloudinary, and SMTP. It is designed for a single Render web service plus Render Postgres and can be pushed directly to GitHub.

## What is included

- Responsive public site with buyer/seller pathways and approachable acreage-focused positioning
- Smart buyer/seller modal with conditional fields, validation, progress, local draft recovery, honeypot protection, rate limiting, and idempotent submission
- PostgreSQL lead storage, linked buyer need for sellers who also need to buy, activity/email history, notes, follow-ups, tasks, lead status, priority, archiving, confirmed deletion, and CSV export
- Immediate owner notification and one-time buyer/seller confirmation email with client reply-to handling
- Secure administrator login with bcrypt password hashing, opaque database-backed sessions, 8-hour expiration, same-site secure cookies, origin validation, protected routes, security headers, and no indexing
- Editable website copy, business information, disclosures, email intros, SEO, images, and testimonials
- Cloudinary image and seller-photo uploads with MIME and size validation
- Privacy, terms, accessibility, Fair Housing, sitemap, robots, social metadata, and optional Plausible analytics

## Important before publishing

The starter intentionally shows brackets for unverified advertising information. In **Admin → Website**, replace and verify:

- Brokerage legal name and contact information
- Florida real estate license number
- Cellphone number and email
- Instagram profile URL
- Service areas
- Brokerage-required advertising disclosures
- Privacy and terms language
- Professional portrait and family image

Have the brokerage or qualified Florida counsel review the legal and advertising copy. Do not publish the public link while placeholders remain.

## Local setup

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and fill in the values.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create the database schema and first administrator:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`. The private dashboard is at `/admin`.

The seed command requires a unique `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters. Remove those two seed variables from Render after the administrator is created; changing them later does not change the password unless the seed command is deliberately rerun.

## Gmail email setup

The simplest deployment uses Gmail SMTP with a Google App Password:

1. Enable two-step verification on the Google account.
2. Create an App Password for Mail.
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`, and `SMTP_PASS`.
4. Set `EMAIL_FROM` to Amanda’s approved sender and `LEAD_NOTIFICATION_EMAIL` to the inbox that should receive inquiries.

Credentials stay server-side. Owner notifications set `Reply-To` to the lead’s address, so Reply in Gmail responds directly to the prospective client. If the SMTP variables are absent, leads are still saved but email is skipped.

For Google OAuth instead of an App Password, replace the auth object in `lib/email.ts` with Nodemailer OAuth2 credentials and add the corresponding environment variables.

## Cloudinary setup

Create a Cloudinary account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. All uploads are signed on the server. Accepted formats are JPG, PNG, and WebP; the limit is 8 MB per image and five seller images per inquiry.

## Deploy to Render

1. Create a new GitHub repository and push the contents of this folder.
2. In Render, choose **New → Blueprint** and connect the repository. Render reads `render.yaml` and creates the web service and PostgreSQL database.
3. Enter all values marked `sync: false`. Set `NEXT_PUBLIC_SITE_URL` to the final `https://...onrender.com` URL (or custom domain).
4. For the first deployment only, add `ADMIN_EMAIL` and `ADMIN_PASSWORD`, open the service Shell, and run `npm run db:seed`. Then remove those two variables.
5. Verify `/api/health` returns `{"status":"ok"}`.
6. Sign in at `/admin`, complete every placeholder, upload images, and test both lead paths.

If creating services manually, use:

- Build: `npm ci && npx prisma migrate deploy && npm run build`
- Start: `npm start`
- Health check: `/api/health`

## Database changes and backups

Create a migration locally after editing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_change
```

Production applies committed migrations with `npx prisma migrate deploy` during every Render build.

Enable Render Postgres point-in-time recovery or logical backups for the selected plan. For an additional encrypted logical backup, schedule `pg_dump "$DATABASE_URL" --format=custom --file=backup.dump` in a protected job and store it in private object storage. Test restoration periodically with `pg_restore`; never commit backups or `.env` files to GitHub.

## Security notes

- Put the service behind HTTPS (Render does this automatically).
- Use a unique administrator password of at least 16 characters in production.
- Session tokens are random, stored only as SHA-256 hashes, use HTTP-only SameSite cookies, and expire after eight hours.
- Mutation routes verify same-origin browser requests. Login and public submission routes are rate limited per running service instance.
- For multi-instance or high-volume deployment, replace in-memory rate limiting with Redis/Upstash so limits are shared.
- PostgreSQL and Cloudinary hold private client information. Configure retention, deletion, least-privilege access, account MFA, audit review, and backups to match brokerage policy.
- Cloudinary seller images are authenticated uploads but their resulting delivery URLs are bearer-like URLs. For stricter document privacy, use an authenticated/private Cloudinary delivery type or private S3 bucket with expiring signed URLs.
- A one-time, one-hour password-reset email flow is included. Application-level TOTP is optional and not enabled; enforce MFA on Render, GitHub, Google, Cloudinary, and database accounts.

## End-to-end testing checklist

### Public journey

- [ ] Open the site in iOS/Android Safari, Chrome, and Instagram’s in-app browser.
- [ ] Confirm sticky navigation, mobile menu, links, focus order, and reduced-motion behavior.
- [ ] Open **Make Your Move**, choose Buy, and confirm only buyer fields appear.
- [ ] Refresh mid-form and verify the draft returns.
- [ ] Submit a buyer lead and confirm one database record, one owner email, and one buyer confirmation.
- [ ] Repeat for Sell; test both an address and no-address email phrase.
- [ ] Select seller + help buying next; confirm the linked buyer need appears in the dashboard.
- [ ] Upload valid seller photos; reject a non-image and an image over 8 MB.
- [ ] Double-click submit or replay the same idempotency key and confirm only one lead/auto-response.
- [ ] Confirm missing required fields are described and entered information remains intact.

### Dashboard

- [ ] Verify `/admin`, `/api/admin/*`, and lead URLs redirect or reject signed-out visitors.
- [ ] Sign in, wait eight hours or alter expiry in a test environment, and verify session expiration.
- [ ] Search and filter leads; open a lead; use call, text, email, notes, status, priority, follow-up, tasks, archive, and CSV export.
- [ ] Verify every status change creates a timestamped activity.
- [ ] Confirm delete requires browser confirmation and cascades related records.
- [ ] Edit copy and contact details, upload both photographs, publish a genuine testimonial, and verify public output after cache refresh.
- [ ] Keep a testimonial unpublished and verify it is absent publicly.

### Email, accessibility, performance, and security

- [ ] Confirm owner email contains every submitted answer and its Reply button addresses the client.
- [ ] Confirm buyer and seller auto-responses are correct and email events show SENT or FAILED.
- [ ] Run Lighthouse on mobile for Performance, Accessibility, SEO, and Best Practices.
- [ ] Test keyboard-only use and a screen reader; verify zoom at 200%, contrast, labels, error announcements, and touch targets.
- [ ] Confirm secrets do not appear in page source, browser logs, URLs, analytics, Git history, or exported public files.
- [ ] Run dependency/security scanning in GitHub and review database/Cloudinary access before launch.

## Project structure

- `app/` — public pages, private admin pages, and server API routes
- `components/` — public form/site and dashboard interfaces
- `lib/` — content defaults, database, email, and security helpers
- `prisma/` — database schema, migration, and administrator seed
- `render.yaml` — Render Blueprint

## Commands

```bash
npm run dev        # local development
npm run typecheck  # TypeScript validation
npm run build      # production build
npm start          # production server
npm run db:seed    # create/update the configured admin
```
