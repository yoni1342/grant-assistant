# Press Release Readiness — Open Issues

**Date:** 2026-04-22
**Status:** Unresolved items only. Already-fixed items are omitted.

This document lists every known issue that could cause problems when the press release goes out and traffic spikes. Issues are grouped by where they live: **AWS / hosting**, **n8n workflows (big problems)**, and **n8n workflows (smaller problems)**.

Simple rule of thumb: fix the things in the top section first. They have the biggest impact.

---

## Already fixed (for reference)

1. Five public database tables had no security rules — anyone on the internet could read or write them. **Fixed.**
2. The avatar storage bucket allowed anyone to list every uploaded avatar file. **Fixed.**
3. Sentry was recording 100% of user activity, which would burn through the monthly quota in hours under high traffic. Lowered to 10%. **Fixed.**

---

## AWS / Hosting — 3 open issues

### 1. Supabase database can only handle 60 connections at the same time 🔴

**What it means in simple words:**
The database is the part that stores all your data (users, grants, proposals, etc.). Right now it can only talk to 60 "customers" at the same time. Every page on your website that shows user data counts as one customer. Under normal traffic you're using about 14 of the 60 slots. Under press traffic, those 60 slots get filled up in seconds, and then every new visitor sees an error page.

**Why it matters for the press release:**
This is the single biggest thing that will break. Even if we add more web servers, they all share the same 60-slot database. More servers without fixing this actually makes it worse, not better.

**What needs to happen:**
- Switch the app to use Supabase's "transaction pooler" instead of the direct database connection. The pooler lets many more customers share the 60 slots efficiently.
- Upgrade the Supabase plan from Free to Pro (or higher). Pro gives you 200 slots instead of 60. Pro also unlocks bigger database hardware if needed.

**Effort:** About 1–2 hours total. Includes changing one environment variable, testing, redeploying, and the plan upgrade.

---

### 2. Only 5 web servers can run at once — capped too low 🔴

**What it means in simple words:**
Your app runs on AWS as a small "fleet" of web servers. Each server can handle roughly 30–80 visitors at the same time. Right now the fleet is set to grow from 2 servers up to a maximum of 5. Under press traffic, 5 servers is way too few — the 6th, 7th, 8th server never gets created because we told AWS never to go above 5.

On top of that, each of those 5 servers is small (1 CPU core, 2 GB of memory). That's about the same power as a modest laptop. Under heavy traffic each one gets overloaded quickly.

**Why it matters for the press release:**
Imagine a restaurant with only 5 cashiers when 2,000 customers walk in at once. The line goes out the door. Most visitors will see slow pages or errors.

**What needs to happen:**
- Raise the maximum from 5 to 15 servers.
- Give each server 2 CPU cores and 4 GB of memory (twice the size).
- Apply the Terraform change (about 5 minutes).

**Important:** This must be done **together** with issue #1 above. If we add more servers but don't fix the database limit, the extra servers just break the database faster.

**Effort:** About 30 minutes. File edit is 1 minute; the rest is carefully applying the change to live AWS and watching the deployment.

---

### 3. CloudFront isn't caching anything for the homepage 🟠

**What it means in simple words:**
CloudFront is AWS's worldwide network of "mini-servers" in every major city. Their job is to remember the answer to popular questions so your main server doesn't have to answer the same thing 10,000 times. For example, when the first visitor in Frankfurt loads your homepage, CloudFront should store a copy locally. Then the next 10,000 Frankfurt visitors get the copy instantly without bothering your main server in Virginia.

Right now CloudFront is set to "remember answers for zero seconds" — so it throws every answer away immediately. Every single visitor reaches all the way back to your AWS servers, even though 99% of them are asking for the exact same homepage.

**Why it matters for the press release:**
When the press article links to your homepage, thousands of people click the same link. Every click wakes up a web server and uses a database slot. With caching set to even 1–5 minutes, most of those clicks get an instant copy from the nearest CloudFront server, for free. Your main servers only get hit once per minute per region.

