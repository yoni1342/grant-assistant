#!/usr/bin/env node
// Sync the paste-in node files (nodes/*.js) into each workflow JSON's
// jsCode parameter. Run this whenever any nodes/*.js changes so the
// importable workflows stay in lockstep with the canonical paste-ins.

import fs from 'node:fs/promises';

const TARGETS = [
  {
    workflow: './getmodedeals-newsletter.workflow.json',
    nodes: {
      'Normalize': './nodes/01-normalize.js',
      'Rank & Select Top 8': './nodes/02-rank-select.js',
      'Render Email': './nodes/03-render-email.js',
    },
  },
  {
    workflow: './build-gif.subworkflow.json',
    nodes: {
      'Build GIF': './nodes/sub-build-gif.js',
    },
  },
  {
    workflow: './serve-gif.webhook.workflow.json',
    nodes: {
      'Read GIF': './nodes/sub-serve-gif.js',
    },
  },
];

let totalChanged = 0;
for (const target of TARGETS) {
  const wf = JSON.parse(await fs.readFile(target.workflow, 'utf8'));
  let changed = 0;
  for (const node of wf.nodes) {
    const file = target.nodes[node.name];
    if (!file) continue;
    const code = await fs.readFile(file, 'utf8');
    if (node.parameters?.jsCode === code) {
      console.log(`[sync] ${target.workflow} · ${node.name}: unchanged`);
      continue;
    }
    node.parameters.jsCode = code;
    console.log(`[sync] ${target.workflow} · ${node.name}: updated from ${file}`);
    changed++;
  }
  if (changed > 0) {
    await fs.writeFile(target.workflow, JSON.stringify(wf, null, 2) + '\n', 'utf8');
    console.log(`[sync] wrote ${target.workflow} (${changed} node${changed === 1 ? '' : 's'} updated)`);
    totalChanged += changed;
  }
}

if (totalChanged === 0) console.log('[sync] no changes');
