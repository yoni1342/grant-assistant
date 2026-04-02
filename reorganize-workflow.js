#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'workflows', 'Grant fetch.json');
const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// ============================================================
// STEP 1: Build name->index map
// ============================================================
function buildNameMap() {
  const map = {};
  workflow.nodes.forEach((n, i) => { map[n.name] = i; });
  return map;
}

let nameMap = buildNameMap();

// ============================================================
// STEP 2: Renames (node name, connections keys, connections targets, jsCode $() refs)
// ============================================================
const renames = {
  'usa spending1': 'USA Spending',
  'reporter1': 'NIH Reporter',
  'rwjf1': 'RWJF Active Funding',
  'Additional Major Foundations5': 'Hardcoded Major Foundations',
  'Additional Major Foundations6': 'Extract SAM Scraper',
  'Additional Major Foundations7': 'Extract USA Spending',
  'Additional Major Foundations8': 'Extract NIH Grants',
  'Additional Major Foundations9': 'Extract RWJF Opportunities',
  'Grants.gov Foster Care3': 'SAM.gov Scraper',
  'ProPublica Youth Orgs PA1': 'ProPublica Foundation P1',
  'ProPublica Senior Orgs PA1': 'ProPublica Foundation P2',
  'IRS 990 Foundation Search': 'ProPublica Foundation P3',
};

// Apply renames to node names
for (const [oldName, newName] of Object.entries(renames)) {
  const idx = nameMap[oldName];
  if (idx !== undefined) {
    workflow.nodes[idx].name = newName;
  }
}

// Update connections object keys
const newConnections = {};
for (const [key, val] of Object.entries(workflow.connections)) {
  const newKey = renames[key] || key;
  newConnections[newKey] = val;
}
workflow.connections = newConnections;

// Update connection targets (node references inside connection arrays)
function updateConnectionTargets(connections) {
  for (const key of Object.keys(connections)) {
    const outputs = connections[key].main || [];
    for (const output of outputs) {
      if (!Array.isArray(output)) continue;
      for (const conn of output) {
        if (renames[conn.node]) {
          conn.node = renames[conn.node];
        }
      }
    }
  }
}
updateConnectionTargets(workflow.connections);

// Update jsCode references $('oldName') -> $('newName')
for (const node of workflow.nodes) {
  if (node.parameters && node.parameters.jsCode) {
    let code = node.parameters.jsCode;
    for (const [oldName, newName] of Object.entries(renames)) {
      // Replace $('oldName') and $("oldName")
      code = code.split(`$('${oldName}')`).join(`$('${newName}')`);
      code = code.split(`$("${oldName}")`).join(`$("${newName}")`);
    }
    node.parameters.jsCode = code;
  }
}

// Rebuild name map after renames
nameMap = buildNameMap();

// ============================================================
// STEP 3: URL replacements for repurposed ProPublica nodes
// ============================================================
const urlReplacements = {
  'ProPublica Foundation P1': 'https://projects.propublica.org/nonprofits/api/v2/search.json?q=foundation&page=0',
  'ProPublica Foundation P2': 'https://projects.propublica.org/nonprofits/api/v2/search.json?q=foundation&page=1',
  'ProPublica Foundation P3': 'https://projects.propublica.org/nonprofits/api/v2/search.json?q=foundation&page=2',
};

for (const [nodeName, newUrl] of Object.entries(urlReplacements)) {
  const idx = nameMap[nodeName];
  if (idx !== undefined) {
    workflow.nodes[idx].parameters.url = newUrl;
  }
}

// Update notes for repurposed nodes
if (nameMap['ProPublica Foundation P1'] !== undefined) {
  workflow.nodes[nameMap['ProPublica Foundation P1']].notes = 'Broad foundation search page 0';
}
if (nameMap['ProPublica Foundation P2'] !== undefined) {
  workflow.nodes[nameMap['ProPublica Foundation P2']].notes = 'Broad foundation search page 1';
}
if (nameMap['ProPublica Foundation P3'] !== undefined) {
  workflow.nodes[nameMap['ProPublica Foundation P3']].notes = 'Broad foundation search page 2';
}

// ============================================================
// STEP 4: Fix ProPublica Parser
// ============================================================
const ppExtractIdx = nameMap['Extract ProPublica Foundations5'];
if (ppExtractIdx !== undefined) {
  let code = workflow.nodes[ppExtractIdx].parameters.jsCode;
  // Use exact string from JSON (escaped newlines with 2-space indent)
  code = code.replace(
    'const response = item.json;\n  \n  if (response.error || response.statusCode >= 400) continue;',
    'let response = item.json;\n  \n  if (Array.isArray(response)) response = response[0];\n  if (!response || response.error || response.statusCode >= 400) continue;'
  );
  workflow.nodes[ppExtractIdx].parameters.jsCode = code;
}