**What needs to happen:**
- Change one setting in Terraform from `default_ttl = 0` to `default_ttl = 300` (5 minutes).
- Keep API routes (the `/api/*` paths) uncached — those must always be fresh. Only the marketing pages get cached.
- Apply the Terraform change.

**Effort:** About 15 minutes.

---

## n8n Workflows — Big Problems

Important context: n8n is a separate server on AWS (at IP 100.29.112.47) that runs your "automation workflows" — things like generating a proposal, screening a grant, or adding a grant to the pipeline. It's a single server with 116 workflows on it. Only about 24 of those are fundory-related. The other ~40 active workflows belong to other projects (Zillow, Capital City, Kimberly, etc.). So during your press spike, your workflows are fighting for resources with unrelated projects on the same machine. **There is no backup — if this one server goes down, proposal generation, adding grants, eligibility screening, and more all stop working for everyone.**

### 4. Generating a proposal is a very long chain that blocks the whole request 🔴

**What it means in simple words:**
When a user clicks "Generate proposal," here's what actually happens behind the scenes:

1. Your web app sends the request to n8n and **waits** for n8n to finish.
2. n8n makes **6 calls to OpenAI in a row** — extract narratives, customize each one, generate the proposal, critique it, suggest rewrites, parse the result.
3. While this is happening (typically 30–60 seconds), n8n is **holding on to 1–2 database slots** that nobody else can use.
4. Only after all 6 OpenAI calls finish does the user's browser get an answer.

**Why it matters for the press release:**
If 10 users click "Generate proposal" at the same time during the press spike, that's 20 database slots locked up for a minute each. Combined with normal traffic, the 60-slot database limit gets exhausted and **every page on the site starts failing** — not just proposal generation.

Also, user browsers usually time out after 30 seconds. So even before the database problem, users with slow connections will see "failed to generate proposal" even though n8n is still working in the background.

**What needs to happen (the proper fix):**
Change proposal generation from "wait until done" to "start the job, come back later." The user clicks "Generate," gets told "we're working on it, check back in a minute," and the app shows the result when it's ready (using live updates or email). This is how most modern apps handle slow AI tasks. But this is a several-day project, not something we can do before the press release.

**What needs to happen (the press-day workaround):**
Put a limit in the app itself — for example, only allow 1 proposal generation per organization at a time. If someone tries to generate a second proposal while the first is still running, they see "please wait — your previous proposal is still being generated." This doesn't solve the root problem but stops a small number of active users from knocking over the whole site.

**Effort:** Proper fix is 3–5 days. Workaround is about 1–2 hours.

---

### 5. No automatic retry when OpenAI is overloaded 🔴

**What it means in simple words:**
When you call OpenAI thousands of times per minute, OpenAI starts saying "too many requests, slow down" (technically a "429 error"). This is expected and normal. Most well-built apps handle this by waiting a second and trying again.

Your workflows **do not retry**. The moment OpenAI says "slow down," the workflow crashes and the user sees "failed to generate proposal" with no automatic recovery.

**Why it matters for the press release:**
Under a press spike, you'll hit OpenAI's rate limits within minutes. The first 50–100 users get their proposals fine. User #101 hits the limit — their proposal fails. So does user #102, #103, #104. All they see is an error message with no clue that the fix is "wait 10 seconds and try again."

**What needs to happen:**
Wrap every important OpenAI call in a "try up to 3 times with increasing wait" block — try, wait 1 second, try, wait 2 seconds, try, wait 4 seconds, then give up. This is a standard pattern. Need to apply it to all proposal-generation, eligibility-screening, and narrative-customization workflows.

**Effort:** About 30 minutes per workflow × 5 critical workflows = 2–3 hours total.

---

### 6. Two copies of the same scheduled workflow are both running 🔴

**What it means in simple words:**
There's a workflow called "Centralized Scheduled Grant fetch" that runs on a schedule and pulls new grants from external sources. Two copies of this workflow are installed and both are active. Every time the schedule fires, **both copies run at the same time** — doing the exact same work twice. This means double the database writes, double the external API calls, double the CPU usage.

