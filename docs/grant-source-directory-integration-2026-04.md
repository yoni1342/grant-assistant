# Grant Source Directory — Integration Report

**Date:** April 2026
**Context:** Evaluating the 45+ sources in the Global Grant Source Directory (Opulent Management Services, 2025–2026) for inclusion in the scheduled grant fetch workflow.

---

## TL;DR

We sorted every source into three groups based on whether it publishes **discrete, currently-open grant opportunities** that fit our `grants` table shape (title, deadline, amount, eligibility).

- **Option 1 — Integrated now:** 6 sources that publish open RFPs.
- **Option 2 — Not integrated (rolling LOI funders):** 12 sources that accept applications but don't post discrete grants. Belong in a future "Funder Directory" feature, not the auto-fetch pipeline.
- **Option 3 — Excluded:** 18 sources that are invitation-only, staff-directed, one-time events, dead landing pages, or not actually grants.

---

## Option 1 — Integrated Sources

These now flow through the Centralized Scheduled Grant Fetch workflow. Each has a custom HTML scraper + parser node. They produce real grant rows that go through AI eligibility screening and land in the org's pipeline if matched.

| Source | Who it's for | What it funds |
|---|---|---|
| **NJ State Council on the Arts (NJSCA)** | Arts & cultural organizations incorporated or operating in New Jersey | Annual state arts grants across multiple programs |
| **NJ Small Cities CDBG** | ⚠️ Local governments only (non-entitlement counties & municipalities under 50k pop.). Nonprofits are not directly eligible — they'd partner with a municipality. | Housing rehab, public facilities, community revitalization, economic development |
| **Community Foundation of NJ (CFNJ)** | NJ-based nonprofits, especially in Morris/Essex/Sussex counties | Education, social services, human rights, environment, health, arts |
| **Heinz Endowments** | Nonprofits serving the Pittsburgh region | Arts & culture, education, environment, community wellbeing |
| **United Way of Northern NJ** | Nonprofits serving ALICE households (Asset Limited, Income Constrained, Employed) in Northern NJ | ALICE Recovery Fund — essential services, financial stability, crisis assistance |
| **Rare Impact Fund** | Youth mental health nonprofits, community-based programs | Current LOI cycle for nonclinical youth mental-health workforce and community solutions |

**Already integrated previously (for reference):** Grants.gov, Grantivia, California Grants Portal, PA DCED, Gates Grand Challenges, Amazon Community Impact.

---

## Option 2 — Not Integrated (Rolling LOI Funders)

These are big, well-known foundations. They accept unsolicited Letters of Inquiry year-round, but they **don't publish discrete grant opportunities** with deadlines, names, or dollar amounts. There's no "Ford Foundation Grant 2026 — apply by March 15." There's just "send us an LOI whenever you like, and if we're interested, we'll invite a full proposal."

**Sources in this group:**

- Ford Foundation
- W.K. Kellogg Foundation
- Robert Wood Johnson Foundation
- Annie E. Casey Foundation
- David & Lucile Packard Foundation
- Conrad N. Hilton Foundation
- Oak Foundation
- Harry & Jeanette Weinberg Foundation
- Jim Casey Youth Opportunities Initiative
- Prudential Foundation
- Rockefeller Foundation
- Bloomberg Philanthropies

### Why they don't fit auto-fetch

Our `grants` table is built around rows that look like `{title, deadline, amount, eligibility}`. Scraping these funders would produce rows like:

```
title:    "Ford Foundation — rolling LOI"
deadline: null
amount:   null
```

The same 12 useless entries would sit at the top of every user's pipeline forever. That's noise, not signal — and the AI eligibility screener has nothing concrete to match against.

### What they ARE good for

These are foundations our users absolutely want to pursue — they're well-funded, mission-aligned, and often have enormous grant ceilings. They just can't be auto-discovered. The right way to handle them is a **separate "Funder Directory" feature**, structurally different from the grants table:

- Each entry is a **funder**, not a grant
- Fields: focus areas, typical grant size, how to submit an LOI, program officer contacts, portal URL
- Per-org tracking: "did we send an LOI? when? what did we say? what was the response?"
- Reminders for follow-ups
- No deadlines, no auto-fetch, no AI eligibility screener — it's a CRM view

**Mental model:** "opportunities you apply to" (Option 1) vs. "funders you court" (Option 2). Two different data models, two different UX surfaces.

> **Next step for PM:** Decide whether a Funder Directory feature is on the roadmap. If yes, we'll spec a new `funders` table + UI page separately from the grants pipeline.

---

## Option 3 — Excluded

These were considered but **ruled out** during the audit. Skip them entirely — don't revisit unless the funder changes its giving model.

| Source | Why excluded |
|---|---|
| **Bill & Melinda Gates Foundation** | Mostly staff-identified, invitation-driven |
| **MacArthur Foundation** | Primarily staff-initiated |
| **Open Society Foundations** | Invitation-only for most programs |
| **Kresge Foundation** | Invite-only for most programs |
| **MacKenzie Scott / Yield Giving** | One-time Open Call events, not a recurring pipeline |
| **Casey Family Programs** | Systems-change, staff-directed |
| **Draper Richards Kaplan (DRK)** | Venture philanthropy, application waves, not open RFPs |
| **Apple Community Education Initiative** | Relationship-based, mostly in-kind |
| **Ticket to Work / SSA** | Contract model, not grants |
| **JPMorgan Chase Foundation** | Corporate giving, initiative-gated |
| **Bank of America Charitable Foundation** | Corporate giving, regional invitation |
| **Wells Fargo Foundation** | Corporate giving, mostly closed |
| **Walmart Foundation** | Corporate giving, initiative-specific |
| **Amazon Community Giving** | Local/invitation-based |
| **AARP Foundation** | Narrative-only grants page, invitation-based — **scraper attempted and abandoned** |
| **Google.org Opportunities** | Client-rendered JS shell, no server HTML — **scraper attempted, blocked by no-SSR** |
| **Dodge Foundation** | Only exposes awarded-grantee database, not open RFPs — **scraper attempted and removed** |
| **Lumina Foundation** | Only exposes awarded-grantee database, not open RFPs — **scraper attempted and removed** |
| **Walton Family Foundation** | Only exposes awarded-grantee database, not open RFPs — **scraper attempted and removed** |
| **Candid / Foundation Directory** | Aggregator tool (potential future paid integration), not a source |
| **Instrumentl** | Aggregator tool (potential future paid integration), not a source |
| **GrantWatch** | Aggregator tool, not a source |
| **Fundory.AI / Brownmine.AI** | Our own product |

---

## Summary Numbers

| Group | Count | Status |
|---|---|---|
| Option 1 — Integrated | 6 net-new (+ 6 already present) | ✅ Live |
| Option 2 — Funder Directory candidates | 12 | ⏸ Awaiting product decision |
| Option 3 — Excluded | 18+ | ❌ Do not revisit |

## Notes for the Team

- **NJSCA and NJ CDBG** use nj.gov, which is behind Incapsula bot protection. Our scrapers currently work but may need a headless-browser fallback (ScrapingBee or equivalent) if Incapsula tightens.
- **NJ CDBG is local-government-only** — the AI eligibility screener will reject every row for nonprofit orgs. It's still useful for municipality customers, but expect low match rates for most users.
- **Three aggregators** (Candid, Instrumentl, GrantWatch) are worth revisiting as paid integrations. A single Candid API subscription (~$50/mo nonprofit rate) would cover most of Option 2's foundations structurally, removing the need for 12 individual scrapers if we ever decide to auto-fetch them.
