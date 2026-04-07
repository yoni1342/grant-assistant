# Grant Source Audit — April 7, 2026

> **Workflow file:** `workflows/Grant fetch.json`
> **Related doc:** `docs/grant-fetch-sources.md`

## Summary

An audit of all grant source nodes in the Grant Fetch workflow revealed that several API sources are either dead, returning historical (non-open) data, or missing descriptions. This document captures the findings and recommended actions.

---

## Issue 1: Grantivia Grants Missing Descriptions

**Affected nodes:** `Extract Grantivia Grants5` (scheduled pipeline), `Extract Grantivia Grants` (webhook pipeline)

**Problem:** The Grantivia API (`https://grantivia.com/grants.json`) returns bare-bones grant metadata with no description, eligibility, funding amounts, or other detail fields. The scheduled pipeline node (`Extract Grantivia Grants5`) was producing placeholder descriptions like `"Grant - federal level"` by concatenating `funding_instrument + source_level`.

**Root cause:** The webhook pipeline node (`Extract Grantivia Grants`) already had enrichment logic that fetches full details from the Grants.gov REST API (`https://apply07.grants.gov/grantsws/rest/opportunity/details`), but the scheduled pipeline node (`Extract Grantivia Grants5`) did not.

**Fix applied:** Updated `Extract Grantivia Grants5` to match the enrichment logic in `Extract Grantivia Grants`. For each grant with a `source_url` containing `grants.gov`, the node now:
1. Extracts the opportunity ID from the URL
2. Calls the Grants.gov details API with `oppId=<id>`
3. Parses the full synopsis: description, award ceiling/floor, eligibility, funding categories, contact info, CFDA numbers, etc.
4. Falls back to the basic `"Grant - federal level"` only if the API call fails

**Status:** Fixed

---

## Issue 2: Grants.gov Search Results Missing Descriptions

**Affected node:** `Extract Grants.gov Results1`

**Problem:** The Grants.gov search API (`https://api.usaspending.gov/...` / `search2`) returns `oppHits` with only basic fields: `id`, `number`, `title`, `agencyCode`, `agency`, `openDate`, `closeDate`, `oppStatus`, `docType`, `cfdaList`. There is no `synopsis` or `description` field in the search response.

The extraction node was mapping `opp.synopsis || opp.description || ''` which always resolved to an empty string.

**Fix applied:** Updated `Extract Grants.gov Results1` to enrich each grant by calling the Grants.gov details API (`https://apply07.grants.gov/grantsws/rest/opportunity/details`) using the grant's `id` field. Same enrichment pattern as the Grantivia fix.

**Note:** This adds an API call per grant (~100+ grants per search), which will slow down the node. Consider batching or rate limiting if this becomes an issue.

**Status:** Fixed

---

## Issue 3: SBIR.gov API is Dead

**Affected node:** `SBIR STTR Solicitations`

**Endpoint:** `https://www.sbir.gov/api/solicitations.json?keyword=&rows=100&start=0`

**Problem:** Returns 404. The SBIR.gov website was rebuilt on Drupal 10 and the old `/api/solicitations.json` endpoint no longer exists.

**New endpoint found:** `https://api.www.sbir.gov/public/api/solicitations` — however, SBIR.gov states "The SBIR.gov APIs are currently undergoing maintenance."

**Impact:** None. All SBIR/STTR solicitations are posted on Grants.gov, which we already pull from.

**Recommendation:** Remove this node from the workflow.

**Status:** Broken — recommended for removal

---

## Issue 4: USASpending Returns Historical Awards, Not Open Grants

**Affected node:** `USA Spending`

**Endpoint:** `https://api.usaspending.gov/api/v2/search/spending_by_award/`

**Problem:** The USASpending API tracks federal spending — money that has already been awarded and obligated. Every record is a completed/closed award. It does not contain open funding opportunities that organizations can apply for.

**Impact:** Grants inserted from this source are not actionable — users cannot apply to them.

**Recommendation:** Remove this node from the workflow. If historical award data is wanted for research/context, move it to a separate non-pipeline workflow.

**Status:** Returns data but wrong data type — recommended for removal

---

## Issue 5: NIH Reporter Returns Historical Awards, Not Open Grants

**Affected node:** `NIH Reporter`

**Endpoint:** `https://api.reporter.nih.gov/v2/projects/search`

**Problem:** The NIH Reporter API searches funded research projects — grants already awarded to institutions. The current query searches for awards to "HARVARD MEDICAL SCHOOL" from 2020-2021. These are historical records, not open funding opportunities.

**Impact:** Same as USASpending — non-actionable data in the pipeline.

**Note:** All open NIH funding opportunities (FOAs) are posted on Grants.gov, which we already pull from. NIH is the largest contributor (~125 grants in recent search results).