The older copy was probably supposed to be deleted when the newer queue-based version shipped, but someone forgot.

**Why it matters for the press release:**
If the scheduled run happens to overlap with the press release window, you get double load on an already stressed database. Even outside the press window, you're wasting resources and potentially creating duplicate data.

**What needs to happen:**
Deactivate the older copy (ID `u1iLnviPTmdR5hPU`, last updated April 15). Keep the newer one (ID `oERZPWaPWGk642Ec`, updated today). Two clicks in the n8n dashboard.

**Effort:** 2 minutes. Zero risk.

---

### 7. Proposal generation loops over every single narrative with no limit 🟠

**What it means in simple words:**
Inside proposal generation, there's a step called "Narrative Library with AI Customization." It takes every narrative document in the organization's library and runs a separate OpenAI call to customize each one for the specific grant.

**There is no limit on how many narratives.** If an organization has uploaded 20 narrative documents, the workflow runs 20 sequential OpenAI calls, each taking about 20 seconds. That's **6–10 minutes** just for the narrative-customization step of a single proposal generation.

**Why it matters for the press release:**
Organizations with rich document libraries will see proposal generation take 10+ minutes. The user's browser times out long before then. Meanwhile, the database slot stays locked the whole time.

**What needs to happen:**
Add one line of code in the workflow to cap the number of narratives used per proposal at 5 (top 5 by relevance). This is a one-line change in the "Prepare Context" node.

**Effort:** 10 minutes including testing.

---

### 8. Adding a grant to the pipeline is also synchronous 🟠

**What it means in simple words:**
Similar story to #4, but smaller. When a user clicks "Save to pipeline" on a grant, your app waits while n8n does the following in a chain:

1. Look up the grant in the database.
2. Call another workflow called "Eligibility Screener."
3. The Screener makes an OpenAI call to score whether the user's organization qualifies for the grant.
4. Write results back to the database.

