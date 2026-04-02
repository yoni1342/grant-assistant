# New Grant Sources — n8n Integration Guide

Add these sources to the **Grant Fetch** workflow in n8n. Each source has an HTTP Request node and a Code node to normalize the response into the standard grant format.

The standard grant format expected by the downstream nodes:
```json
{
  "oppNum": "unique-id",
  "title": "Grant Title",
  "description": "Grant description",
  "link": "https://...",
  "openDate": "2026-01-01",
  "closeDate": "2026-12-31",
  "agency": "Funder Name",
  "agencyCode": "",
  "category": "Federal|Foundation|State",
  "source": "Source Name",
  "awardFloor": 0,
  "awardCeiling": 100000,
  "status": "posted"
}
```

---

## 1. SBIR/STTR (Small Business Innovation Research)

**HTTP Request Node:**
- Method: GET
- URL: `https://www.sbir.gov/api/solicitations.json?keyword=&rows=100&start=0`
- No auth required

**Code Node (Extract SBIR Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const solicitations = data.results || data || [];
  
  if (!Array.isArray(solicitations)) continue;
  
  for (const s of solicitations) {
    grants.push({
      json: {
        oppNum: 'SBIR-' + (s.solicitation_id || s.id || Date.now()),
        title: s.solicitation_title || s.title || 'Untitled',
        description: (s.abstract || s.description || '').substring(0, 1000),
        link: s.solicitation_url || s.url || 'https://www.sbir.gov',
        openDate: s.open_date || s.release_date || '',
        closeDate: s.close_date || s.deadline || '',
        agency: s.agency || s.branch || 'SBIR/STTR',
        agencyCode: s.agency_code || '',
        category: 'Federal - SBIR/STTR',
        source: 'SBIR.gov',
        awardFloor: s.award_floor || 0,
        awardCeiling: s.award_ceiling || 0,
        status: s.status || 'posted'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'sbir' } }];
```

---

## 2. SAM.gov Opportunities API

**HTTP Request Node:**
- Method: GET
- URL: `https://api.sam.gov/opportunities/v2/search?limit=100&postedFrom=01/01/2026&api_key=YOUR_SAM_API_KEY`
- Get a free API key at: https://sam.gov/content/entity-registration

**Code Node (Extract SAM Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const opportunities = data.opportunitiesData || data.opportunities || [];
  
  if (!Array.isArray(opportunities)) continue;
  
  for (const opp of opportunities) {
    grants.push({
      json: {
        oppNum: 'SAM-' + (opp.noticeId || opp.solicitationNumber || Date.now()),
        title: opp.title || 'Untitled',
        description: (opp.description || opp.organizationType || '').substring(0, 1000),
        link: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
        openDate: opp.postedDate || '',
        closeDate: opp.responseDeadLine || opp.archiveDate || '',
        agency: opp.fullParentPathName || opp.departmentName || 'Federal',
        agencyCode: opp.solicitationNumber || '',
        category: 'Federal',
        source: 'SAM.gov',
        awardFloor: opp.award?.floor || 0,
        awardCeiling: opp.award?.ceiling || 0,
        status: opp.active === 'Yes' ? 'posted' : 'closed'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'sam' } }];
```

---

## 3. NSF Award Search API

**HTTP Request Node:**
- Method: GET
- URL: `https://api.nsf.gov/services/v1/awards.json?keyword=community+health&dateStart=01/01/2026&printFields=id,title,abstractText,startDate,expDate,awardeeName,fundsObligatedAmt,fundProgramName&offset=0&rpp=100`
- No auth required

**Code Node (Extract NSF Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const awards = data.response?.award || [];
  
  for (const a of awards) {
    grants.push({
      json: {
        oppNum: 'NSF-' + (a.id || Date.now()),
        title: a.title || 'Untitled',
        description: (a.abstractText || '').substring(0, 1000),
        link: `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${a.id}`,
        openDate: a.startDate || '',
        closeDate: a.expDate || '',
        agency: 'National Science Foundation',
        agencyCode: a.fundProgramName || '',
        category: 'Federal - NSF',
        source: 'NSF Awards',
        awardFloor: 0,
        awardCeiling: parseInt(a.fundsObligatedAmt) || 0,
        status: 'active'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'nsf' } }];
```

---

## 4. EU Funding & Tenders Portal

**HTTP Request Node:**
- Method: GET
- URL: `https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=*&query=(status%3D%27OPEN%27)&pageSize=100&pageNumber=1`
- No auth required

**Code Node (Extract EU Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const results = data.results || [];
  
  for (const r of results) {
    const meta = r.metadata || {};
    grants.push({
      json: {
        oppNum: 'EU-' + (meta.identifier?.fieldData || r.reference || Date.now()),
        title: meta.title?.fieldData || 'Untitled',
        description: (meta.description?.fieldData || '').substring(0, 1000),
        link: `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${meta.identifier?.fieldData || ''}`,
        openDate: meta.startDate?.fieldData || '',
        closeDate: meta.deadlineDate?.fieldData || '',
        agency: meta.programmePeriod?.fieldData || 'European Commission',
        agencyCode: meta.callIdentifier?.fieldData || '',
        category: 'International - EU',
        source: 'EU Funding Portal',
        awardFloor: 0,
        awardCeiling: 0,
        status: 'posted'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'eu' } }];
```

---

## 5. UKRI Gateway to Research

**HTTP Request Node:**
- Method: GET
- URL: `https://gtr.ukri.org/gtr/api/funds?q=*&s=100&f=fund.end:gt:2026-01-01`
- Headers: `Accept: application/json`
- No auth required

**Code Node (Extract UKRI Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const funds = data.fund || [];
  
  for (const f of funds) {
    grants.push({
      json: {
        oppNum: 'UKRI-' + (f.id || Date.now()),
        title: f.valuePounds ? `UKRI Fund - £${Number(f.valuePounds.amount).toLocaleString()}` : 'UKRI Fund',
        description: (f.abstractText || f.category || '').substring(0, 1000),
        link: `https://gtr.ukri.org/projects?ref=${f.id}`,
        openDate: f.start || '',
        closeDate: f.end || '',
        agency: f.funder?.name || 'UKRI',
        agencyCode: '',
        category: 'International - UK',
        source: 'UKRI Gateway',
        awardFloor: 0,
        awardCeiling: f.valuePounds?.amount || 0,
        status: 'active'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'ukri' } }];
```

---

## 6. California Grants Portal

**HTTP Request Node:**
- Method: GET
- URL: `https://www.grants.ca.gov/api/v1/grants?status=open&page=1&per_page=100`
- No auth required

**Code Node (Extract CA Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const results = data.data || data.grants || data || [];
  
  if (!Array.isArray(results)) continue;
  
  for (const g of results) {
    grants.push({
      json: {
        oppNum: 'CA-' + (g.id || g.grantID || Date.now()),
        title: g.title || g.grantTitle || 'Untitled',
        description: (g.description || g.grantDescription || '').substring(0, 1000),
        link: g.url || g.link || 'https://www.grants.ca.gov',
        openDate: g.openDate || g.postedDate || '',
        closeDate: g.closeDate || g.deadline || '',
        agency: g.grantorName || g.agency || 'California State',
        agencyCode: '',
        category: 'State - California',
        source: 'CA Grants Portal',
        awardFloor: g.estimatedAmountMin || g.awardFloor || 0,
        awardCeiling: g.estimatedAmountMax || g.awardCeiling || 0,
        status: 'posted'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'ca-grants' } }];
```

---

## 7. Australia GrantConnect (RSS)

**HTTP Request Node:**
- Method: GET
- URL: `https://www.grants.gov.au/Rss/Open`
- Response Format: Text
- No auth required

**Code Node (Extract AU Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const rss = item.json.data || item.json.body || item.json;
  if (typeof rss !== 'string') continue;
  
  const itemMatches = rss.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  
  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>([^<]+)<\/title>/);
    const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/);
    
    if (!titleMatch) continue;
    
    const title = titleMatch[1].replace(/(<!\[CDATA\[|\]\]>)/g, '').trim();
    const link = linkMatch ? linkMatch[1].trim() : '';
    const desc = descMatch ? descMatch[1].replace(/(<!\[CDATA\[|\]\]>)/g, '').replace(/&amp;/g, '&').trim() : '';
    
    grants.push({
      json: {
        oppNum: 'AU-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        title: title,
        description: desc.substring(0, 1000),
        link: link,
        openDate: pubDateMatch ? pubDateMatch[1].trim() : '',
        closeDate: 'See grant details',
        agency: 'Australian Government',
        agencyCode: '',
        category: 'International - Australia',
        source: 'GrantConnect AU',
        awardFloor: 0,
        awardCeiling: 0,
        status: 'posted'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'au-grants' } }];
```

---

## 8. Canada Open Data (CKAN API)

**HTTP Request Node:**
- Method: GET
- URL: `https://open.canada.ca/data/api/3/action/package_search?q=grant+contribution&rows=100&sort=metadata_modified+desc`
- No auth required

**Code Node (Extract CA-GOV Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const results = data.result?.results || [];
  
  for (const r of results) {
    grants.push({
      json: {
        oppNum: 'CAN-' + (r.id || Date.now()),
        title: r.title || 'Untitled',
        description: (r.notes || '').substring(0, 1000),
        link: `https://open.canada.ca/data/en/dataset/${r.name || r.id}`,
        openDate: r.metadata_created || '',
        closeDate: '',
        agency: r.organization?.title || 'Government of Canada',
        agencyCode: '',
        category: 'International - Canada',
        source: 'Canada Open Data',
        awardFloor: 0,
        awardCeiling: 0,
        status: 'posted'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'canada' } }];
```

---

## 9. IRS 990 Foundation Data (via ProPublica API — Enhanced)

This enhances the existing ProPublica integration by dynamically searching for grant-making foundations based on the org's sector, rather than using hardcoded PA-specific lookups.

**HTTP Request Node:**
- Method: GET
- URL: `https://projects.propublica.org/nonprofits/api/v2/search.json?q=foundation+grant&page=0`
- No auth required

**Code Node (Extract Foundation Grants):**
```javascript
const items = $input.all();
const grants = [];

for (const item of items) {
  const data = item.json;
  const orgs = data.organizations || [];
  
  for (const org of orgs) {
    const name = (org.name || '').toLowerCase();
    const isGrantMaker = name.includes('foundation') || name.includes('trust') || name.includes('fund') || name.includes('endowment');
    
    if (!isGrantMaker) continue;
    if (org.total_revenue < 100000) continue; // Filter out very small foundations
    
    grants.push({
      json: {
        oppNum: 'IRS990-' + (org.ein || Date.now()),
        title: org.name + ' — Potential Grant Source',
        description: `Tax-exempt foundation in ${org.city || 'Unknown'}, ${org.state || 'US'}. Total revenue: $${(org.total_revenue || 0).toLocaleString()}. Review their 990-PF for grant programs.`,
        link: `https://projects.propublica.org/nonprofits/organizations/${org.ein}`,
        openDate: new Date().toISOString().split('T')[0],
        closeDate: 'Ongoing — Contact directly',
        agency: org.name,
        agencyCode: org.ein || '',
        category: 'Foundation',
        source: 'IRS 990 / ProPublica',
        awardFloor: 0,
        awardCeiling: 0,
        status: 'active'
      }
    });
  }
}

return grants.length > 0 ? grants : [{ json: { empty: true, source: 'irs990' } }];
```

---

## How to Add in n8n

For each source:

1. **Add an HTTP Request node** with the URL and settings above
2. **Add a Code node** connected to it with the extraction code
3. **Connect the Code node output** to the same merge/combine node that the existing sources feed into (before the dedup/filter step)
4. Set **Continue On Fail = true** on both nodes so one source failing doesn't break the whole workflow
5. Set **Notes In Flow = true** and add a note describing the source

All 9 sources run in parallel — they don't depend on each other.