**Recommendation:** Remove this node from the workflow.

**Status:** Returns data but wrong data type — recommended for removal

---

## Issue 6: NSF Awards API Returns Historical Awards, Not Open Grants

**Affected node:** `NSF Award Search`

**Endpoint:** `https://api.nsf.gov/services/v1/awards.json?keyword=...`

**Problem:** The NSF Awards API returns grants that have already been funded — award amounts, PI names, institutions, etc. Not open solicitations.

**Impact:** Same as above — non-actionable data.

**Note:** All open NSF funding opportunities are posted on Grants.gov.

**Recommendation:** Remove this node from the workflow.

**Status:** Returns data but wrong data type — recommended for removal

---

## Issue 7: ProPublica Returns Foundation Tax Data, Not Open Grants

**Affected nodes:** All ProPublica nodes (7 broad search + 8 individual org lookups = 15 nodes)

**Endpoint:** `https://projects.propublica.org/nonprofits/api/v2/search.json?q=...`

**Problem:** ProPublica's Nonprofit Explorer API returns IRS 990 tax filing data for nonprofits and foundations. It shows which foundations exist, their assets, revenue, and financials. It does **not** contain open RFPs, grant applications, or funding opportunities.

**Impact:** 15 nodes producing non-actionable data. These foundations may have open grants, but that information is not available through this API.

**Recommendation:** Remove from the grant pipeline. Could be repurposed in a separate "foundation research" feature if desired.

**Status:** Returns data but wrong data type — recommended for removal

---

## Issue 8: SAM.gov API Key Missing

**Affected node:** `SAM Gov Opportunities`

**Endpoint:** `https://api.sam.gov/opportunities/v2/search?limit=100&postedFrom=01/01/2026&api_key=REPLACE_WITH_SAM_API_KEY`

**Problem:** The URL contains a placeholder API key (`REPLACE_WITH_SAM_API_KEY`). SAM.gov requires a valid (free) API key. Additionally, the `postedTo` parameter is required — the API needs both `postedFrom` and `postedTo`, with a max range of 1 year.

**Note:** SAM.gov opportunities are primarily federal **contracts/procurements**, not grants. Useful if users pursue government contracts.

**Fix needed:**
1. Register at SAM.gov and get a free Public API Key
2. Add the key to the workflow
3. Add `postedTo` parameter

**Correct URL format:**
```
https://api.sam.gov/opportunities/v2/search?limit=1000&postedFrom=01/01/2026&postedTo=04/07/2026&api_key=YOUR_KEY
```

**Status:** API key requested — pending setup

---

## Issue 9: Hardcoded Major Foundations Returns Fake Grants

**Affected node:** `Hardcoded Major Foundations1`

**Problem:** This node contains a hardcoded list of 12 major foundations (Bezos Earth Fund, Chan Zuckerberg Initiative, Ballmer Group, Arnold Ventures, Kresge, Annie E. Casey, California Endowment, JPB Foundation, Heinz Endowments, William Penn Foundation, Philadelphia Foundation, Pittsburgh Foundation). It generates static "grant" entries every time the workflow runs.

These are **not real open grants**. They are fabricated entries with:
- Descriptions like `"Focus areas: ... Research their current RFPs and funding priorities."`
- `openDate` set to today's date
- `closeDate` set to `"Ongoing - Check website"`
- Estimated award ranges (not real)
- Links to foundation homepages (not to specific RFPs)

**Impact:** Pollutes users' pipelines with 12 fake grants on every run that cannot actually be applied to.

**Recommendation:** Remove from the pipeline. If foundation awareness is desired, implement as a static "Foundation Directory" feature in the app instead.

**Status:** Produces dummy data — recommended for removal

---

## Issue 10: RWJF Active Funding — No Usable API

**Affected nodes:** `RWJF Active Funding`, `Extract RWJF Opportunities`

**Endpoint:** `https://www.rwjf.org/en/grants/active-funding-opportunities.html?us=1`

**Problem:** The RWJF website loads its funding opportunity listings dynamically via JavaScript (React). The HTTP request only returns the HTML shell — the actual grant data is fetched client-side from an internal CMS endpoint (`/content/rwjf-web/us/en/_jcr_content.sitesearch.results.json`). This endpoint returns 500/400 errors when called directly — it requires specific internal parameters that their React frontend provides.

**Attempted fixes:**
- Tried multiple variations of the internal JSON endpoint with different query parameters — all returned 400 or 500 errors
- The page does render some static content (e.g., upcoming opportunities), but the active grant listings are loaded dynamically

**Impact:** RWJF typically only has 2-5 active funding opportunities at any time, all health equity focused. Low volume, niche source.

