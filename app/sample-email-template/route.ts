import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const exec = promisify(execFile);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const cwd = path.join(process.cwd(), 'n8n-getmodedeals');
  try {
    await exec('node', ['local-pipeline.mjs'], { cwd, timeout: 30000 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      `<!doctype html><meta charset="utf-8"><pre style="font:13px monospace;padding:24px;color:#b00;white-space:pre-wrap;">Pipeline failed:\n\n${msg}</pre>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
  const html = await readFile(path.join(cwd, 'sample-newsletter.html'), 'utf8');
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
