# Grant Fetch Workflow — Source Nodes

> **Workflow file:** `workflows/Grant fetch.json`
> **Integration guide (API details):** `docs/new-grant-sources.md`

The Grant Fetch workflow contains **41 source nodes** across 8 categories. The workflow is organized with sticky note groupings by category. Nodes marked as **New** were added in this round; the rest are pre-existing.

**Total: 5 existing + 36 new = 41 source nodes**

---

## Grants.gov — Federal (5 existing nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 1 | Grants.gov — Capacity Building | Grants.gov Capacity Building1 | Existing |
| 2 | Grants.gov — Child Welfare | Grants.gov Child Welfare1 | Existing |
| 3 | Grants.gov — Foster Care | Grants.gov Foster Care2 | Existing |
| 4 | Grants.gov — Minority/Equity | Grants.gov Minority/Equity1 | Existing |
| 5 | Grants.gov — Senior Services | Grants.gov Senior Services1 | Existing |

## Other Federal Sources (6 new nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 6 | SBIR/STTR (sbir.gov) | SBIR STTR Solicitations | New |
| 7 | SAM.gov Opportunities | SAM Gov Opportunities | New |
| 8 | SAM.gov Scraper | SAM.gov Scraper | New |
| 9 | NSF Award Search | NSF Award Search | New |
| 10 | NIH Reporter | NIH Reporter | New |
| 11 | USA Spending | USA Spending | New |

## State Sources (3 new nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 12 | Pennsylvania DCED Programs | PA DCED Programs1 | New |
| 13 | Georgia Grants Management | Georgia Grants Management4 | New |
| 14 | California Grants Portal | California Grants Portal | New |

## International Sources (4 new nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 15 | EU Funding & Tenders Portal | EU Funding Portal | New |
| 16 | UKRI Gateway to Research | UKRI Gateway | New |
| 17 | Australia GrantConnect (RSS) | Australia GrantConnect RSS | New |
| 18 | Canada Open Data (CKAN API) | Canada Open Data Grants | New |

## Foundation Web Scraping (5 new nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 19 | Gates Foundation Grants Page | Gates Foundation Grants Page1 | New |
| 20 | Ford Foundation Grants Page | Ford Foundation Grants Page1 | New |
| 21 | Candid Foundation Maps PA | Candid Foundation Maps PA1 | New |
| 22 | Yield Giving (MacKenzie Scott) | Yield Giving (MacKenzie Scott)1 | New |
| 23 | RWJF Active Funding | RWJF Active Funding | New |

## ProPublica Broad Searches (7 new nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 24 | ProPublica Foundation Search (page 0) | ProPublica Foundation P1 | New |
| 25 | ProPublica Foundation Search (page 1) | ProPublica Foundation P2 | New |
| 26 | ProPublica Foundation Search (page 2) | ProPublica Foundation P3 | New |
| 27 | ProPublica Endowment Search | ProPublica Endowment | New |
| 28 | ProPublica Grant Fund Search | ProPublica Grant Fund | New |
| 29 | ProPublica Philanthropy Search | ProPublica Philanthropy | New |
| 30 | ProPublica Trust Search | ProPublica Trust | New |

## ProPublica Individual Org Lookups (8 new nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 31 | Bloomberg Philanthropies (990 data) | ProPublica Bloomberg Philanthropies1 | New |
| 32 | Ford Foundation (990 data) | ProPublica Ford Foundation1 | New |
| 33 | Bill & Melinda Gates Foundation (990 data) | ProPublica Gates Foundation1 | New |
| 34 | W.K. Kellogg Foundation (990 data) | ProPublica Kellogg Foundation1 | New |
| 35 | Pennsylvania Foundations (990 data) | ProPublica PA Foundations1 | New |
| 36 | Robert Wood Johnson Foundation (990 data) | ProPublica RWJF1 | New |
| 37 | Rockefeller Foundation (990 data) | ProPublica Rockefeller Foundation1 | New |
| 38 | Walton Family Foundation (990 data) | ProPublica Walton Family Foundation1 | New |

## Other Sources (3 new nodes)

| # | Source | Node Name | Status |
|---|--------|-----------|--------|
| 39 | Philanthropy News Digest RFPs (RSS) | Philanthropy News Digest RFPs5 | New |
| 40 | Grantivia Grants | Fetch Grantivia Grants5 | New |
| 41 | Hardcoded Major Foundations (Bezos, CZI, etc.) | Hardcoded Major Foundations | New |

---

## Sources With Errors (In Progress)

The following sources currently have errors or need further inspection. These are actively being worked on:

| # | Source Node | Issue |
|---|------------|-------|
| 1 | **SBIR STTR Solicitations1** | API endpoint changed; new URL identified (`api.www.sbir.gov`), returns 429 rate limit — needs retry/batching config |
| 2 | **SAM Gov Opportunities1** | API URL required `/prod/` path prefix — fix identified, needs updated URL in workflow |
| 3 | **Yield Giving (MacKenzie Scott)1** | Large data returned but not yet inspected or validated |
| 4 | **RWJF Active Funding** | Needs further inspection |
| 5 | **Philanthropy News Digest RFPs5** | Needs further inspection |
| 6 | **Georgia Grants Management4** | Error — needs fix |
| 7 | **California Grants Portal1** | Needs further inspection |
| 8 | **EU Funding Portal1** | Axios error — needs fix |
| 9 | **UKRI Gateway1** | Axios error — needs fix |
| 10 | **Australia GrantConnect RSS1** | Axios error — needs fix |
| 11 | **All ProPublica Individual Org nodes** | Parsing issue — needs fix across: Bloomberg Philanthropies, Ford Foundation, Gates Foundation, Kellogg Foundation, PA Foundations, RWJF, Rockefeller Foundation, Walton Family Foundation |

> **Note:** Sources not listed above with no description have Axios errors that need to be diagnosed and fixed.