**Recommendation:** Remove from the workflow. Not worth maintaining a fragile scraper for such a small number of grants. Alternative approaches (headless browser rendering) are too complex for the payoff.

**Status:** No usable API — recommended for removal

---

## Issue 11: Gates Foundation — Committed Grants, Not Open Opportunities

**Affected node:** `Gates Foundation Grants Page1`

**Endpoint:** `https://www.gatesfoundation.org/about/committed-grants?page=1`

**Problem:** This page shows grants already awarded/committed since 1994. It is a historical database of past grantmaking, not open funding opportunities. The Gates Foundation operates on an invite-only model — they identify and reach out to organizations, not the other way around. There are no public open RFPs to scrape.

**Verified pages:**
- `https://www.gatesfoundation.org/about/committed-grants?page=1` — historical committed grants database

**Recommendation:** Remove from the workflow.

**Status:** Historical data, no open grants exist publicly — recommended for removal

---

## Issue 12: Ford Foundation — Mostly Invite-Only, No Scrapable Open RFPs

**Affected node:** `Ford Foundation Grants Page1`

**Verified pages:**
- `https://www.fordfoundation.org/work/our-grants/awarded-grants/grants-database/` — historical awarded grants, not open opportunities
- `https://www.fordfoundation.org/work/our-grants/grant-opportunities/` — has a grant opportunities page, but both listed programs (JustFilms, NYC Good Neighbor Committee) are currently closed. Most grants are identified by Ford staff (invite-only).

**Problem:** The awarded grants database is historical data. The grant opportunities page has only 1-2 niche programs that open/close periodically, no API or structured data to scrape, and most Ford grants remain invite-only. Not worth a dedicated node.

**Recommendation:** Remove from the workflow.

**Status:** No reliable open data to fetch — recommended for removal

---

## Issue 13: Yield Giving (MacKenzie Scott) — Invite-Only

**Affected node:** `Yield Giving (MacKenzie Scott)1`

**Verified pages:**
- `https://yieldgiving.com/gifts/` — database of gifts already awarded, not open opportunities. Site explicitly states they do not accept unsolicited proposals.

**Problem:** MacKenzie Scott's Yield Giving operates on an invite-only basis. Organizations cannot apply — they are selected and contacted directly. There are no open RFPs. The `/gifts/` page is a transparency database of past gifts, not a grant application portal.

**Recommendation:** Remove from the workflow.

**Status:** Invite-only model — recommended for removal

---

## Issue 14: Georgia Grants Management — Site is Down

**Affected node:** `Georgia Grants Management4`

**Endpoint:** `https://grantsmanagement.georgia.gov/grants`

**Problem:** The site returns `ECONNREFUSED` — the server is completely unreachable. The alternative URL `https://www.georgia.gov/grants` returns 404. The Georgia grants management portal appears to have been taken offline or moved to a new URL with no redirect.

**Recommendation:** Remove from the workflow.

**Status:** Site is dead — recommended for removal

---

## Sources That Are Working Correctly

| Source | Endpoint | Open Grants? | Status |
|--------|----------|-------------|--------|
| **Grants.gov API** | `api.grants.gov/v1/api/search2` | Yes | Working |
| **Grantivia** | `grantivia.com/grants.json` | Yes | Fixed (enriched) |
| **SAM.gov** | `api.sam.gov/opportunities/v2/search` | Yes (contracts) | Pending API key |

---

## Recommended Cleanup

### Remove from workflow (25+ nodes):
- SBIR.gov Solicitations (1 node) — API dead
- USASpending (1 node) — historical awards
- NIH Reporter (1 node) — historical awards
- NSF Awards (1 node) — historical awards
- ProPublica searches (7 nodes) — foundation tax data, not open grants
- ProPublica individual orgs (8 nodes) — foundation tax data, not open grants
- Hardcoded Major Foundations (1 node) — fake/static grant data
- RWJF Active Funding + Extract RWJF Opportunities (2 nodes) — no usable API
- Gates Foundation Grants Page (1 node) — historical awards, invite-only
- Ford Foundation Grants Page (1 node) — invite-only, no open RFPs
- Yield Giving / MacKenzie Scott (1 node) — invite-only
- Georgia Grants Management (1 node) — site is dead
- Associated extraction nodes for each of the above

### Keep and maintain:
- Grants.gov search nodes (5 nodes) — primary source of open federal grants
- Grantivia (2 nodes) — aggregated open grants, now enriched
- SAM.gov (once API key is configured) — federal contract opportunities

### Still need inspection:
- State sources (PA DCED, Georgia, California)
- International sources (EU, UKRI, Australia, Canada)
- Philanthropy News Digest RFPs (RSS)
- Candid Foundation Maps PA
