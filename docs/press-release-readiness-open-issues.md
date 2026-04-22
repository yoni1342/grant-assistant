# Press Release Readiness — Open Issues

**Date:** 2026-04-22 (updated)
**Status:** Only open items. All fixed items removed. Ordered by priority — top of the list first.

---

## How to use this doc

Work top to bottom. Each item has: what it means in simple words, why it matters for the press release, what needs to happen, and roughly how long it takes. The first half (AWS + OpenAI + critical n8n fixes) is what has to be done before press day. The second half (n8n workflow hardening) is strongly recommended if time allows. The final section (post-press improvements) is for later.

Total estimated effort to clear all "must-fix" items: **6–8 hours**.

---

## 1. Commit and push the already-written `grants.description` fix 🔴

**What it means in simple words:**
A cron job that sends grant-eligibility email digests is failing every 30 minutes because it's asking the database for a column (`description`) on a table that doesn't have it (`grants`). You already wrote the fix — it lives in your working tree, uncommitted. Three git commands and a deploy later, this is done.

**Why it matters for the press release:**
Right now, grant notification emails aren't going out at all. Under press traffic, new users who should get their first grant alerts won't — silent onboarding failure. Also, every 30 minutes this cron fails and logs a 400 error that clutters the Supabase logs, making it harder to spot real errors during the spike.

**What needs to happen:**
```bash
git add app/api/cron/grant-eligible-emails/route.ts
git commit -m "Fix grant-eligible email cron by querying grants_full view"
git push
```
Wait for the next ECS rollout. Error disappears from logs within 30 minutes.

**Effort:** 5 minutes including the deploy wait.

---

## 2. Cap narratives to 5 in proposal generation 🔴

**What it means in simple words:**
Inside the proposal generator, there's a step that takes every narrative document in the organization's library and makes a separate OpenAI call for each one. There's no limit on how many. For an organization with 20 narratives, that's 20 sequential AI calls — about 6–10 minutes just for this one step of proposal generation.

**Why it matters for the press release:**
Organizations with rich document libraries will see proposal generation take 10+ minutes. The user's browser times out long before that. Meanwhile, the database connection stays locked the whole time, making connection exhaustion worse.

**What needs to happen:**
In the n8n workflow "5. Narrative Library with AI Customization," open the "Prepare Context" code node and change one line so it only keeps the top 5 most relevant narratives:
```js
relevant = relevant.slice(0, 5)
```
Save, then test by regenerating a proposal.

**Effort:** 10 minutes including test.

---

## 3. Supabase database can only handle 60 connections 🔴

**What it means in simple words:**
The database is what stores all your data. Right now it can talk to only 60 "customers" at the same time. Every server-rendered page uses one slot. Normal traffic uses around 14. Under press traffic, those 60 fill up in seconds, and new visitors see error pages.

**Why it matters for the press release:**
This is the single biggest thing that will break. Even if you add more web servers (next issue), they all share the same 60-slot database. Fixing servers without fixing the database makes things *worse*, not better.

**What needs to happen:**
- Switch the app to use Supabase's "transaction pooler" (port 6543) instead of the direct database connection. The pooler lets many more customers share the 60 slots efficiently. Change is a single environment variable update + redeploy.
- Upgrade the Supabase plan from Free to Pro. Pro gives 200 slots instead of 60 and unlocks bigger database hardware.

**Important:** Do this before increasing ECS server count.

**Effort:** 1–2 hours total — environment variable change, test on staging, redeploy, plan upgrade.

---

## 4. Only 5 web servers can run at once 🔴

**What it means in simple words:**
Your app runs on AWS as a small fleet of web servers. Each server handles 30–80 visitors at once. Today, the fleet grows from 2 servers up to a maximum of 5. Under press traffic, 5 is way too few — the 6th, 7th, 8th server never gets created because you capped it.

Also, each server is small — 1 CPU core, 2 GB of memory. Roughly the power of a modest laptop.

**Why it matters for the press release:**
Restaurant with 5 cashiers when 2,000 customers walk in. The line goes out the door. Most visitors see slow pages or errors.

**What needs to happen:**
In `terraform/environments/production/terraform.tfvars`:
- Raise `max_tasks` from 5 to 15
- Raise `task_cpu` from 1024 to 2048 (2 cores)
- Raise `task_memory` from 2048 to 4096 (4 GB)

Then `terraform apply` and watch the deployment.

**Effort:** 30 minutes — file edit is 1 minute; rest is careful apply + monitoring.

**Pair with #3 above.** Don't do this first.

---

## 5. OpenAI budget and rate limits could cut you off mid-spike 🔴

**What it means in simple words:**
Every AI call costs money and tokens. There are three separate ways OpenAI can stop working under heavy traffic:

1. **Rate limit (requests per minute)** — "too many requests, slow down." Fixable with retry logic (see #7).
2. **Token-per-minute limit (TPM)** — "processed too many words per minute." Only fixable by upgrading your OpenAI account tier.
3. **Monthly usage cap or depleted credit balance** — "you've spent all the money you set aside." Retrying does NOT help here — you're literally out of budget. Every AI feature goes dark until someone raises the cap or adds funds.

Rough cost math for a press week:
- 10,000 proposals generated = ~$300
- 10,000 proposals for orgs with many narratives (before fix #2) = **$2,000–$3,000**

**Why it matters for the press release:**
If you hit Mode 2 or Mode 3, the retry logic in #7 won't save you. The app's AI features just stop working. Users see "failed to generate proposal" with no fix in sight until someone manually intervenes.

**What needs to happen (do all of these before press day):**
1. Go to platform.openai.com → Settings → Limits. Check your current tier, RPM/TPM limits, and monthly usage cap.
2. **Raise the monthly usage cap** to 5–10x your normal spend. You're not committing to spend it — this is just the ceiling. Set it high enough a 10x traffic spike won't blow through it.
3. **Request a tier upgrade** if you're below Tier 3. Email OpenAI support with expected volume. Takes 1–3 business days, so do this now.
4. **Set usage alerts** at 50%, 75%, 90% — OpenAI emails you so you're not surprised.
5. Verify billing payment method is current and valid.

**Effort:** 30 minutes today + 1–3 day wait for tier upgrade response.

---

## 6. CloudFront isn't caching anything for the homepage 🟠

**What it means in simple words:**
CloudFront is AWS's worldwide network of mini-servers. Their job is to remember popular pages so your main server doesn't answer the same question 10,000 times. Right now CloudFront is set to "remember answers for zero seconds" — it throws each answer away immediately. Every single visitor reaches all the way back to your main AWS server.

**Why it matters for the press release:**
When the press article links to your homepage, thousands of people click the same link. Every click wakes a web server and uses a database slot. With even 1–5 minutes of caching, most of those clicks get an instant copy from the nearest edge server, free. Your main servers only get hit once per minute per region.

**What needs to happen:**
In `terraform/modules/cloudfront/main.tf`, change `default_ttl = 0` to `default_ttl = 300` (5 minutes). Leave `/api/*` uncached — those must always be fresh. Only marketing pages get cached.

**Effort:** 15 minutes.

---

## 7. No automatic retry when OpenAI is rate-limited 🔴

**What it means in simple words:**
When you call OpenAI thousands of times per minute, OpenAI starts returning "too many requests, slow down" (429 errors). This is expected and normal. Well-built apps wait a moment and try again.

Your workflows don't retry. The moment OpenAI says "slow down," the workflow crashes and the user sees an error with no automatic recovery.

**Why it matters for the press release:**
Under press traffic, you'll hit OpenAI's per-minute limits within minutes. First 50–100 users get their proposals fine. User 101 hits the limit — their proposal fails. So does 102, 103, 104. No recovery.

Note: this only handles rate limits (Mode 1 from #5 above). Mode 2 and Mode 3 need the actions in #5.

**What needs to happen:**
In each critical n8n workflow (Proposal Generator, Grant Eligibility Screener, Narrative Customizer, AI Proposal Critic, Budget Generator), wrap each OpenAI call in a "try up to 3 times with increasing wait" Code node — try, wait 1s, try, wait 2s, try, wait 4s, then give up.

**Effort:** About 30 minutes per workflow × 5 critical workflows = 2–3 hours.

---

## 8. Fix 10 slow RLS policies (auth.uid() re-evaluation) 🟠

**What it means in simple words:**
Your database uses Row Level Security (RLS) rules like "users can only see their own org's data." Ten of these rules call `auth.uid()` inline. Because of how Postgres works, `auth.uid()` gets re-calculated for every single row scanned — so a query that reads 10,000 rows calls `auth.uid()` 10,000 times instead of once.

**Why it matters for the press release:**
This fires on every authenticated page load — dashboard, grants list, pipeline, proposals. Under press traffic, this wasted work piles up, slows queries, and holds database connections longer (which makes #3 worse).

**What needs to happen:**
For each of the 10 flagged policies, wrap `auth.uid()` in a subquery: `(SELECT auth.uid())`. Postgres then computes it once per query instead of once per row. Each fix is one line.

I can apply all 10 via migration in one pass. Low risk — same approach as the foreign-key indexes that were applied earlier.

**Effort:** 30 minutes.

---

## 9. "Save to pipeline" is synchronous — piles up connections 🟠

**What it means in simple words:**
When a user clicks "Save to pipeline" on a grant, the app waits 5–15 seconds while n8n looks up the grant, calls the Eligibility Screener, has OpenAI score it, then writes results back. The database connection stays locked the whole time. If OpenAI is slow or rate-limited, the save fails.

**Why it matters for the press release:**
Saving a grant is one of the most common user actions. Under press traffic, every save ties up database resources for 5–15 seconds. Adds up fast with many users.

**What needs to happen (press-day mitigation):**
The proper fix is converting to async (multi-day). For press day, #7 (OpenAI retry) is the main mitigation — it prevents rate-limit failures from cascading. No additional workflow change needed if #7 is done.

**Effort:** Covered by #7. No extra work unless converting to async.

---

## 10. Proposal generation is synchronous — the biggest app blocker 🔴

**What it means in simple words:**
When a user clicks "Generate proposal":
1. App sends request to n8n and waits.
2. n8n makes 6 sequential OpenAI calls — extract, customize, generate, critique, suggest, parse.
3. While this runs (30–60 seconds), n8n holds 1–2 database connections.
4. Only after all 6 finish does the user's browser get an answer.

**Why it matters for the press release:**
10 users clicking "Generate proposal" at once = 20 database slots locked up for a minute. Combined with normal traffic, the 60-slot limit exhausts and **every page on the site starts failing** — not just proposal generation.

Also, browsers usually time out at 30 seconds. Users see "failed to generate proposal" even though n8n is still working.

**What needs to happen (proper fix — not press-day):**
Convert to async. User clicks "Generate" → gets "we're working on it" → result appears when ready via realtime updates or email. 3–5 day project.

**What needs to happen (press-day workaround):**
Rate-limit proposal generation at the app layer — allow only 1 in-flight proposal per organization. If the user tries a second while the first is running, they see "please wait — your previous proposal is still being generated." Doesn't fix the root cause but stops a few active users from knocking over the whole site.

**Effort:** Proper fix 3–5 days. Workaround 1–2 hours.

---

## 11. Pre-press-day n8n safety net 🟡

**What it means in simple words:**
There's exactly one n8n server. It runs fundory's workflows alongside ~40 unrelated workflows from other projects. If it crashes, every fundory AI feature dies at once. Also, if someone else's workflow goes wild, yours slow down too.

Moving fundory to a dedicated server is a multi-week project. But there's a 10-minute morning-of-press-day routine that substantially reduces risk.

**Why it matters for the press release:**
A fresh reboot starts the server with maximum free memory. A fresh export means if disaster strikes, you can restore in minutes instead of rebuilding workflows by hand.

**What needs to happen on press day morning:**
1. **Export all fundory workflows.** From a terminal: `ssh` to the n8n host, then `docker exec n8n n8n export:workflow --all --output=/tmp/backup.json`. Copy the file somewhere safe.
2. **Reboot the n8n server.** `sudo systemctl restart docker` (or reboot the EC2 instance). Verify n8n is back up and active workflows still trigger.
3. **Have someone watching the n8n dashboard during the first few hours of the press release** to catch any workflow crashes early.

**Effort:** 10 minutes.

---

## Post-press improvements (do later, not now)

These are real issues but too big for a press-day push. Schedule them for after the spike settles.

- **Convert proposal generation and add-to-pipeline to async** (3–5 days) — proper fix for #9 and #10. User clicks "Generate," app queues the job, user gets notified when ready. Eliminates synchronous long-holding of database connections entirely.
- **Move fundory to a dedicated n8n server** (~1 week) — or replace n8n with a proper job queue (BullMQ, AWS SQS). Eliminates the shared-server single point of failure in #11.
- **Consolidate 43 overlapping RLS policies** (3–5 hours) — separate Supabase advisor finding. Performance win, but needs careful testing since RLS controls data access.

---

## Priority summary (one-screen view)

| # | Task | Effort | Status |
|---|---|---|---|
| 1 | Commit & push `grants.description` fix | 5 min | ← start here |
| 2 | Cap narratives to 5 | 10 min | |
| 3 | Supabase pooler + plan upgrade | 1–2 hrs | |
| 4 | Raise ECS server limits | 30 min | pair with #3 |
| 5 | OpenAI budget & tier checkup | 30 min + 1–3 day wait | request early |
| 6 | CloudFront caching | 15 min | |
| 7 | OpenAI retry logic in workflows | 2–3 hrs | |
| 8 | Fix 10 RLS `auth.uid()` policies | 30 min | I can apply |
| 9 | (covered by #7) | — | — |
| 10 | Rate-limit proposal gen at app | 1–2 hrs | workaround |
| 11 | n8n export + reboot morning of press | 10 min | day-of |

**Must-fix total: ~6–8 hours of work + 1–3 day wait on OpenAI tier.**
