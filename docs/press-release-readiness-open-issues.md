# Press Release Readiness — Open Issues

**Date:** 2026-04-24 (updated)
**Status:** Only open items. All fixed items removed. Ordered by priority — top of the list first.

---

## How to use this doc

Work top to bottom. Each item has: what it means in simple words, why it matters for the press release, what needs to happen, and roughly how long it takes.

Total estimated effort: **~3 hours of active work + 1–3 day wait on OpenAI tier upgrade.**

---

## 1. Cap narratives to 5 in proposal generation 🔴

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

## 2. Supabase database can only handle 60 connections 🔴

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

## 3. Only 5 web servers can run at once 🔴

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

**Pair with #2 above.** Don't do this first.

---

## 4. OpenAI budget and rate limits could cut you off mid-spike 🔴

**What it means in simple words:**
Every AI call costs money and tokens. There are three separate ways OpenAI can stop working under heavy traffic:

1. **Rate limit (requests per minute)** — "too many requests, slow down." Fixable with retry logic.
2. **Token-per-minute limit (TPM)** — "processed too many words per minute." Only fixable by upgrading your OpenAI account tier.
3. **Monthly usage cap or depleted credit balance** — "you've spent all the money you set aside." Retrying does NOT help here — you're literally out of budget. Every AI feature goes dark until someone raises the cap or adds funds.

Rough cost math for a press week:
- 10,000 proposals generated = ~$300
- 10,000 proposals for orgs with many narratives (before fix #1) = **$2,000–$3,000**

**Why it matters for the press release:**
If you hit Mode 2 or Mode 3, retry logic won't save you. The app's AI features just stop working. Users see "failed to generate proposal" with no fix in sight until someone manually intervenes.

**What needs to happen (do all of these before press day):**
1. Go to platform.openai.com → Settings → Limits. Check your current tier, RPM/TPM limits, and monthly usage cap.
2. **Raise the monthly usage cap** to 5–10x your normal spend. You're not committing to spend it — this is just the ceiling. Set it high enough a 10x traffic spike won't blow through it.
3. **Request a tier upgrade** if you're below Tier 3. Email OpenAI support with expected volume. Takes 1–3 business days, so do this now.
4. **Set usage alerts** at 50%, 75%, 90% — OpenAI emails you so you're not surprised.
5. Verify billing payment method is current and valid.

**Effort:** 30 minutes today + 1–3 day wait for tier upgrade response.

---

## 5. CloudFront isn't caching anything for the homepage 🟠

**What it means in simple words:**
CloudFront is AWS's worldwide network of mini-servers. Their job is to remember popular pages so your main server doesn't answer the same question 10,000 times. Right now CloudFront is set to "remember answers for zero seconds" — it throws each answer away immediately. Every single visitor reaches all the way back to your main AWS server.

**Why it matters for the press release:**
When the press article links to your homepage, thousands of people click the same link. Every click wakes a web server and uses a database slot. With even 1–5 minutes of caching, most of those clicks get an instant copy from the nearest edge server, free. Your main servers only get hit once per minute per region.

**What needs to happen:**
In `terraform/modules/cloudfront/main.tf`, change `default_ttl = 0` to `default_ttl = 300` (5 minutes). Leave `/api/*` uncached — those must always be fresh. Only marketing pages get cached.

**Effort:** 15 minutes.

---

## Priority summary (one-screen view)

| # | Task | Effort | Status |
|---|---|---|---|
| 1 | Cap narratives to 5 | 10 min | ← start here |
| 2 | Supabase pooler + plan upgrade | 1–2 hrs | |
| 3 | Raise ECS server limits | 30 min | pair with #2 |
| 4 | OpenAI budget & tier checkup | 30 min + 1–3 day wait | request early |
| 5 | CloudFront caching | 15 min | |

**Must-fix total: ~3 hours of work + 1–3 day wait on OpenAI tier.**
