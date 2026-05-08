#!/usr/bin/env node
// One-off: insert the "Build Feature GIF" Execute-Workflow node into the main
// workflow JSON between "Rank & Select Top 8" and "Render Email", and rewire
// the connections accordingly. Idempotent — safe to re-run.

import fs from 'node:fs/promises';

const WF_PATH = './getmodedeals-newsletter.workflow.json';
const wf = JSON.parse(await fs.readFile(WF_PATH, 'utf8'));

// Bail if the node already exists
if (wf.nodes.find((n) => n.id === 'node-build-gif')) {
  console.log('[patch] Build Feature GIF node already present — nothing to do');
  process.exit(0);
}

const renderNode = wf.nodes.find((n) => n.id === 'node-render');
if (!renderNode) throw new Error('node-render not found');

// Push Render Email right by 220px to make room for the new node
const [origRenderX, origRenderY] = renderNode.position;
renderNode.position = [origRenderX + 220, origRenderY];

// Also push downstream nodes (Send via SendGrid etc.) right by 220px
const sendNode = wf.nodes.find((n) => n.id === 'node-send');
if (sendNode) {
  sendNode.position = [sendNode.position[0] + 220, sendNode.position[1]];
}

const buildGifNode = {
  parameters: {
    source: 'database',
    workflowId: {
      __rl: true,
      value: '',
      mode: 'list',
      cachedResultName: 'GetModeDeals: Build Feature GIF',
    },
    mode: 'once',
    options: {},
  },
  id: 'node-build-gif',
  name: 'Build Feature GIF',
  type: 'n8n-nodes-base.executeWorkflow',
  typeVersion: 1.1,
  position: [origRenderX, origRenderY],
  notes: 'Set workflowId to the imported "GetModeDeals: Build Feature GIF" sub-workflow. After import, click the node, pick the workflow from the dropdown.',
};

wf.nodes.push(buildGifNode);

// Rewire: Rank & Select → Build Feature GIF → Render Email
// (was Rank & Select → Render Email)
const conns = wf.connections;
if (conns['Rank & Select Top 8']) {
  conns['Rank & Select Top 8'] = {
    main: [[{ node: 'Build Feature GIF', type: 'main', index: 0 }]],
  };
}
conns['Build Feature GIF'] = {
  main: [[{ node: 'Render Email', type: 'main', index: 0 }]],
};

await fs.writeFile(WF_PATH, JSON.stringify(wf, null, 2) + '\n', 'utf8');
console.log('[patch] inserted Build Feature GIF node, rewired connections');
console.log('[patch] AFTER importing both workflows in n8n: open the main workflow,');
console.log('        click the Build Feature GIF node, and select "GetModeDeals: Build Feature GIF" in the workflowId dropdown.');
