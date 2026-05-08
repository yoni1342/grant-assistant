/* eslint-disable @typescript-eslint/no-require-imports */
// Paste this into the "Read GIF" Code node of the
// "GetModeDeals: Serve Feature GIF" webhook workflow.
// Mode: Run Once for All Items · Language: JavaScript
//
// What it does
// ------------
// 1. Pulls the cache id off the incoming Webhook item.
//    The webhook is configured with path `feature-gif/:id`, so n8n
//    surfaces the value as `$json.params.id`.
// 2. Validates the id against a strict hex regex (path-traversal guard).
// 3. Reads /tmp/gmd-gifs/<id>.gif from disk and stages it as a binary
//    item, which the downstream "Respond" node will return as the body
//    of the HTTP response.
//
// Host requirements
// -----------------
// - n8n env: NODE_FUNCTION_ALLOW_BUILTIN=fs
// - The build-gif sub-workflow shares the same /tmp filesystem (same
//   container/process), so the file written there is readable here.

const fs = require('fs');

const CACHE_DIR = '/tmp/gmd-gifs';

const first = $input.first().json;
const id = (first.params && first.params.id) || first.id || '';

if (!/^[a-f0-9]{8,16}$/.test(id)) {
  throw new Error(`Invalid GIF id: ${JSON.stringify(id)}`);
}

const filePath = `${CACHE_DIR}/${id}.gif`;
if (!fs.existsSync(filePath)) {
  throw new Error(`GIF not found: ${id}`);
}

const buf = fs.readFileSync(filePath);

return [{
  json: { id, sizeBytes: buf.length },
  binary: {
    data: {
      data: buf.toString('base64'),
      mimeType: 'image/gif',
      fileName: `feature-${id}.gif`,
    },
  },
}];