// ============================================================
// STEP 5: Add 4 new ProPublica HTTP Request nodes
// ============================================================
const newNodes = [
  {
    parameters: { url: "https://projects.propublica.org/nonprofits/api/v2/search.json?q=trust&page=0", options: {} },
    id: "pp-broad-trust",
    name: "ProPublica Trust",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-7488, 0], // placeholder
    notesInFlow: true,
    continueOnFail: true,
    notes: "Broad charitable trust search"
  },
  {
    parameters: { url: "https://projects.propublica.org/nonprofits/api/v2/search.json?q=endowment&page=0", options: {} },
    id: "pp-broad-endowment",
    name: "ProPublica Endowment",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-7488, 0],
    notesInFlow: true,
    continueOnFail: true,
    notes: "Broad endowment search"
  },
  {
    parameters: { url: "https://projects.propublica.org/nonprofits/api/v2/search.json?q=philanthrop&page=0", options: {} },
    id: "pp-broad-philanthropy",
    name: "ProPublica Philanthropy",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-7488, 0],
    notesInFlow: true,
    continueOnFail: true,
    notes: "Broad philanthropy search"
  },
  {
    parameters: { url: "https://projects.propublica.org/nonprofits/api/v2/search.json?q=grant+fund&page=0", options: {} },
    id: "pp-broad-grantfund",
    name: "ProPublica Grant Fund",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [-7488, 0],
    notesInFlow: true,
    continueOnFail: true,
    notes: "Broad grant fund search"
  }
];

for (const node of newNodes) {
  workflow.nodes.push(node);
}

// Rebuild name map
nameMap = buildNameMap();

// ============================================================
// STEP 6: Remove nodes: "Extract IRS990 Foundations", "Extract Georgia Portal Grants6"
// ============================================================
const nodesToRemove = ['Extract IRS990 Foundations', 'Extract Georgia Portal Grants6'];

// Remove from connections (both as source and as target)
for (const removeName of nodesToRemove) {
  delete workflow.connections[removeName];
}

// Remove references to deleted nodes in connection targets
for (const key of Object.keys(workflow.connections)) {
  const outputs = workflow.connections[key].main || [];
  for (let oi = 0; oi < outputs.length; oi++) {
    if (!Array.isArray(outputs[oi])) continue;
    outputs[oi] = outputs[oi].filter(conn => !nodesToRemove.includes(conn.node));
  }
}

// Remove the actual node objects
workflow.nodes = workflow.nodes.filter(n => !nodesToRemove.includes(n.name));

// Rebuild name map
nameMap = buildNameMap();

// ============================================================
// STEP 7: Connection updates
// ============================================================

// ProPublica Foundation P3 (formerly IRS 990) should connect to Extract ProPublica Foundations5
// Remove old connection from "ProPublica Foundation P3" to anything else and set new one
workflow.connections['ProPublica Foundation P3'] = {
  main: [[{ node: 'Extract ProPublica Foundations5', type: 'main', index: 0 }]]
};

// New ProPublica nodes connect to Extract ProPublica Foundations5
for (const nodeName of ['ProPublica Trust', 'ProPublica Endowment', 'ProPublica Philanthropy', 'ProPublica Grant Fund']) {
  workflow.connections[nodeName] = {
    main: [[{ node: 'Extract ProPublica Foundations5', type: 'main', index: 0 }]]
  };
}

// ProPublica Foundation P1 and P2 should still connect to Extract ProPublica Foundations5
// (they were formerly Youth/Senior which already connected there, so should be fine,
//  but let's ensure they use correct renamed target)
workflow.connections['ProPublica Foundation P1'] = {
  main: [[{ node: 'Extract ProPublica Foundations5', type: 'main', index: 0 }]]
};
workflow.connections['ProPublica Foundation P2'] = {
  main: [[{ node: 'Extract ProPublica Foundations5', type: 'main', index: 0 }]]
};

