# Kargo Shortlist

A hiring dashboard for Arjun (founder, Kargo). It ranks every PM and SPM applicant, explains each score with quotes from the CV, writes an interview brief for the top five, and drafts an invite or rejection for everyone.
**The system ranks and explains. Arjun decides.** No email goes out without his Confirm & send.

## How it follows the component map

| Map row | Here |
| --- | --- |
| **Founder · Trigger/Input**: uploads CV + selects role | `/upload`: drag-and-drop, role per file → `POST /api/candidates` |
| **System · Context**: extracts info, excludes personal details from AI | `src/lib/pii.ts`: name/email/phone/links split into their own columns; `cv_content` is the anonymised text. `assertNoPersonalDetails` runs before **every** AI call |
| **System · Processing**: scores against PM **and** SPM rubrics | `src/lib/pipeline.ts`: one Gemini call per CV scores all 10 criteria; weighted totals are computed in code; quotes that can't be found in the CV cap that criterion at 1 |
| **AI Models**: interview brief + personalised email | `src/lib/drafts.ts`: top 5 per role → 3-sentence brief + invite; everyone else → rejection. Drafts use `{{first_name}}`; the real name is added only at send time |
| **Email Service**: Resend, when founder clicks send | `src/lib/email.ts`, called only from `POST /api/candidates/:id/send` with `{confirm:true}` |
| **Founder · Output**: dashboard | `/` ranked shortlist per role with the line after #5; `/candidates/:id` for detail and review; `/outbox`; `/instincts` |

## The founder model (`rubric.txt`)

Built from the 8 past hires, not from the JDs. Four patterns in the high-rated hires (worked on an ops floor first, built unrequested fixes that others adopted, owned outcomes with no layer above, candid about failure). Plus one anti-signal: polished credentials with no outcomes, which is why the highest-credentialed hire is rated low. PM and SPM each have 5 criteria and weights that add to 100. Each criterion names the hires behind it. `/instincts` shows the model.

The hire ratings in the outcomes table are **inferred from the CVs**. If Arjun's real ratings differ, edit `rubric.txt`, then run `npm run seed:rubric` again.

## Features added beyond the brief

- **Most like a past hire**: each candidate is matched to the anonymised past hire they most resemble.
- **Evidence check**: every criterion quote is verified against the CV text. If a quote isn't there, the score is capped and flagged in red.
- **Cross-role flag**: shows when someone who applied for PM would make the SPM top five, or the other way round.
- **Duplicate CV detection**: catches identical or near-identical CVs sent under different names.
- **Founder overrides**: Arjun can move anyone above or below the line. The brief and draft regenerate to match, and the override is marked as his call.

## Run

```bash
npm install
cp .env.example .env.local        # fill in keys
# Supabase SQL editor: run supabase/migrations/20260930000000_schema.sql
npm run seed:rubric
npm run dev
npm test                          # unit tests
npm run test:e2e                  # 3-CV acceptance test against the running app
npm run upload:bulk -- ../resumes_ roles.json   # all CVs via the API
```

Without `GEMINI_API_KEY`, local dev uses a clearly labelled keyword mock. Production refuses to run without the real model.

**Login:** every page and API route requires a session. Set `DASHBOARD_USER`, `DASHBOARD_PASSWORD` and `SESSION_SECRET`. Sessions are signed, HTTP-only cookies that last 7 days, and production refuses to serve if no password is set. The demo login is shown as placeholder text on the login page.

## Privacy

- Personal details are separated from the CV when it's uploaded. Gemini only ever receives the anonymised content.
- Use a billed Gemini API key: the free tier may use prompts to train Google's models.
- Supabase tables have RLS switched on with no policies, so the anon key can read nothing. The server uses the service-role key, which is never exposed to the browser.
- `EMAIL_TEST_RECIPIENT` redirects every send to a test inbox.

## Deployment notes

- Live: https://kargo-shortlist-three.vercel.app (Vercel, functions pinned to Mumbai `bom1`); Supabase project `kargo-shortlist` in `ap-south-1`.
- Email runs in test mode. Resend's shared sender (`onboarding@resend.dev`) only delivers to the Resend account owner, so `EMAIL_TEST_RECIPIENT` is set to that address. To email real candidates, verify a domain in Resend, set `EMAIL_FROM` to an address on it, and clear `EMAIL_TEST_RECIPIENT`.
- Checkpoint results: all 60 CVs scored on both rubrics; top 5 per role have a brief + invite draft, the other 50 have rejection drafts; one near-duplicate pair flagged; full loop (upload → brief/draft → Confirm & send → `sent` in Supabase) verified with two fictional test CVs, since removed.