This takes about 5–15 seconds per save. Database slots stay locked the whole time. If OpenAI is slow or rate-limited (see #5), "Save to pipeline" fails for the user.

**Why it matters for the press release:**
Saving a grant is one of the most common actions users take. Under press traffic, every save ties up database resources for 5–15 seconds. Adds up fast.

**What needs to happen:**
Same fix as #4 — convert to async (user clicks save, sees "saving in background," result appears when ready). Same multi-day effort. Press-day workaround: make sure OpenAI retry (#5) is in place so this stops failing on rate limits.

**Effort:** Covered by fixing #5.

---

## n8n Workflows — Smaller Problems

### 9. One workflow is broken because a required tool isn't installed 🟡

**What it means in simple words:**
A backup workflow called `n8n_work$cred_backup` tries to run git commands to back up credentials. The command-line tools it needs aren't available inside the n8n container, so every time it tries to run, it fails and logs an error.

**Why it matters:**
Not a traffic issue. It's just spamming the error logs with failures that aren't real problems. Under a traffic spike, these fake errors can drown out real errors that we actually need to see.

**What needs to happen:**
Either deactivate the workflow (easiest — 2 clicks) or replace the bash-based backup with a native code-based one. If you don't need automated credential backups right now, just deactivate it.

**Effort:** 2 minutes to deactivate. A few hours if you want to rewrite it properly.

---

### 10. Two workflows use a "blotato" tool that isn't installed 🟡

**What it means in simple words:**
Two workflows reference a custom tool called `blotato` (looks like it's for social media posting). The tool isn't installed on the n8n server, so these workflows fail to start. These appear to be for a different project, not fundory.

**Why it matters:**
Same as #9 — noise in error logs. Nothing actually broken on fundory's side.

**What needs to happen:**
Either install the tool or (better, since it's not fundory) ask whoever set them up to clean them up. Not press-critical.

**Effort:** 5 minutes to deactivate. Not urgent.

---

### 11. The n8n server itself is a single point of failure 🟡

**What it means in simple words:**
There is exactly one n8n server. If it crashes, restarts, or gets overloaded by another project's workflow, **all of fundory's automation stops working** — proposal generation, grant saving, eligibility screening, everything. There's no backup server ready to take over.

Also, that single server is shared with 40+ unrelated workflows from other projects. If someone else's Zillow scraper goes wild and eats all the CPU, your proposal generation slows down too.

**Why it matters for the press release:**
If anything goes wrong with the n8n server during the spike — out of memory, a bad deploy elsewhere, network issue — every user-facing AI feature dies at once.

**What needs to happen (big fix):**
Move fundory's workflows to a dedicated n8n server that only fundory uses. Or replace n8n entirely with a proper job queue (BullMQ, AWS SQS, etc.). This is a multi-week project.

**What needs to happen (short-term mitigation):**
- Take a full export of all fundory workflows before the press release (for fast recovery if the server dies).
- Reboot the n8n server the morning of the press release so it starts fresh with maximum free memory.
- Have someone watching the n8n dashboard during the first few hours of the press release to catch any workflow crashes early.

**Effort:** 10 minutes for the backup export + reboot. Proper fix is weeks.

---

### 12. Recent database errors haven't been investigated 🟡

**What it means in simple words:**
In the last 24 hours, the database logs show a few unexplained errors:

- "column 'description' does not exist" — a query is referencing a column that isn't there
- "invalid UUID syntax" — something is passing malformed IDs
- "null value in column 'org_id' violates not-null constraint" — a notification is being created without an organization ID

These aren't causing anything visibly broken, but they mean something in the app is silently failing for some users.

**Why it matters for the press release:**
Press traffic **amplifies** existing silent bugs. An error that affects 1 in 10,000 requests becomes dozens of errors per minute under a spike. Worth understanding before the spotlight hits.

**What needs to happen:**
Spend 30 minutes tracing each of the 3 error types to find which code path is hitting them, and fix or at least understand them.

**Effort:** 30–60 minutes.

---

### 13. Some database foreign keys aren't indexed 🟡

**What it means in simple words:**
A "foreign key" is how one table points to another — for example, `grant_email_log.org_id` points to an entry in the `organizations` table. For these lookups to be fast, there should be an "index" on that column. Several of your foreign keys don't have indexes. Each lookup scans the whole table, which is slow.

Under low traffic this is fine. Under high traffic, slow queries pile up, hold connections longer (see issue #1), and everything gets worse together.

**Why it matters for the press release:**
Makes every existing bottleneck worse. Not a direct cause of downtime, but a multiplier.

**What needs to happen:**
Run a script that adds missing indexes. Supabase's performance advisor can list them. This is a safe operation — creating an index doesn't break anything.

**Effort:** 30–60 minutes including testing on staging first.

---

## Summary — Priority Order for Press-Day Prep

**Must fix before press (high impact, low effort):**
1. Deactivate duplicate grant-fetch workflow (#6) — 2 minutes
2. Cap narratives to 5 in proposal generation (#7) — 10 minutes
3. Switch Supabase to pooler + upgrade plan (#1) — 1–2 hours
4. Raise ECS server limit + server size (#2) — 30 minutes
5. Add CloudFront caching (#3) — 15 minutes
6. Add OpenAI retry logic (#5) — 2–3 hours
7. Export n8n workflow backup + reboot server (#11 mitigation) — 10 minutes

**Should fix if time allows:**
8. Rate-limit proposal generation at app layer (#4 workaround) — 1–2 hours
9. Investigate recent silent DB errors (#12) — 30–60 minutes
10. Add missing DB indexes (#13) — 30–60 minutes

**Not urgent for press day:**
11. Deactivate broken backup workflow (#9) — 2 minutes
12. Clean up non-fundory broken workflows (#10) — 5 minutes
13. Convert proposal generation to async (#4 proper fix) — 3–5 days
14. Move fundory to dedicated n8n server (#11 proper fix) — weeks

**Total estimated time to cover all "must-fix" items: 6–8 hours.**