// Add new nodes + ProPublica Foundation P3 to Status: Searching output connections
const statusSearchingConns = workflow.connections['Status: Searching'];
if (statusSearchingConns && statusSearchingConns.main && statusSearchingConns.main[0]) {
  const outputList = statusSearchingConns.main[0];

  // Remove old references to IRS 990 Foundation Search (now renamed ProPublica Foundation P3)
  // It may already be there under old name - check and add if not
  const existingNames = new Set(outputList.map(c => c.node));

  // Remove "Extract IRS990 Foundations" if somehow referenced
  const filteredList = outputList.filter(c => c.node !== 'Extract IRS990 Foundations');

  // Add new nodes if not already present
  const toAdd = ['ProPublica Trust', 'ProPublica Endowment', 'ProPublica Philanthropy', 'ProPublica Grant Fund'];
  for (const name of toAdd) {
    if (!existingNames.has(name)) {
      filteredList.push({ node: name, type: 'main', index: 0 });
    }
  }
  // Ensure ProPublica Foundation P3 is in the list (it was IRS 990 Foundation Search, which should already be renamed)
  if (!existingNames.has('ProPublica Foundation P3')) {
    filteredList.push({ node: 'ProPublica Foundation P3', type: 'main', index: 0 });
  }

  statusSearchingConns.main[0] = filteredList;
}

// Remove "Extract IRS990 Foundations" from Combine & Deduplicate connections
// (it's already removed from connections object, but let's make sure)

// ============================================================
// STEP 8: Position reorganization
// ============================================================
const FETCH_X = -7488;
const EXTRACT_X = -7168;
const SPACING = 192;

function setPos(nodeName, x, y) {
  const idx = nameMap[nodeName];
  if (idx !== undefined) {
    workflow.nodes[idx].position = [x, y];
  }
}

// Group: Aggregator (start y=3200)
let y = 3200;
setPos('Fetch Grantivia Grants5', FETCH_X, y);
setPos('Extract Grantivia Grants5', EXTRACT_X, y);

// Group: Grants.gov Federal (start y=3600)
y = 3600;
setPos('Grants.gov Foster Care2', FETCH_X, y);
y += SPACING;
setPos('Grants.gov Senior Services1', FETCH_X, y);
y += SPACING;
setPos('Grants.gov Minority/Equity1', FETCH_X, y);
y += SPACING;
setPos('Grants.gov Capacity Building1', FETCH_X, y);
y += SPACING;
setPos('Grants.gov Child Welfare1', FETCH_X, y);
setPos('Extract Grants.gov Results1', EXTRACT_X, 3900);

// Group: Other Federal (start y=4600)
y = 4600;
setPos('USA Spending', FETCH_X, y);
setPos('Extract USA Spending', EXTRACT_X, y);
y += SPACING;
setPos('NIH Reporter', FETCH_X, y);
setPos('Extract NIH Grants', EXTRACT_X, y);
y += SPACING;
setPos('SBIR STTR Solicitations', FETCH_X, y);
setPos('Extract SBIR Grants', EXTRACT_X, y);
y += SPACING;
setPos('SAM Gov Opportunities', FETCH_X, y);
setPos('Extract SAM Grants', EXTRACT_X, y);
y += SPACING;
setPos('NSF Award Search', FETCH_X, y);
setPos('Extract NSF Grants', EXTRACT_X, y);

// Group: ProPublica 990 Search (start y=5800)
y = 5800;
setPos('ProPublica PA Foundations1', FETCH_X, y);
y += SPACING;
setPos('ProPublica Foundation P1', FETCH_X, y);
y += SPACING;
setPos('ProPublica Foundation P2', FETCH_X, y);
y += SPACING;
setPos('ProPublica Foundation P3', FETCH_X, y);
y += SPACING;
setPos('ProPublica Trust', FETCH_X, y);
y += SPACING;
setPos('ProPublica Endowment', FETCH_X, y);
y += SPACING;
setPos('ProPublica Philanthropy', FETCH_X, y);
y += SPACING;
setPos('ProPublica Grant Fund', FETCH_X, y);
// Extract node for the group
y += SPACING;
setPos('Extract ProPublica Foundations5', EXTRACT_X, y);

// Group: ProPublica 990 Individual Orgs (start y=7200)
y = 7200;
setPos('ProPublica Gates Foundation1', FETCH_X, y);
y += SPACING;
setPos('ProPublica Ford Foundation1', FETCH_X, y);
y += SPACING;
setPos('ProPublica Rockefeller Foundation1', FETCH_X, y);
y += SPACING;
setPos('ProPublica Kellogg Foundation1', FETCH_X, y);
y += SPACING;
setPos('ProPublica RWJF1', FETCH_X, y);
y += SPACING;
setPos('ProPublica Bloomberg Philanthropies1', FETCH_X, y);
y += SPACING;
setPos('ProPublica Walton Family Foundation1', FETCH_X, y);
// Extract Major Foundations1 - center of group
setPos('Extract Major Foundations1', EXTRACT_X, 7584);

