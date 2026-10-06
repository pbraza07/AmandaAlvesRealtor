# Amanda Alves Realtor Website

A mobile-first real estate website built with Next.js and ready for GitHub and Render. The public website works without a database. PostgreSQL is optional and only needed for the private lead-management dashboard.

## Database-free mode

When `DATABASE_URL` is not set, the site automatically runs in **email-only mode**:

- The public site and all first-person copy remain available.
- **Make Your Move** asks visitors to choose **Buy** or **Sell**, then opens the matching form.
- Successful inquiries are emailed to Amanda and the visitor receives an automatic confirmation.
- Amanda and family photos and the farmhouse acreage hero image are served from the website itself.
- `/api/health` returns a healthy email-only status, so Render can deploy the service normally.
- Seller photo attachments are skipped. The form tells visitors Amanda will request photos separately.

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
   | `RESEND_API_KEY` | API key from Resend |
   | `RESEND_FROM` | `Amanda Alves <inquiries@your-verified-domain.com>` |
   | `EMAIL_FROM` | The same sender; retained as an SMTP-compatible fallback |
   | `LEAD_NOTIFICATION_EMAIL` | Amanda's inbox for new inquiries |
   | `SITE_PHONE` | Public business phone number |
   | `SITE_EMAIL` | Public business email address |
   | `SITE_BROKERAGE_CONTACT` | Brokerage contact information/disclosure |

   `render.yaml` already supplies the verified Instagram URL, brokerage name, license number, service areas, and Node.js version. Review every public detail for brokerage compliance before launch.

5. Deploy, then open `/api/health`. A successful database-free deployment returns:

   ```json
   {"status":"ok","mode":"email-only","database":"disabled"}
   ```

6. Submit one Buy inquiry and one Sell inquiry. Confirm both the owner notification and visitor confirmation arrive.

### Email setup for Render Free

Render Free blocks outbound SMTP ports, so Gmail SMTP and App Passwords cannot send from a free Render web service. Create a Resend account, verify a sending domain, create an API key, and set `RESEND_API_KEY` and `RESEND_FROM`. Resend uses HTTPS, which works on Render Free. Owner notifications use the visitor's address as `Reply-To`, so Amanda can reply directly from her inbox.

SMTP remains available as a fallback for local development or a different host that permits outbound SMTP. On Render Free, use Resend.

Email delivery is required in database-free mode because email is the inquiry record. If SMTP is missing or delivery to Amanda fails, the visitor sees a clear message to contact Amanda directly; the form does not falsely report success.

## Optional PostgreSQL dashboard

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

Fill in the Resend (or local SMTP) and `SITE_*` settings in `.env`, then open `http://localhost:3000`.

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