// Group: Foundation Websites (start y=8800)
y = 8800;
setPos('Gates Foundation Grants Page1', FETCH_X, y);
setPos('Extract Gates Info1', EXTRACT_X, y);
y += SPACING;
setPos('Ford Foundation Grants Page1', FETCH_X, y);
setPos('Extract Ford Info1', EXTRACT_X, y);
y += SPACING;
setPos('Yield Giving (MacKenzie Scott)1', FETCH_X, y);
setPos('Extract Yield Giving Info1', EXTRACT_X, y);
y += SPACING;
setPos('RWJF Active Funding', FETCH_X, y);
setPos('Extract RWJF Opportunities', EXTRACT_X, y);
y += SPACING;
setPos('Philanthropy News Digest RFPs5', FETCH_X, y);
setPos('Extract PND RFPs3', EXTRACT_X, y);
y += SPACING;
// Hardcoded Major Foundations is standalone code node
setPos('Hardcoded Major Foundations', EXTRACT_X, y);

// Group: State Grants (start y=10200)
y = 10200;
setPos('PA DCED Programs1', FETCH_X, y);
setPos('Extract PA DCED Programs1', EXTRACT_X, y);
y += SPACING;
setPos('Georgia Grants Management4', FETCH_X, y);
setPos('Extract Georgia Portal Grants5', EXTRACT_X, y);
y += SPACING;
setPos('California Grants Portal', FETCH_X, y);
setPos('Extract CA Grants', EXTRACT_X, y);
y += SPACING;
setPos('SAM.gov Scraper', FETCH_X, y);
setPos('Extract SAM Scraper', EXTRACT_X, y);

// Group: International (start y=11200)
y = 11200;
setPos('EU Funding Portal', FETCH_X, y);
setPos('Extract EU Grants', EXTRACT_X, y);
y += SPACING;
setPos('UKRI Gateway', FETCH_X, y);
setPos('Extract UKRI Grants', EXTRACT_X, y);
y += SPACING;
setPos('Australia GrantConnect RSS', FETCH_X, y);
setPos('Extract AU Grants', EXTRACT_X, y);
y += SPACING;
setPos('Canada Open Data Grants', FETCH_X, y);
setPos('Extract Canada Grants', EXTRACT_X, y);

// Standalone
setPos('Candid Foundation Maps PA1', -7488, 7000);

// Pipeline nodes - keep positions
setPos('Fetch Grants Webhook', -9952, 5008);
setPos('Webhook OK Response', -9504, 4832);
setPos('Status: Searching', -7936, 4928);
setPos('Combine & Deduplicate All Sources5', -6800, 6864);

// Center pipeline decision nodes around y=6500
setPos('Has Results?3', -6576, 6500);
setPos('Check Already Tracked3', -6368, 6500);
setPos('Has New Grants?3', -6128, 6500);
setPos('No Results Found3', -6368, 6700);
setPos('All Already Tracked3', -5504, 6700);
setPos('Code in JavaScript5', -5568, 6500);

// ============================================================
// STEP 9: Add sticky notes
// ============================================================
const stickyNotes = [
  { content: "## Aggregator", position: [-7600, 3100], id: "sticky-aggregator" },
  { content: "## Grants.gov (Federal)", position: [-7600, 3500], id: "sticky-grantsgov" },
  { content: "## Other Federal APIs", position: [-7600, 4500], id: "sticky-otherfed" },
  { content: "## ProPublica 990 Search", position: [-7600, 5700], id: "sticky-pp-search" },
  { content: "## ProPublica Individual Orgs", position: [-7600, 7100], id: "sticky-pp-orgs" },
  { content: "## Foundation Websites", position: [-7600, 8700], id: "sticky-foundation-web" },
  { content: "## State Grants", position: [-7600, 10100], id: "sticky-state" },
  { content: "## International", position: [-7600, 11100], id: "sticky-intl" },
];

// Remove old sticky note if any (the "4 additional sources" one)
workflow.nodes = workflow.nodes.filter(n => !(n.type === 'n8n-nodes-base.stickyNote' && n.parameters && n.parameters.content === '## 4 additional sources'));

for (const sticky of stickyNotes) {
  workflow.nodes.push({
    parameters: { content: sticky.content },
    type: "n8n-nodes-base.stickyNote",
    position: sticky.position,
    typeVersion: 1,
    id: sticky.id,
    name: "Sticky Note " + sticky.id,
  });
}

// ============================================================
// STEP 10: Write output
// ============================================================
const output = JSON.stringify(workflow, null, 2);
fs.writeFileSync(filePath, output, 'utf8');

// Validate it's parseable
try {
  JSON.parse(output);
  console.log('SUCCESS: Workflow reorganized and written to', filePath);
  console.log('Nodes:', workflow.nodes.length);
  console.log('Connection keys:', Object.keys(workflow.connections).length);
} catch (e) {
  console.error('ERROR: Output is not valid JSON!', e.message);
  process.exit(1);
}
